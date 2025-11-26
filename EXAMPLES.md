# Exemplos Práticos de Execução

## Exemplo 1: Teste Completo de uma Lib

```bash
# 1. Smoke test (verificar que está funcionando)
node scripts/run-scenario.js smoke --target=coordix

# 2. Ramp-up (descobrir limites)
node scripts/run-scenario.js rampup --target=coordix

# 3. Load steady com 70% do limite encontrado (ex: 300 VUs)
STEADY_VUS=300 node scripts/run-scenario.js load-steady --target=coordix

# 4. Spike test
node scripts/run-scenario.js spike --target=coordix

# 5. Stress test (opcional)
node scripts/run-scenario.js stress --target=coordix

# 6. Comparar (se já rodou outras libs)
npm run compare
```

## Exemplo 2: Comparação Rápida (Smoke + Ramp-up)

```bash
# Rodar smoke em todas as libs
npm run smoke

# Rodar ramp-up em todas as libs
npm run rampup

# Comparar resultados
npm run compare --scenario=smoke
npm run compare --scenario=rampup
```

## Exemplo 3: Teste com Monitoramento do Host

**Terminal 1 - Monitoramento:**
```bash
# Encontrar PID do processo dotnet
ps aux | grep dotnet

# Iniciar monitoramento
./scripts/monitor-host.sh "dotnet" "results/host_metrics_rampup_coordix.csv"
```

**Terminal 2 - Executar Teste:**
```bash
# Executar ramp-up enquanto monitora
node scripts/run-scenario.js rampup --target=coordix
```

**Resultado:** Você terá métricas de CPU/memória/GC sincronizadas com os testes.

## Exemplo 4: Teste Customizado

```bash
# Load steady com carga específica
STEADY_VUS=500 DURATION=15m node scripts/run-scenario.js load-steady --target=mediatR

# Spike maior
SPIKE_VUS=1500 SPIKE_DURATION=90s node scripts/run-scenario.js spike --target=wolverine

# Stress até mais VUs
MAX_VUS=10000 node scripts/run-scenario.js stress --target=coordix
```

## Exemplo 5: API em Host Diferente

```bash
# Testar API remota
BASE_URL=http://staging.example.com:8080 npm run smoke

# Ou com autenticação (ajustar nos scripts se necessário)
BASE_URL=https://api.example.com npm run rampup
```

## Exemplo 6: Workflow Completo de Comparação

```bash
# 1. Preparar ambiente
# - API rodando
# - Monitoramento configurado (opcional)

# 2. Executar todos os cenários em todas as libs
npm run all

# Isso vai executar:
# - smoke → coordix, mediatR, wolverine
# - rampup → coordix, mediatR, wolverine
# - load-steady → coordix, mediatR, wolverine
# - spike → coordix, mediatR, wolverine
# - stress → coordix, mediatR, wolverine

# 3. Comparar resultados
npm run compare

# 4. Analisar resultados detalhados
# Abrir arquivos JSON em results/
# Ou usar Grafana k6 Cloud
```

## Exemplo 7: Análise Incremental

```bash
# Dia 1: Descobrir limites
npm run rampup
npm run compare --scenario=rampup

# Anotar: Coordix quebra em ~800 VUs, MediatR em ~600 VUs, Wolverine em ~1000 VUs

# Dia 2: Testar carga estável (70% do limite)
STEADY_VUS=560 node scripts/run-scenario.js load-steady --target=coordix  # 70% de 800
STEADY_VUS=420 node scripts/run-scenario.js load-steady --target=mediatR  # 70% de 600
STEADY_VUS=700 node scripts/run-scenario.js load-steady --target=wolverine # 70% de 1000

npm run compare --scenario=load-steady

# Dia 3: Testar elasticidade
npm run spike
npm run compare --scenario=spike
```

## Exemplo 8: Debugging

```bash
# Se smoke test falhar, verificar:
# 1. API está rodando?
curl http://localhost:5000/coordix/int

# 2. k6 está instalado?
k6 version

# 3. Executar com mais verbosidade
k6 run scenarios/smoke.js --env BASE_URL=http://localhost:5000 --env TARGET_PATH=/coordix/int --env TARGET_NAME=coordix

# 4. Verificar resultados
ls -la results/
cat results/smoke_coordix_*.json | head -20
```

## Exemplo 9: Integração com CI/CD

```yaml
# Exemplo .github/workflows/load-test.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Diariamente às 2h
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke tests
        run: |
          BASE_URL=${{ secrets.API_URL }} npm run smoke
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: results/
```

## Exemplo 10: Análise de Resultados JSON

```bash
# Ver estrutura de um resultado
cat results/rampup_coordix_*.json | jq '.' | head -50

# Extrair apenas p95
cat results/rampup_coordix_*.json | jq 'select(.type=="Metric" and .metric.name=="http_req_duration") | .metric.values.p95'

# Contar erros
cat results/stress_coordix_*.json | jq 'select(.type=="Metric" and .metric.name=="http_req_failed") | .metric.values.count'
```

## Dicas Finais

1. **Sempre comece com smoke test** - garante que tudo está funcionando
2. **Monitore recursos** - CPU/memória são tão importantes quanto latência
3. **Execute em ambiente isolado** - não teste em produção
4. **Documente condições** - mesma máquina, mesma hora, mesma configuração
5. **Compare apples to apples** - mesma carga, mesmo ambiente
6. **Anote observações** - use o template de resultados

