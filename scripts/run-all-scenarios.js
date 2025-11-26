#!/usr/bin/env node

/**
 * Script para executar TODOS os cenários contra TODAS as libs
 * 
 * Uso:
 *   node scripts/run-all-scenarios.js [--target=<target>]
 * 
 * Isso vai rodar:
 * - smoke → coordix, mediatR, wolverine
 * - rampup → coordix, mediatR, wolverine
 * - load-steady → coordix, mediatR, wolverine
 * - spike → coordix, mediatR, wolverine
 * - stress → coordix, mediatR, wolverine
 * 
 * ⚠️ ATENÇÃO: Isso pode levar várias horas!
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const path = require('path');

const SCENARIOS = ['smoke', 'rampup', 'load-steady', 'spike', 'stress'];
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const targetName = targetArg ? targetArg.split('=')[1] : 'all';

async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Executando cenário: ${scenario}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const scriptPath = path.join(__dirname, 'run-scenario.js');
    const { stdout, stderr } = await exec(
      `node "${scriptPath}" ${scenario} --target=${targetName}`,
      { stdio: 'inherit' }
    );
    return { scenario, success: true };
  } catch (error) {
    console.error(`❌ Erro ao executar ${scenario}:`, error.message);
    return { scenario, success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🚀 Iniciando execução completa de todos os cenários');
  console.log(`🎯 Target: ${targetName}`);
  console.log(`📊 Cenários: ${SCENARIOS.join(', ')}\n`);

  const startTime = Date.now();
  const results = [];

  for (const scenario of SCENARIOS) {
    const result = await runScenario(scenario);
    results.push(result);

    // Pequena pausa entre cenários para não sobrecarregar
    if (scenario !== SCENARIOS[SCENARIOS.length - 1]) {
      console.log('\n⏸️  Pausa de 10 segundos antes do próximo cenário...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RESUMO DA EXECUÇÃO');
  console.log(`${'='.repeat(60)}`);
  console.log(`⏱️  Tempo total: ${duration} minutos`);
  console.log(`\n✅ Sucessos: ${results.filter(r => r.success).length}`);
  console.log(`❌ Falhas: ${results.filter(r => !r.success).length}`);

  if (results.some(r => !r.success)) {
    console.log('\n❌ Cenários com falha:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.scenario}: ${r.error}`);
    });
  }

  console.log(`\n📁 Resultados salvos em: results/`);
  console.log(`\nPara comparar resultados, execute:`);
  console.log(`   npm run compare`);
}

main().catch(console.error);

