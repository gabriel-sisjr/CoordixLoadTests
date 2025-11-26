import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Spike Test - Pancada súbita
 * 
 * Objetivo: medir elasticidade da lib para bursts
 * 
 * Configuração:
 * - Começa em 0 → abre 500-1000 VUs instantaneamente por 30-60 segundos → volta a 0
 * 
 * Métricas:
 * - quanto explode p95/p99
 * - quantos erros acontecem no pico
 * - tempo pra "estabilizar" quando o spike acaba
 * 
 * Isso mostra como o pipeline do mediator lida com criação de tasks, 
 * alocação, contended locks/cache
 */

const SPIKE_VUS = parseInt(__ENV.SPIKE_VUS || '800');
const SPIKE_DURATION = __ENV.SPIKE_DURATION || '60s';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: SPIKE_VUS },      // spike instantâneo
        { duration: SPIKE_DURATION, target: SPIKE_VUS }, // manter spike
        { duration: '10s', target: 0 },             // voltar a 0
      ],
      gracefulRampDown: '10s',
      tags: { target: __ENV.TARGET_NAME || 'coordix' },
    },
  },
  thresholds: getThresholds('spike'),
};

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `spike_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    timeout: '10s',
    params: {
      insecureSkipTLSVerify: true, // Para HTTPS localhost com certificado auto-assinado
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}

