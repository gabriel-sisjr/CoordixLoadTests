#!/usr/bin/env node

/**
 * Script seguro para rodar testes durante a noite
 * 
 * Garante que:
 * - Dados são salvos incrementalmente
 * - Mesmo se o processo morrer, dados parciais são preservados
 * - Logs detalhados para debug
 * - Backup automático de resultados
 * 
 * Uso:
 *   node scripts/run-overnight.js [--target=<target>] [--duration=<duration>] [--vus=<vus>]
 * 
 * Exemplos:
 *   node scripts/run-overnight.js
 *   node scripts/run-overnight.js --target=coordix --duration=8h --vus=2000
 */

// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGETS = {
  coordix: { name: 'Coordix', path: '/tests/Coordix' },
  mediatR: { name: 'MediatR', path: '/tests/MediatR' },
  wolverine: { name: 'Wolverine', path: '/Tests/Wolverine' },
};

const scenarioName = 'overnight';
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const targetName = targetArg ? targetArg.split('=')[1] : 'all';

const durationArg = process.argv.find(arg => arg.startsWith('--duration='));
const duration = durationArg ? durationArg.split('=')[1] : '6h';

const vusArg = process.argv.find(arg => arg.startsWith('--vus='));
const vus = vusArg ? parseInt(vusArg.split('=')[1]) : 1000;

const BASE_URL = process.env.BASE_URL || 'https://localhost:7234';
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Criar diretórios se não existirem
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function runK6(targetKey, target) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(
      RESULTS_DIR,
      `${scenarioName}_${targetKey}_${timestamp}.json`
    );
    const logFile = path.join(LOG_DIR, `${scenarioName}_${targetKey}_${timestamp}.log`);

    // Create log file
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    const log = (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      process.stdout.write(logMessage);
      logStream.write(logMessage);
    };

    log(`\n${'='.repeat(80)}`);
    log(`🌙 OVERNIGHT TEST - ${target.name}`);
    log(`${'='.repeat(80)}`);
    log(`Início: ${new Date().toLocaleString()}`);
    log(`Duração: ${duration}`);
    log(`VUs: ${vus}`);
    log(`URL: ${BASE_URL}${target.path}`);
    log(`Output: ${outputFile}`);
    log(`Log: ${logFile}`);
    log(`\n💾 Dados serão salvos incrementalmente durante todo o teste!`);
    log(`⚠️  Mesmo se o processo for interrompido, dados parciais serão preservados.\n`);

    // Create empty output file immediately
    try {
      fs.writeFileSync(outputFile, '', 'utf-8');
      log(`✅ Arquivo de saída criado: ${outputFile}`);
    } catch (err) {
      log(`❌ Erro ao criar arquivo: ${err.message}`);
      reject(err);
      return;
    }

    const scenarioFile = path.join(__dirname, '..', 'scenarios', `${scenarioName}.js`);

    const isWindows = process.platform === 'win32';
    const k6Process = spawn('k6', [
      'run',
      scenarioFile,
      '--out', `json=${outputFile}`,
      '--env', `BASE_URL=${BASE_URL}`,
      '--env', `TARGET_PATH=${target.path}`,
      '--env', `TARGET_NAME=${targetKey}`,
      '--env', `DURATION=${duration}`,
      '--env', `STEADY_VUS=${vus}`,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
    });

    // Pipe k6 output to both console and log file
    k6Process.stdout.on('data', (data) => {
      const message = data.toString();
      process.stdout.write(message);
      logStream.write(message);
    });

    k6Process.stderr.on('data', (data) => {
      const message = data.toString();
      process.stderr.write(message);
      logStream.write(`[STDERR] ${message}`);
    });

    let lastFileSize = 0;
    let checkCount = 0;

    // Monitor file growth every minute
    const monitorInterval = setInterval(() => {
      try {
        const stats = fs.statSync(outputFile);
        const currentSize = stats.size;
        const sizeDiff = currentSize - lastFileSize;
        lastFileSize = currentSize;

        checkCount++;
        const elapsedMinutes = checkCount;
        const sizeMB = (currentSize / 1024 / 1024).toFixed(2);
        
        log(`\n📊 Status após ${elapsedMinutes} minutos:`);
        log(`   Tamanho do arquivo: ${sizeMB} MB`);
        if (sizeDiff > 0) {
          log(`   Crescimento: +${(sizeDiff / 1024).toFixed(2)} KB`);
          log(`   ✅ Dados estão sendo salvos corretamente!`);
        } else {
          log(`   ⚠️  Nenhum crescimento detectado (pode ser normal se teste acabou)`);
        }
      } catch (e) {
        log(`⚠️  Erro ao verificar arquivo: ${e.message}`);
      }
    }, 60000); // Every minute

    k6Process.on('close', (code) => {
      clearInterval(monitorInterval);
      
      const endTime = new Date().toLocaleString();
      log(`\n${'='.repeat(80)}`);
      log(`Teste finalizado: ${endTime}`);
      log(`Código de saída: ${code}`);

      try {
        const stats = fs.statSync(outputFile);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`Tamanho final do arquivo: ${sizeMB} MB`);
        
        if (stats.size > 0) {
          log(`✅ Dados salvos com sucesso em: ${outputFile}`);
          log(`✅ Log completo salvo em: ${logFile}`);
          resolve({ target: targetKey, outputFile, logFile, success: code === 0 });
        } else {
          log(`❌ Arquivo vazio - nenhum dado foi salvo!`);
          reject(new Error('No data saved'));
        }
      } catch (e) {
        log(`❌ Erro ao verificar arquivo final: ${e.message}`);
        reject(e);
      }

      logStream.end();
    });

    k6Process.on('error', (err) => {
      clearInterval(monitorInterval);
      log(`❌ Erro ao executar k6: ${err.message}`);
      
      try {
        const stats = fs.statSync(outputFile);
        if (stats.size > 0) {
          log(`⚠️  Mas dados parciais foram salvos: ${outputFile}`);
          logStream.end();
          resolve({ target: targetKey, outputFile, logFile, partial: true });
        } else {
          logStream.end();
          reject(err);
        }
      } catch (e) {
        logStream.end();
        reject(err);
      }
    });

    // Handle graceful shutdown
    const shutdown = (signal) => {
      log(`\n⚠️  ${signal} recebido. Finalizando teste graciosamente...`);
      clearInterval(monitorInterval);
      k6Process.kill(signal);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

async function main() {
  const targetsToRun = targetName === 'all'
    ? Object.entries(TARGETS)
    : [[targetName, TARGETS[targetName]]].filter(([key]) => TARGETS[key]);

  if (targetsToRun.length === 0) {
    console.error(`❌ Target inválido: ${targetName}`);
    console.error(`Targets disponíveis: all, ${Object.keys(TARGETS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🌙 OVERNIGHT TEST - CONFIGURAÇÃO`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Cenário: ${scenarioName}`);
  console.log(`Targets: ${targetsToRun.map(([key]) => key).join(', ')}`);
  console.log(`Duração: ${duration}`);
  console.log(`VUs: ${vus}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`\n💡 Este teste foi projetado para rodar durante a noite.`);
  console.log(`💾 Todos os dados são salvos incrementalmente - mesmo se interrompido!`);
  console.log(`📁 Resultados: ${RESULTS_DIR}`);
  console.log(`📝 Logs: ${LOG_DIR}`);
  console.log(`${'='.repeat(80)}\n`);

  const results = [];

  for (const [targetKey, target] of targetsToRun) {
    try {
      const result = await runK6(targetKey, target);
      results.push(result);
      
      // Small pause between targets
      if (targetsToRun.length > 1) {
        console.log('\n⏸️  Pausa de 30 segundos antes do próximo target...\n');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } catch (error) {
      console.error(`❌ Erro ao executar ${targetKey}:`, error.message);
      results.push({ target: targetKey, error: error.message });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RESUMO FINAL`);
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Testes completos: ${results.filter(r => r.success).length}`);
  console.log(`⚠️  Testes parciais: ${results.filter(r => r.partial).length}`);
  console.log(`❌ Testes com erro: ${results.filter(r => r.error).length}`);
  console.log(`\n📁 Resultados salvos em: ${RESULTS_DIR}`);
  console.log(`📝 Logs salvos em: ${LOG_DIR}`);
  console.log(`\nPara comparar resultados, execute:`);
  console.log(`   npm run compare --scenario=overnight`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

