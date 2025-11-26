/**
 * Configuração de métricas e thresholds para k6
 * 
 * Cada cenário pode ter seus próprios thresholds
 */

export const METRIC_THRESHOLDS = {
  smoke: {
    'http_req_failed': ['rate<0.001'], // < 0.1% errors
    'http_req_duration': ['p(95)<50'], // p95 < 50ms
  },
  rampup: {
    'http_req_failed': ['rate<0.01'], // < 1% errors durante ramp
  },
  'load-steady': {
    'http_req_failed': ['rate<0.001'], // < 0.1% errors
    'http_req_duration': ['p(95)<200'], // ajustar conforme necessário
  },
  spike: {
    'http_req_failed': ['rate<0.05'], // < 5% errors durante spike (aceitável)
  },
  stress: {
    // Stress test não tem thresholds rígidos - estamos testando até quebrar
    'http_req_failed': ['rate<1.0'], // apenas para não abortar o teste
  },
  overnight: {
    // Thresholds mais relaxados para testes longos
    'http_req_failed': ['rate<0.01'], // < 1% errors (mais tolerante para teste longo)
    'http_req_duration': ['p(95)<1000'], // p95 < 1s (threshold relaxado)
  },
};

/**
 * Função helper para criar thresholds customizados
 */
export function getThresholds(scenarioName) {
  return METRIC_THRESHOLDS[scenarioName] || {};
}

