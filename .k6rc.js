/**
 * Configuração global do k6 (opcional)
 * Este arquivo pode ser usado para definir configurações padrão
 */

export const options = {
  // Configurações padrão que podem ser sobrescritas pelos cenários
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)', 'p(99.99)'],
  
  // Tags padrão
  tags: {
    project: 'coordix-load-tests',
    environment: __ENV.ENVIRONMENT || 'local',
  },
};

