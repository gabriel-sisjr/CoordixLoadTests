/**
 * Configuração dos targets (libs) a serem testadas
 */
export const TARGETS = {
  coordix: {
    name: 'Coordix',
    path: '/tests/Coordix',
  },
  mediatR: {
    name: 'MediatR',
    path: '/tests/MediatR',
  },
  wolverine: {
    name: 'Wolverine',
    path: '/Tests/Wolverine',
  },
};

/**
 * Base URL da API (pode ser sobrescrita via env BASE_URL)
 */
export const BASE_URL = __ENV.BASE_URL || 'https://localhost:7234';

