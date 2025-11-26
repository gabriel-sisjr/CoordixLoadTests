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

// Maximum expected duration per scenario (in milliseconds)
// Includes buffer for 3 targets + overhead
const SCENARIO_TIMEOUTS = {
  smoke: 5 * 60 * 1000,        // 5 minutes (45s × 3 + buffer)
  rampup: 30 * 60 * 1000,       // 30 minutes (8min × 3 + buffer)
  'load-steady': 35 * 60 * 1000, // 35 minutes (10min × 3 + buffer)
  spike: 10 * 60 * 1000,        // 10 minutes (75s × 3 + buffer)
  stress: 35 * 60 * 1000,       // 35 minutes (9min × 3 + buffer)
};

async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Executando cenário: ${scenario}`);
  console.log(`${'='.repeat(60)}\n`);

  const timeout = SCENARIO_TIMEOUTS[scenario] || 60 * 60 * 1000; // Default: 1 hour
  const startTime = Date.now();

  try {
    const scriptPath = path.join(__dirname, 'run-scenario.js');
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: Scenario ${scenario} exceeded ${timeout / 1000 / 60} minutes`));
      }, timeout);
    });

    // Race between execution and timeout
    await Promise.race([
      exec(
        `node "${scriptPath}" ${scenario} --target=${targetName}`,
        { stdio: 'inherit' }
      ),
      timeoutPromise
    ]);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✅ Cenário ${scenario} concluído em ${duration} minutos`);
    
    return { scenario, success: true };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.error(`❌ Erro ao executar ${scenario} (após ${duration} minutos):`, error.message);
    return { scenario, success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🚀 Iniciando execução completa de todos os cenários');
  console.log(`🎯 Target: ${targetName}`);
  console.log(`📊 Cenários: ${SCENARIOS.join(', ')}`);
  
  // Calculate estimated total time
  const estimatedMinutes = SCENARIOS.reduce((sum, s) => {
    const timeoutMinutes = (SCENARIO_TIMEOUTS[s] || 60 * 60 * 1000) / 1000 / 60;
    return sum + timeoutMinutes;
  }, 0);
  const estimatedHours = (estimatedMinutes / 60).toFixed(1);
  
  console.log(`⏱️  Tempo estimado: ~${estimatedHours} horas (máximo)`);
  console.log(`💡 Todos os testes terminam automaticamente - você pode deixar rodando!\n`);

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

