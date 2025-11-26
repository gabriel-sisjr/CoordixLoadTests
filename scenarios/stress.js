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

const MAX_VUS = parseInt(__ENV.MAX_VUS || '5000');

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '1m', target: 500 },   // 0-1min: 50 → 500 VUs
        { duration: '2m', target: 1500 },  // 1-3min: 500 → 1500 VUs
        { duration: '2m', target: 3000 },  // 3-5min: 1500 → 3000 VUs
        { duration: '2m', target: MAX_VUS }, // 5-7min: 3000 → MAX_VUS
        { duration: '2m', target: MAX_VUS }, // 7-9min: manter MAX_VUS
      ],
      gracefulRampDown: '30s',
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

