import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Smoke Test - Sanidade
 * 
 * Objetivo: garantir que o endpoint responde e o script k6 está correto
 * 
 * Configuração:
 * - 10-20 RPS
 * - 30-60 segundos
 * 
 * Métricas esperadas:
 * - 0% error rate
 * - p95 < 50ms
 */

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

// Configurable via environment variables
const RATE = parseInt(__ENV.RATE || '15'); // RPS
const DURATION = __ENV.DURATION || '45s';
const PRE_ALLOCATED_VUS = parseInt(__ENV.PRE_ALLOCATED_VUS || '5');
const MAX_VUS = parseInt(__ENV.MAX_VUS || '20');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS,
      tags: { target: TARGET_NAME },
    },
  },
  thresholds: getThresholds('smoke'),
};

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `smoke_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    params: {
      insecureSkipTLSVerify: true, // Para HTTPS localhost com certificado auto-assinado
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.1); // pequeno delay entre requests
}

