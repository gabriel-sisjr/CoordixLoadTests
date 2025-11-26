import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Load Steady Test - Estado estável
 * 
 * Objetivo: ver como a lib se comporta sob carga constante
 * 
 * Configuração:
 * - Escolhe uma carga abaixo do limite de saturação (ex: 70% do ponto de quebra)
 * - Ex: 300 VUs fixos por 10 minutos
 * 
 * Métricas:
 * - estabilidade de latência (p95 não pode oscilar loucamente)
 * - estabilidade de RPS
 * - error rate ~ 0
 */

const STEADY_VUS = parseInt(__ENV.STEADY_VUS || '300');
const DURATION = __ENV.DURATION || '10m';

export const options = {
  scenarios: {
    load_steady: {
      executor: 'constant-vus',
      vus: STEADY_VUS,
      duration: DURATION,
      tags: { target: __ENV.TARGET_NAME || 'coordix' },
    },
  },
  thresholds: getThresholds('load-steady'),
};

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `load_steady_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    timeout: '10s',
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

