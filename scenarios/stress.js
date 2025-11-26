import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TARGETS } from '../config/targets.js';
import { getThresholds } from '../config/metrics.js';

/**
 * Stress Test - Até quebrar
 * 
 * Objetivo: descobrir "ponto de ruptura" do sistema (pra cada lib, comparável)
 * 
 * Configuração:
 * - Ramp de VUs além da capacidade (tipo até 5k VUs ou o máximo que der)
 * - Mantém níveis muito altos por curtos períodos
 * 
 * Aqui você está propositalmente forçando 5xx/timeouts, então:
 * - registra p95/p99
 * - registra throughput
 * - vê qual lib "dobra o joelho" antes
 */

// Configurable via environment variables
const START_VUS = parseInt(__ENV.START_VUS || '50');
const STAGE1_TARGET = parseInt(__ENV.STAGE1_TARGET || '500');
const STAGE2_TARGET = parseInt(__ENV.STAGE2_TARGET || '1500');
const STAGE3_TARGET = parseInt(__ENV.STAGE3_TARGET || '3000');
const MAX_VUS = parseInt(__ENV.MAX_VUS || '5000');
const STAGE1_DURATION = __ENV.STAGE1_DURATION || '1m';
const STAGE2_DURATION = __ENV.STAGE2_DURATION || '2m';
const STAGE3_DURATION = __ENV.STAGE3_DURATION || '2m';
const STAGE4_DURATION = __ENV.STAGE4_DURATION || '2m';
const STAGE5_DURATION = __ENV.STAGE5_DURATION || '2m';
const GRACEFUL_RAMP_DOWN = __ENV.GRACEFUL_RAMP_DOWN || '30s';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: START_VUS,
      stages: [
        { duration: STAGE1_DURATION, target: STAGE1_TARGET },
        { duration: STAGE2_DURATION, target: STAGE2_TARGET },
        { duration: STAGE3_DURATION, target: STAGE3_TARGET },
        { duration: STAGE4_DURATION, target: MAX_VUS },
        { duration: STAGE5_DURATION, target: MAX_VUS }, // Maintain peak
      ],
      gracefulRampDown: GRACEFUL_RAMP_DOWN,
      tags: { target: __ENV.TARGET_NAME || 'coordix' },
    },
  },
  thresholds: getThresholds('stress'),
};

const TARGET_PATH = __ENV.TARGET_PATH || '/tests/Coordix';
const TARGET_NAME = __ENV.TARGET_NAME || 'coordix';

export default function () {
  const url = `${BASE_URL}${TARGET_PATH}`;
  
  const response = http.get(url, {
    tags: {
      name: `stress_${TARGET_NAME}`,
      target: TARGET_NAME,
    },
    timeout: '15s', // timeout maior para stress test
    params: {
      insecureSkipTLSVerify: true, // Para HTTPS localhost com certificado auto-assinado
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'status is not 5xx': (r) => r.status < 500,
  });

  sleep(0.1);
}

