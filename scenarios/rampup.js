import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Ramp-up Test - Descobrir faixa de conforto
 * 
 * Objetivo: ver até onde dá pra ir antes de começar a degradar
 * 
 * Configuração:
 * - Começar em 10 VUs → subir gradualmente pra 1000 VUs
 * - Tempo: 5-10 minutos
 * 
 * Métricas a observar:
 * - rps por lib
 * - http_req_duration (p50, p95, p99)
 * - error_rate
 * 
 * Quando começa a aparecer:
 * - aumento brutal em p95/p99
 * - HTTP 5xx
 * - timeout (se configurado)
 */

export const options = {
  scenarios: {
    rampup: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 100 },   // 0-1min: 10 → 100 VUs
        { duration: '2m', target: 300 },  // 1-3min: 100 → 300 VUs
        { duration: '2m', target: 600 },  // 3-5min: 300 → 600 VUs
        { duration: '2m', target: 1000 }, // 5-7min: 600 → 1000 VUs
        { duration: '1m', target: 1000 }, // 7-8min: manter 1000 VUs
      ],
      gracefulRampDown: '30s',
      tags: { target: __ENV.TARGET_NAME || 'coordix' },
    },
  },
  thresholds: getThresholds('rampup'),
};

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `rampup_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    timeout: '10s', // timeout de 10s
    params: {
      insecureSkipTLSVerify: true, // Para HTTPS localhost com certificado auto-assinado
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}

