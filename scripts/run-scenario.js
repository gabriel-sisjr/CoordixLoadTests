#!/usr/bin/env node

/**
 * Script para executar um cenário específico contra todas as libs
 * 
 * Uso:
 *   node scripts/run-scenario.js <scenario-name> [--target=<target>]
 * 
 * Exemplos:
 *   node scripts/run-scenario.js smoke
 *   node scripts/run-scenario.js rampup --target=coordix
 *   node scripts/run-scenario.js load-steady --target=all
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGETS = {
  coordix: { name: 'Coordix', path: '/tests/Coordix' },
  mediatR: { name: 'MediatR', path: '/tests/MediatR' },
  wolverine: { name: 'Wolverine', path: '/Tests/Wolverine' },
};

const SCENARIOS = ['smoke', 'rampup', 'load-steady', 'spike', 'stress', 'overnight'];

const scenarioName = process.argv[2];
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const targetName = targetArg ? targetArg.split('=')[1] : 'all';

const BASE_URL = process.env.BASE_URL || 'https://localhost:7234';
const RESULTS_DIR = path.join(__dirname, '..', 'results');

// Criar diretório de resultados se não existir
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Track active k6 processes for proper cleanup
const activeProcesses = new Set();
let signalHandlersRegistered = false;

// Register signal handlers once globally
function registerSignalHandlers() {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  const handleSignal = (signal) => {
    console.log(`\n⚠️  ${signal} recebido. Finalizando ${activeProcesses.size} processo(s)...`);
    
    // Kill all active k6 processes
    activeProcesses.forEach((proc) => {
      if (proc && !proc.killed) {
        try {
          proc.kill(signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
        } catch (e) {
          // Process may already be dead
        }
      }
    });
    
    // Force exit after a short delay
    setTimeout(() => {
      console.log('⚠️  Forçando saída...');
      process.exit(130); // Standard exit code for SIGINT
    }, 2000);
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));
}

if (!scenarioName || !SCENARIOS.includes(scenarioName)) {
  console.error(`❌ Cenário inválido: ${scenarioName}`);
  console.error(`Cenários disponíveis: ${SCENARIOS.join(', ')}`);
  process.exit(1);
}

function runK6(targetKey, target) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(
      RESULTS_DIR,
      `${scenarioName}_${targetKey}_${timestamp}.json`
    );

    // Ensure directory exists before creating file
    try {
      if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
      }
      
      // Create empty file immediately to ensure it exists even if process dies
      fs.writeFileSync(outputFile, '', 'utf-8');
      console.log(`\n💾 Arquivo de saída criado: ${outputFile}`);
    } catch (err) {
      console.error(`❌ Erro crítico: Não foi possível criar arquivo de saída: ${err.message}`);
      console.error(`   Caminho: ${outputFile}`);
      reject(new Error(`Failed to create output file: ${err.message}`));
      return;
    }

    console.log(`\n🚀 Executando ${scenarioName} contra ${target.name}...`);
    console.log(`   URL: ${BASE_URL}${target.path}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`   ⚠️  Dados serão salvos incrementalmente - mesmo se o teste for interrompido!`);

    const scenarioFile = path.join(__dirname, '..', 'scenarios', `${scenarioName}.js`);

    // Cross-platform: usar shell no Windows, direto no Unix
    const isWindows = process.platform === 'win32';
    
    // Build environment variables array - pass all relevant env vars to k6
    const envArgs = [
      '--env', `BASE_URL=${BASE_URL}`,
      '--env', `TARGET_PATH=${target.path}`,
      '--env', `TARGET_NAME=${targetKey}`,
    ];
    
    // Pass through any VU-related environment variables that might be set
    const vuEnvVars = ['STEADY_VUS', 'DURATION', 'SPIKE_VUS', 'SPIKE_DURATION', 'MAX_VUS', 
                        'START_VUS', 'STAGE1_TARGET', 'STAGE2_TARGET', 'STAGE3_TARGET', 
                        'STAGE4_TARGET', 'STAGE1_DURATION', 'STAGE2_DURATION', 'STAGE3_DURATION',
                        'STAGE4_DURATION', 'STAGE5_DURATION', 'GRACEFUL_RAMP_DOWN',
                        'RATE', 'PRE_ALLOCATED_VUS'];
    
    vuEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        envArgs.push('--env', `${envVar}=${process.env[envVar]}`);
      }
    });
    
    // Register signal handlers before spawning processes
    registerSignalHandlers();

    const k6Process = spawn('k6', [
      'run',
      scenarioFile,
      '--out', `json=${outputFile}`,
      ...envArgs,
    ], {
      stdio: 'inherit',
      shell: isWindows, // Necessário no Windows para encontrar k6 no PATH
      env: process.env, // Pass through all environment variables
    });

    // Track this process
    activeProcesses.add(k6Process);

    let hasData = false;
    let checkAttempts = 0;
    const MAX_CHECK_ATTEMPTS = 60; // Stop checking after 5 minutes if no file

    // Monitor file to check if data is being written
    const checkInterval = setInterval(() => {
      checkAttempts++;
      try {
        if (fs.existsSync(outputFile)) {
          const stats = fs.statSync(outputFile);
          if (stats.size > 0) {
            hasData = true;
          }
        } else if (checkAttempts > MAX_CHECK_ATTEMPTS) {
          // Stop checking if file doesn't exist after many attempts
          clearInterval(checkInterval);
        }
      } catch (e) {
        // File might not exist yet or other error - ignore
        if (checkAttempts > MAX_CHECK_ATTEMPTS) {
          clearInterval(checkInterval);
        }
      }
    }, 5000); // Check every 5 seconds

    k6Process.on('close', (code) => {
      activeProcesses.delete(k6Process);
      clearInterval(checkInterval);
      
      // Check if we have data even if exit code is not 0
      try {
        const stats = fs.statSync(outputFile);
        if (stats.size > 0) {
          console.log(`\n💾 Dados salvos: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        }
      } catch (e) {
        // File might not exist
      }

      if (code === 0) {
        console.log(`✅ ${target.name} concluído com sucesso`);
        resolve({ target: targetKey, outputFile });
      } else {
        if (hasData) {
          console.log(`⚠️  ${target.name} terminou com código ${code}, mas dados foram salvos!`);
          console.log(`   Arquivo: ${outputFile}`);
          // Resolve instead of reject - we have data!
          resolve({ target: targetKey, outputFile, partial: true });
        } else {
          console.error(`❌ ${target.name} falhou com código ${code} e nenhum dado foi salvo`);
          reject(new Error(`k6 failed with code ${code}`));
        }
      }
    });

    k6Process.on('error', (err) => {
      activeProcesses.delete(k6Process);
      clearInterval(checkInterval);
      console.error(`❌ Erro ao executar k6: ${err.message}`);
      
      // Check if we have partial data
      try {
        const stats = fs.statSync(outputFile);
        if (stats.size > 0) {
          console.log(`⚠️  Mas dados parciais foram salvos: ${outputFile}`);
          resolve({ target: targetKey, outputFile, partial: true });
        } else {
          reject(err);
        }
      } catch (e) {
        reject(err);
      }
    });
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

  console.log(`\n📊 Executando cenário: ${scenarioName}`);
  console.log(`🎯 Targets: ${targetsToRun.map(([key]) => key).join(', ')}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const results = [];

  for (const [targetKey, target] of targetsToRun) {
    try {
      const result = await runK6(targetKey, target);
      results.push(result);
    } catch (error) {
      console.error(`Erro ao executar ${targetKey}:`, error.message);
    }
  }

  console.log(`\n✅ Todos os testes concluídos!`);
  console.log(`📁 Resultados salvos em: ${RESULTS_DIR}`);
  console.log(`\nPara comparar resultados, execute:`);
  console.log(`   npm run compare`);
}

main().catch(console.error);

