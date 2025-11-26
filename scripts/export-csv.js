#!/usr/bin/env node

/**
 * Script para exportar resultados para CSV (formato leve e fácil de abrir)
 * 
 * Uso:
 *   node scripts/export-csv.js [--scenario=<scenario>]
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

    const latestFile = targetFiles.sort().reverse()[0];
    const filePath = path.join(RESULTS_DIR, latestFile);
    
    try {
      const metrics = await parseK6Results(filePath);
      const extracted = extractMetrics(metrics);

      if (extracted) {
        results[target] = extracted;
      }
    } catch (error) {
      console.error(`⚠️  Erro ao processar ${latestFile}: ${error.message}`);
    }
  }

  return results;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportToCsv(scenario, results, outputFile) {
  const lines = [];
  
  // Cabeçalho
  lines.push('Target,p50_ms,p95_ms,p99_ms,Total_Requests,RPS,Errors,Error_Rate_Percent');
  
  // Dados
  for (const target of TARGETS) {
    const data = results[target];
    if (!data) {
      lines.push(`${target},,,,,,,`);
      continue;
    }
    
    lines.push([
      escapeCsv(target),
      escapeCsv(data.p50?.toFixed(2) || '0'),
      escapeCsv(data.p95?.toFixed(2) || '0'),
      escapeCsv(data.p99?.toFixed(2) || '0'),
      escapeCsv(data.totalRequests || '0'),
      escapeCsv(data.rps?.toFixed(2) || '0'),
      escapeCsv(data.errors || '0'),
      escapeCsv((data.errorRate * 100)?.toFixed(2) || '0'),
    ].join(','));
  }
  
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  console.log(`   ✅ Exportado: ${outputFile}`);
}

async function main() {
  const scenarioArg = process.argv.find(arg => arg.startsWith('--scenario='));
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'all';

  console.log('\n📊 Exportando resultados para CSV...');
  console.log('💾 Usando processamento por streaming (eficiente em memória)\n');

  if (!fs.existsSync(RESULTS_DIR)) {
    console.error(`❌ Diretório de resultados não encontrado: ${RESULTS_DIR}`);
    console.error('   Execute os testes primeiro com: npm run <scenario>');
    process.exit(1);
  }

  const scenariosToExport = scenarioName === 'all' 
    ? SCENARIOS 
    : [scenarioName].filter(s => SCENARIOS.includes(s));

  if (scenariosToExport.length === 0) {
    console.error(`❌ Cenário inválido: ${scenarioName}`);
    console.error(`Cenários disponíveis: all, ${SCENARIOS.join(', ')}`);
    process.exit(1);
  }

  for (const scenario of scenariosToExport) {
    process.stdout.write(`📊 Processando ${scenario}... `);
    const results = await findLatestResults(scenario);
    
    if (Object.keys(results).length === 0) {
      process.stdout.write('⚠️  Sem resultados\n');
      continue;
    }
    
    process.stdout.write('✅\n');
    
    const outputFile = path.join(RESULTS_DIR, `${scenario}_summary.csv`);
    await exportToCsv(scenario, results, outputFile);
  }

  console.log(`\n✅ Exportação concluída!`);
  console.log(`📁 Arquivos CSV salvos em: ${RESULTS_DIR}`);
  console.log(`\n💡 Dica: Abra os arquivos CSV no Excel, Google Sheets ou qualquer editor de texto\n`);
}

main().catch(error => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});

