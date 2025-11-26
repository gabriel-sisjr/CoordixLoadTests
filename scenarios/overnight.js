import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Overnight Test - Teste longo para rodar durante a noite
 * 
 * Objetivo: Teste de estabilidade de longa duração (6-8 horas)
 * 
 * Configuração:
 * - Carga constante moderada por várias horas
 * - Ideal para detectar memory leaks, degradação gradual, etc.
 * 
 * Métricas:
 * - Estabilidade de latência ao longo do tempo
 * - Estabilidade de RPS
 * - Error rate ao longo do tempo
 * - Detecção de memory leaks (via análise manual de CPU/RAM)
 * 
 * Duração padrão: 6 horas (configurável via DURATION)
 */

const STEADY_VUS = parseInt(__ENV.STEADY_VUS || '1000');
const DURATION = __ENV.DURATION || '6h';

export const options = {
  scenarios: {
    overnight: {
      executor: 'constant-vus',
      vus: STEADY_VUS,
      duration: DURATION,
      tags: { target: __ENV.TARGET_NAME || 'coordix' },
    },
  },
  thresholds: getThresholds('load-steady'),
  // Disable summary to reduce memory usage in long tests
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)', 'count'],
};

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `overnight_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    timeout: '30s', // Timeout maior para testes longos
    params: {
      insecureSkipTLSVerify: true,
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000, // Threshold mais relaxado para teste longo
  });

  sleep(0.1);
}

