#!/usr/bin/env node

/**
 * Script para comparar resultados dos testes de carga
 * 
 * Analisa os arquivos JSON gerados pelo k6 e cria uma tabela comparativa
 * 
 * Uso:
 *   node scripts/compare-results.js [--scenario=<scenario>]
 */

const fs = require('fs');
const path = require('path');
const { parseK6Results } = require('./parse-k6-efficient');

const RESULTS_DIR = path.join(__dirname, '..', 'results');
const TARGETS = ['coordix', 'mediatR', 'wolverine'];
const SCENARIOS = ['smoke', 'rampup', 'load-steady', 'spike', 'stress'];

function extractMetrics(metrics) {
  if (!metrics) return null;

  const httpReqDuration = metrics['http_req_duration'];
  const httpReqs = metrics['http_reqs'];
  const httpReqFailed = metrics['http_req_failed'];

  const totalRequests = httpReqs?.values?.count || 0;
  const errors = httpReqFailed?.values?.count || 0;
  const errorRate = totalRequests > 0 ? (errors / totalRequests) : 0;

  return {
    p50: httpReqDuration?.values?.p50 || 0,
    p95: httpReqDuration?.values?.p95 || 0,
    p99: httpReqDuration?.values?.p99 || 0,
    totalRequests: totalRequests,
    rps: httpReqs?.values?.rate || 0,
    errorRate: errorRate,
    errors: errors,
  };
}

async function findLatestResults(scenario) {
  const files = fs.readdirSync(RESULTS_DIR)
    .filter(file => file.startsWith(`${scenario}_`) && file.endsWith('.json'));

  const results = {};

  for (const target of TARGETS) {
    const targetFiles = files.filter(file => file.includes(`_${target}_`));
    if (targetFiles.length === 0) continue;

    // Pegar o mais recente
    const latestFile = targetFiles.sort().reverse()[0];
    const filePath = path.join(RESULTS_DIR, latestFile);
    
    try {
      const metrics = await parseK6Results(filePath);
      const extracted = extractMetrics(metrics);

      if (extracted) {
        results[target] = {
          ...extracted,
          file: latestFile,
        };
      }
    } catch (error) {
      console.error(`⚠️  Erro ao processar ${latestFile}: ${error.message}`);
    }
  }

  return results;
}

function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return 'N/A';
  return typeof num === 'number' ? num.toFixed(decimals) : num;
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printComparisonTable(scenario, results) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 COMPARAÇÃO: ${scenario.toUpperCase()}`);
  console.log(`${'='.repeat(80)}\n`);

  if (Object.keys(results).length === 0) {
    console.log('❌ Nenhum resultado encontrado para este cenário\n');
    return;
  }

  // Cabeçalho
  console.log('┌─────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Target      │ p50      │ p95      │ p99      │ RPS      │ Errors   │ Error %  │');
  console.log('├─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');

  // Dados
  for (const target of TARGETS) {
    const data = results[target];
    if (!data) {
      console.log(`│ ${target.padEnd(11)} │ N/A      │ N/A      │ N/A      │ N/A      │ N/A      │ N/A      │`);
      continue;
    }

    const p50 = formatDuration(data.p50);
    const p95 = formatDuration(data.p95);
    const p99 = formatDuration(data.p99);
    const rps = formatNumber(data.rps, 1);
    const errors = formatNumber(data.errors, 0);
    const errorRate = formatNumber(data.errorRate * 100, 2);

    console.log(`│ ${target.padEnd(11)} │ ${p50.padStart(8)} │ ${p95.padStart(8)} │ ${p99.padStart(8)} │ ${rps.padStart(8)} │ ${errors.padStart(8)} │ ${errorRate.padStart(7)}% │`);
  }

  console.log('└─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');

  // Análise rápida
  console.log('\n📈 Análise:');
  
  const validResults = Object.entries(results).filter(([_, data]) => data);
  
  if (validResults.length > 1) {
    // Melhor p95
    const bestP95 = validResults.reduce((best, [target, data]) => {
      return !best || data.p95 < best.p95 ? { target, ...data } : best;
    }, null);
    
    if (bestP95) {
      console.log(`   🏆 Melhor p95: ${bestP95.target} (${formatDuration(bestP95.p95)})`);
    }

    // Melhor RPS
    const bestRPS = validResults.reduce((best, [target, data]) => {
      return !best || data.rps > best.rps ? { target, ...data } : best;
    }, null);
    
    if (bestRPS) {
      console.log(`   🚀 Maior RPS: ${bestRPS.target} (${formatNumber(bestRPS.rps, 1)} req/s)`);
    }

    // Menor error rate
    const bestErrorRate = validResults.reduce((best, [target, data]) => {
      return !best || data.errorRate < best.errorRate ? { target, ...data } : best;
    }, null);
    
    if (bestErrorRate && bestErrorRate.errorRate > 0) {
      console.log(`   ✅ Menor error rate: ${bestErrorRate.target} (${formatNumber(bestErrorRate.errorRate * 100, 2)}%)`);
    }
  }

  console.log('');
}

async function main() {
  const scenarioArg = process.argv.find(arg => arg.startsWith('--scenario='));
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'all';

  console.log('\n🔍 Analisando resultados dos testes de carga...');
  console.log('💾 Usando processamento por streaming (eficiente em memória)\n');

  if (!fs.existsSync(RESULTS_DIR)) {
    console.error(`❌ Diretório de resultados não encontrado: ${RESULTS_DIR}`);
    console.error('   Execute os testes primeiro com: npm run <scenario>');
    process.exit(1);
  }

  const scenariosToCompare = scenarioName === 'all' 
    ? SCENARIOS 
    : [scenarioName].filter(s => SCENARIOS.includes(s));

  if (scenariosToCompare.length === 0) {
    console.error(`❌ Cenário inválido: ${scenarioName}`);
    console.error(`Cenários disponíveis: all, ${SCENARIOS.join(', ')}`);
    process.exit(1);
  }

  for (const scenario of scenariosToCompare) {
    process.stdout.write(`📊 Processando ${scenario}... `);
    const results = await findLatestResults(scenario);
    process.stdout.write('✅\n');
    printComparisonTable(scenario, results);
  }

  console.log(`\n💡 Dica: Para análise mais detalhada, use: npm run export-csv`);
  console.log(`   Ou use ferramentas como Grafana k6 Cloud para visualização avançada\n`);
}

main().catch(error => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});

