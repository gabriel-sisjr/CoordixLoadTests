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

// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

const SCENARIOS = ['smoke', 'rampup', 'load-steady', 'spike', 'stress'];
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const targetName = targetArg ? targetArg.split('=')[1] : 'all';

// Track active child processes for proper cleanup
const activeChildProcesses = new Set();
let signalHandlersRegistered = false;

// Register signal handlers once globally
function registerSignalHandlers() {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  const handleSignal = (signal) => {
    console.log(`\n⚠️  ${signal} recebido. Finalizando ${activeChildProcesses.size} processo(s) filho(s)...`);
    
    // Kill all active child processes
    activeChildProcesses.forEach((proc) => {
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

// Parse environment variable overrides
const vusArg = process.argv.find(arg => arg.startsWith('--vus='));
const durationArg = process.argv.find(arg => arg.startsWith('--duration='));
const spikeVusArg = process.argv.find(arg => arg.startsWith('--spike-vus='));
const maxVusArg = process.argv.find(arg => arg.startsWith('--max-vus='));
const steadyVusArg = process.argv.find(arg => arg.startsWith('--steady-vus='));

// Build environment variables to pass to scenarios
const envVars = {};
if (vusArg) {
  const vus = vusArg.split('=')[1];
  // Apply VUs to relevant scenarios
  envVars.MAX_VUS = vus; // For smoke (maxVUs) and stress (MAX_VUS)
  envVars.PRE_ALLOCATED_VUS = Math.max(1, Math.floor(vus / 3)); // For smoke
  envVars.STEADY_VUS = vus; // For load-steady
  envVars.SPIKE_VUS = vus; // For spike
  // For rampup, calculate stages based on VUs
  const rampupMax = vus;
  envVars.STAGE4_TARGET = rampupMax; // Final stage of rampup
  envVars.STAGE3_TARGET = Math.floor(rampupMax * 0.6);
  envVars.STAGE2_TARGET = Math.floor(rampupMax * 0.3);
  envVars.STAGE1_TARGET = Math.floor(rampupMax * 0.1);
}
if (durationArg) {
  envVars.DURATION = durationArg.split('=')[1];
}
if (spikeVusArg) {
  envVars.SPIKE_VUS = spikeVusArg.split('=')[1];
}
if (maxVusArg) {
  envVars.MAX_VUS = maxVusArg.split('=')[1];
}
if (steadyVusArg) {
  envVars.STEADY_VUS = steadyVusArg.split('=')[1];
}

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

    // Add environment variables to the command
    const env = { ...process.env };
    Object.keys(envVars).forEach(key => {
      env[key] = envVars[key];
    });

    // Register signal handlers before spawning processes
    registerSignalHandlers();

    // Use spawn instead of exec to avoid maxBuffer limitations
    // Race between execution and timeout
    await Promise.race([
      new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const child = spawn('node', [scriptPath, scenario, `--target=${targetName}`], {
          stdio: 'inherit',
          env: env,
          shell: isWindows
        });

        // Track this process
        activeChildProcesses.add(child);

        child.on('close', (code) => {
          activeChildProcesses.delete(child);
          // Don't reject on non-zero exit if it was interrupted
          if (code === 0 || code === 130 || code === null) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          activeChildProcesses.delete(child);
          reject(err);
        });
      }),
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
  
  // Show configuration if any overrides were provided
  if (Object.keys(envVars).length > 0) {
    console.log(`\n⚙️  Configurações customizadas:`);
    Object.keys(envVars).forEach(key => {
      console.log(`   ${key}=${envVars[key]}`);
    });
    console.log('');
  }
  
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

