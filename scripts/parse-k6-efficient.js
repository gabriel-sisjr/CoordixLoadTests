/**
 * Parser otimizado para arquivos k6 JSON grandes
 * Calcula estatísticas agregadas a partir dos Points individuais
 */

const fs = require('fs');
const readline = require('readline');

/**
 * Calcula percentis de um array ordenado
 */
function percentile(sortedArray, p) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

/**
 * Parse k6 results - calcula estatísticas agregadas dos Points
 */
function parseK6Results(filePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // Coletar dados dos Points
    const durations = [];
    const reqs = [];
    const failed = [];
    let firstTime = null;
    let lastTime = null;
    let lineCount = 0;
    const MAX_LINES = 5000000; // Limite alto mas seguro

    rl.on('line', (line) => {
      lineCount++;
      if (lineCount > MAX_LINES) {
        rl.close();
        return;
      }

      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const obj = JSON.parse(trimmed);
        
        // Processar apenas Points
        if (obj.type === 'Point' && obj.data) {
          const metric = obj.metric;
          const value = obj.data.value;
          const time = obj.data.time;

          if (!firstTime) firstTime = time;
          lastTime = time;

          if (metric === 'http_req_duration') {
            durations.push(value);
          } else if (metric === 'http_reqs') {
            reqs.push(value);
          } else if (metric === 'http_req_failed') {
            if (value > 0) failed.push(value);
          }
        }
      } catch (e) {
        // Ignora linhas inválidas
      }
    });

    rl.on('close', () => {
      // Calcular estatísticas agregadas
      const totalRequests = reqs.reduce((sum, v) => sum + v, 0);
      const totalFailed = failed.reduce((sum, v) => sum + v, 0);
      
      // Calcular duração do teste em segundos
      let durationSeconds = 45; // default
      if (firstTime && lastTime) {
        const start = new Date(firstTime).getTime();
        const end = new Date(lastTime).getTime();
        durationSeconds = Math.max(1, (end - start) / 1000);
      }

      // Ordenar durações para calcular percentis
      durations.sort((a, b) => a - b);

      const metrics = {
        http_req_duration: {
          values: {
            p50: durations.length > 0 ? percentile(durations, 50) : 0,
            p95: durations.length > 0 ? percentile(durations, 95) : 0,
            p99: durations.length > 0 ? percentile(durations, 99) : 0,
            count: durations.length,
            avg: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
            min: durations.length > 0 ? durations[0] : 0,
            max: durations.length > 0 ? durations[durations.length - 1] : 0,
          }
        },
        http_reqs: {
          values: {
            count: totalRequests,
            rate: durationSeconds > 0 ? totalRequests / durationSeconds : 0,
          }
        },
        http_req_failed: {
          values: {
            count: totalFailed,
            rate: totalRequests > 0 ? totalFailed / totalRequests : 0,
          }
        }
      };

      resolve(metrics);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = { parseK6Results };
