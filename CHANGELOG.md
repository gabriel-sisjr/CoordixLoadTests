# Changelog

## Configuração Atualizada

### URLs e Endpoints

**Base URL:** `https://localhost:7234` (anteriormente `http://localhost:5000`)

**Endpoints:**
- Coordix: `/tests/Coordix` (anteriormente `/coordix/int`)
- MediatR: `/tests/MediatR` (anteriormente `/mediatR/int`)
- Wolverine: `/Tests/Wolverine` (anteriormente `/wolverine/int`)

### SSL/TLS

Todos os cenários foram configurados para aceitar certificados SSL auto-assinados (necessário para HTTPS localhost).

### Arquivos Atualizados

- `config/targets.js` - URLs e paths atualizados
- `scripts/run-scenario.js` - BASE_URL e paths atualizados
- Todos os cenários (`scenarios/*.js`) - paths padrão e SSL configurado

## Teste Rápido

Para verificar se está tudo funcionando:

```bash
# Teste rápido contra Coordix
node scripts/run-scenario.js smoke --target=coordix
```

