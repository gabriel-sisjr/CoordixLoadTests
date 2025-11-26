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

const SCENARIOS = ['smoke', 'rampup', 'load-steady', 'spike', 'stress'];

const scenarioName = process.argv[2];
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const targetName = targetArg ? targetArg.split('=')[1] : 'all';

const BASE_URL = process.env.BASE_URL || 'https://localhost:7234';
const RESULTS_DIR = path.join(__dirname, '..', 'results');

// Criar diretório de resultados se não existir
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
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

    console.log(`\n🚀 Executando ${scenarioName} contra ${target.name}...`);
    console.log(`   URL: ${BASE_URL}${target.path}`);
    console.log(`   Output: ${outputFile}`);

    const scenarioFile = path.join(__dirname, '..', 'scenarios', `${scenarioName}.js`);

    // Cross-platform: usar shell no Windows, direto no Unix
    const isWindows = process.platform === 'win32';
    const k6Process = spawn('k6', [
      'run',
      scenarioFile,
      '--out', `json=${outputFile}`,
      '--env', `BASE_URL=${BASE_URL}`,
      '--env', `TARGET_PATH=${target.path}`,
      '--env', `TARGET_NAME=${targetKey}`,
    ], {
      stdio: 'inherit',
      shell: isWindows, // Necessário no Windows para encontrar k6 no PATH
    });

    k6Process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${target.name} concluído`);
        resolve({ target: targetKey, outputFile });
      } else {
        console.error(`❌ ${target.name} falhou com código ${code}`);
        reject(new Error(`k6 failed with code ${code}`));
      }
    });

    k6Process.on('error', (err) => {
      console.error(`❌ Erro ao executar k6: ${err.message}`);
      reject(err);
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

