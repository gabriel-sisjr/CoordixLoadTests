#!/usr/bin/env node

/**
 * Servidor web para visualização de resultados de testes de carga
 *
 * Fornece uma interface web com gráficos para análise dos resultados
 *
 * Uso:
 *   node server.js
 *   ou
 *   npm run web
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const { parseK6Results } = require("./scripts/parse-k6-efficient");

const app = express();
const PORT = process.env.PORT || 3000;
const RESULTS_DIR = path.join(__dirname, "results");
const TARGETS = ["coordix", "mediatR", "wolverine"];
const SCENARIOS = [
  "smoke",
  "rampup",
  "load-steady",
  "spike",
  "stress",
  "overnight",
];

// Cache de resultados processados (evita reprocessar os mesmos arquivos)
const resultsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtém métricas de um arquivo com cache
 */
async function getCachedMetrics(filePath, fileName) {
  const cacheKey = `${fileName}_${fs.statSync(filePath).mtimeMs}`;
  const cached = resultsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.metrics;
  }

  // Processar arquivo
  const metrics = await parseK6Results(filePath);

  // Armazenar no cache
  resultsCache.set(cacheKey, {
    metrics,
    timestamp: Date.now(),
  });

  // Limpar cache antigo (manter apenas últimos 50)
  if (resultsCache.size > 50) {
    const entries = Array.from(resultsCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    resultsCache.clear();
    entries.slice(0, 50).forEach(([key, value]) => {
      resultsCache.set(key, value);
    });
  }

  return metrics;
}

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// Middleware para parsing JSON
app.use(express.json());

/**
 * Extrai métricas dos resultados do k6
 */
function extractMetrics(metrics) {
  if (!metrics) return null;

  const httpReqDuration = metrics["http_req_duration"];
  const httpReqs = metrics["http_reqs"];
  const httpReqFailed = metrics["http_req_failed"];

  const totalRequests = httpReqs?.values?.count || 0;
  const errors = httpReqFailed?.values?.count || 0;
  const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

  return {
    // Percentiles
    p50: httpReqDuration?.values?.p50 || 0,
    p75: httpReqDuration?.values?.p75 || 0,
    p90: httpReqDuration?.values?.p90 || 0,
    p95: httpReqDuration?.values?.p95 || 0,
    p99: httpReqDuration?.values?.p99 || 0,
    p99_9: httpReqDuration?.values?.p99_9 || 0,
    // Basic statistics
    min: httpReqDuration?.values?.min || 0,
    max: httpReqDuration?.values?.max || 0,
    avg: httpReqDuration?.values?.avg || 0,
    med: httpReqDuration?.values?.med || 0,
    // Request metrics
    totalRequests: totalRequests,
    rps: httpReqs?.values?.rate || 0,
    errorRate: errorRate,
    errors: errors,
  };
}

/**
 * Encontra os resultados mais recentes para um cenário
 */
async function findLatestResults(scenario) {
  if (!fs.existsSync(RESULTS_DIR)) {
    return {};
  }

  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter(
      (file) => file.startsWith(`${scenario}_`) && file.endsWith(".json")
    );

  const results = {};

  for (const target of TARGETS) {
    const targetFiles = files.filter((file) => file.includes(`_${target}_`));
    if (targetFiles.length === 0) continue;

    // Get the latest one
    const latestFile = targetFiles.sort().reverse()[0];
    const filePath = path.join(RESULTS_DIR, latestFile);

    try {
      const metrics = await getCachedMetrics(filePath, latestFile);
      const extracted = extractMetrics(metrics);

      if (extracted) {
        results[target] = {
          ...extracted,
          file: latestFile,
          timestamp:
            latestFile.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] ||
            null,
        };
      }
    } catch (error) {
      console.error(`⚠️  Error processing ${latestFile}: ${error.message}`);
    }
  }

  return results;
}

/**
 * API: Lista todos os cenários disponíveis
 */
app.get("/api/scenarios", (req, res) => {
  res.json({
    scenarios: SCENARIOS,
    targets: TARGETS,
  });
});

/**
 * API: Obtém resultados de um cenário específico (com streaming)
 */
app.get("/api/results/:scenario", async (req, res) => {
  const scenario = req.params.scenario;

  if (!SCENARIOS.includes(scenario)) {
    return res.status(400).json({ error: `Invalid scenario: ${scenario}` });
  }

  // Configurar headers para streaming
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      res.write(
        JSON.stringify({
          scenario,
          results: {},
          timestamp: new Date().toISOString(),
        })
      );
      return res.end();
    }

    const files = fs
      .readdirSync(RESULTS_DIR)
      .filter(
        (file) => file.startsWith(`${scenario}_`) && file.endsWith(".json")
      );

    const results = {};
    const totalTargets = TARGETS.filter((target) => {
      const targetFiles = files.filter((file) => file.includes(`_${target}_`));
      return targetFiles.length > 0;
    }).length;

    // Processar targets em paralelo
    const processPromises = TARGETS.map(async (target) => {
      const targetFiles = files.filter((file) => file.includes(`_${target}_`));
      if (targetFiles.length === 0) return null;

      const latestFile = targetFiles.sort().reverse()[0];
      const filePath = path.join(RESULTS_DIR, latestFile);

      try {
        const metrics = await getCachedMetrics(filePath, latestFile);
        const extracted = extractMetrics(metrics);

        if (extracted) {
          const resultData = {
            ...extracted,
            file: latestFile,
            timestamp:
              latestFile.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] ||
              null,
          };

          // Adicionar resultado de forma thread-safe
          results[target] = resultData;

          // Contar quantos já foram processados
          const processedCount = Object.keys(results).length;

          // Enviar atualização incremental via stream
          const partialResponse = {
            scenario,
            results: { ...results },
            progress: {
              processed: processedCount,
              total: totalTargets,
              completed: processedCount === totalTargets,
            },
            timestamp: new Date().toISOString(),
          };

          // Enviar chunk incremental (NDJSON format)
          res.write(JSON.stringify(partialResponse) + "\n");

          return target;
        }
      } catch (error) {
        console.error(`⚠️  Error processing ${latestFile}: ${error.message}`);
      }
      return null;
    });

    await Promise.all(processPromises);

    // Enviar resposta final (sem newline para indicar fim)
    // Garantir que sempre enviamos uma resposta, mesmo se não houver resultados
    const finalResponse = {
      scenario,
      results: results,
      timestamp: new Date().toISOString(),
    };

    // Se não houver resultados, ainda assim enviar resposta vazia
    if (Object.keys(results).length === 0) {
      res.write(JSON.stringify(finalResponse));
      res.end();
      return;
    }

    res.write(JSON.stringify(finalResponse));
    res.end();
  } catch (error) {
    console.error("Error fetching results:", error);
    try {
      res.write(
        JSON.stringify({
          scenario: req.params.scenario,
          error: error.message,
          results: {},
          timestamp: new Date().toISOString(),
        })
      );
    } catch (writeError) {
      console.error("Error writing error response:", writeError);
    }
    res.end();
  }
});

/**
 * API: Obtém resultados de todos os cenários (com streaming otimizado)
 */
app.get("/api/results", async (req, res) => {
  // Configurar headers para streaming
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      res.write(
        JSON.stringify({ results: {}, timestamp: new Date().toISOString() })
      );
      return res.end();
    }

    // Ler diretório UMA ÚNICA VEZ (otimização importante)
    const allFiles = fs
      .readdirSync(RESULTS_DIR)
      .filter((file) => file.endsWith(".json"));

    const allResults = {};

    // Criar lista de todas as tarefas de processamento
    const allProcessingTasks = [];

    // Primeiro, construir todas as tarefas
    for (const scenario of SCENARIOS) {
      const scenarioFiles = allFiles.filter((file) =>
        file.startsWith(`${scenario}_`)
      );

      if (scenarioFiles.length === 0) continue;

      for (const target of TARGETS) {
        const targetFiles = scenarioFiles.filter((file) =>
          file.includes(`_${target}_`)
        );

        if (targetFiles.length === 0) continue;

        const latestFile = targetFiles.sort().reverse()[0];
        const filePath = path.join(RESULTS_DIR, latestFile);

        // Criar tarefa de processamento
        allProcessingTasks.push({
          scenario,
          target,
          filePath,
          latestFile,
        });
      }
    }

    const totalTasks = allProcessingTasks.length;

    // Processar todas as tarefas em paralelo
    const processPromises = allProcessingTasks.map(
      async ({ scenario, target, filePath, latestFile }) => {
        try {
          const metrics = await getCachedMetrics(filePath, latestFile);
          const extracted = extractMetrics(metrics);

          if (extracted) {
            const resultData = {
              ...extracted,
              file: latestFile,
              timestamp:
                latestFile.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0] ||
                null,
            };

            // Adicionar resultado de forma thread-safe
            if (!allResults[scenario]) {
              allResults[scenario] = {};
            }
            allResults[scenario][target] = resultData;

            // Contar quantos já foram processados (thread-safe)
            const processedCount = Object.values(allResults).reduce(
              (sum, scenarioResults) =>
                sum + Object.keys(scenarioResults).length,
              0
            );

            // Enviar atualização incremental assim que cada target é processado
            const partialResponse = {
              results: JSON.parse(JSON.stringify(allResults)), // Deep copy
              progress: {
                processed: processedCount,
                total: totalTasks,
                completed: processedCount === totalTasks,
              },
              timestamp: new Date().toISOString(),
            };

            res.write(JSON.stringify(partialResponse) + "\n");
          }
        } catch (error) {
          console.error(`⚠️  Error processing ${latestFile}: ${error.message}`);
        }
      }
    );

    await Promise.all(processPromises);

    // Enviar resposta final (sem newline para indicar fim)
    const finalResponse = {
      results: allResults,
      timestamp: new Date().toISOString(),
    };

    // Garantir que sempre enviamos uma resposta, mesmo se não houver resultados
    if (Object.keys(allResults).length === 0) {
      console.log("⚠️  Nenhum resultado encontrado para enviar");
      res.write(JSON.stringify(finalResponse));
      res.end();
      return;
    }

    console.log(
      `✅ Enviando resposta final com ${
        Object.keys(allResults).length
      } cenários`
    );
    res.write(JSON.stringify(finalResponse));
    res.end();
  } catch (error) {
    console.error("Error fetching all results:", error);
    res.write(JSON.stringify({ error: error.message }));
    res.end();
  }
});

/**
 * Rota principal - serve a página HTML
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log("\n🌐 Servidor web iniciado!");
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`\n💡 Pressione Ctrl+C para parar o servidor\n`);
});
