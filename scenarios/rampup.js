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

// Configurable via environment variables
const START_VUS = parseInt(__ENV.START_VUS || '10');
const STAGE1_TARGET = parseInt(__ENV.STAGE1_TARGET || '100');
const STAGE2_TARGET = parseInt(__ENV.STAGE2_TARGET || '300');
const STAGE3_TARGET = parseInt(__ENV.STAGE3_TARGET || '600');
const STAGE4_TARGET = parseInt(__ENV.STAGE4_TARGET || '1000');
const STAGE1_DURATION = __ENV.STAGE1_DURATION || '1m';
const STAGE2_DURATION = __ENV.STAGE2_DURATION || '2m';
const STAGE3_DURATION = __ENV.STAGE3_DURATION || '2m';
const STAGE4_DURATION = __ENV.STAGE4_DURATION || '2m';
const STAGE5_DURATION = __ENV.STAGE5_DURATION || '1m';
const GRACEFUL_RAMP_DOWN = __ENV.GRACEFUL_RAMP_DOWN || '30s';

export const options = {
  scenarios: {
    rampup: {
      executor: 'ramping-vus',
      startVUs: START_VUS,
      stages: [
        { duration: STAGE1_DURATION, target: STAGE1_TARGET },
        { duration: STAGE2_DURATION, target: STAGE2_TARGET },
        { duration: STAGE3_DURATION, target: STAGE3_TARGET },
        { duration: STAGE4_DURATION, target: STAGE4_TARGET },
        { duration: STAGE5_DURATION, target: STAGE4_TARGET }, // Maintain peak
      ],
      gracefulRampDown: GRACEFUL_RAMP_DOWN,
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

