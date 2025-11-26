# Coordix Load Tests - Testes de Carga Profissionais

Testes de carga estruturados usando k6 para comparar performance entre **Coordix**, **MediatR** e **Wolverine**.

## 🎯 Objetivo

Não é só "bater com 1k VUs e ver no que dá". Este projeto implementa **cenários de teste estruturados** com **métricas específicas** para comparação científica entre as três bibliotecas.

## 📋 Cenários de Teste

### 1. Smoke Test (Sanidade)
**Objetivo:** Garantir que o endpoint responde e o script k6 está correto.

- **Configuração:** 10-20 RPS por 30-60 segundos
- **Métricas esperadas:**
  - 0% error rate
  - p95 < 50ms

### 2. Ramp-up (Descobrir faixa de conforto)
**Objetivo:** Ver até onde dá pra ir antes de começar a degradar.

- **Configuração:** 10 VUs → 1000 VUs gradualmente (5-10 minutos)
- **Métricas a observar:**
  - RPS por lib
  - `http_req_duration` (p50, p95, p99)
  - Error rate
- **Quando começa a aparecer:**
  - Aumento brutal em p95/p99
  - HTTP 5xx
  - Timeouts

### 3. Load Steady (Estado estável)
**Objetivo:** Ver como a lib se comporta sob carga constante.

- **Configuração:** 300 VUs fixos por 10 minutos (70% do ponto de quebra)
- **Métricas:**
  - Estabilidade de latência (p95 não oscila loucamente)
  - Estabilidade de RPS
  - Error rate ~ 0

### 4. Spike Test (Pancada súbita)
**Objetivo:** Medir elasticidade da lib para bursts.

- **Configuração:** 0 → 500-1000 VUs instantaneamente por 30-60s → 0
- **Métricas:**
  - Quanto explode p95/p99
  - Quantos erros acontecem no pico
  - Tempo pra "estabilizar" quando o spike acaba

### 5. Stress Test (Até quebrar)
**Objetivo:** Descobrir "ponto de ruptura" do sistema.

- **Configuração:** Ramp até 5k VUs (ou máximo possível)
- **Métricas:**
  - p95/p99 sob stress
  - Throughput máximo
  - Qual lib "dobra o joelho" antes

## 📊 Métricas Coletadas

### No k6:
- **`http_req_duration`**
  - p50 (mediana): latência típica
  - p95: aceitável
  - p99: dor
- **`http_reqs`**: total requests/segundo → throughput efetivo
- **`http_req_failed`**: error rate (qualquer coisa > 0.1% já é preocupante)
- **`vus`, `vus_max`**: para confirmar que a carga foi a mesma entre libs

### No host da API (coletar manualmente):
- CPU (%)
- Memória (MB)
- GC (se possível via dotnet-counters):
  - Gen 0/1/2 collections
  - Allocated bytes/segundo

## 🚀 Como Usar

> **💡 Usando Windows?** Veja o [guia específico para Windows](WINDOWS.md)

### Pré-requisitos

1. Instalar k6:
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. Ter a API rodando em `http://localhost:5000` (ou configurar `BASE_URL`)

### Executar Testes

#### Executar um cenário específico contra todas as libs:
```bash
npm run smoke          # Smoke test
npm run rampup         # Ramp-up test
npm run load-steady    # Load steady test
npm run spike          # Spike test
npm run stress         # Stress test
```

#### Executar um cenário contra uma lib específica:
```bash
node scripts/run-scenario.js smoke --target=coordix
node scripts/run-scenario.js rampup --target=mediatR
node scripts/run-scenario.js stress --target=wolverine
```

#### Executar TODOS os cenários (pode levar horas):
```bash
npm run all
```

#### Comparar resultados:
```bash
npm run compare                    # Compara todos os cenários
npm run compare --scenario=rampup  # Compara apenas ramp-up
```

### Configuração

#### Variáveis de Ambiente:

- **`BASE_URL`**: URL base da API (padrão: `http://localhost:5000`)
  ```bash
  BASE_URL=http://localhost:5000 npm run smoke
  ```

- **`STEADY_VUS`**: Número de VUs para load-steady (padrão: 300)
  ```bash
  STEADY_VUS=500 npm run load-steady
  ```

- **`SPIKE_VUS`**: Número de VUs para spike test (padrão: 800)
  ```bash
  SPIKE_VUS=1000 npm run spike
  ```

- **`MAX_VUS`**: Máximo de VUs para stress test (padrão: 5000)
  ```bash
  MAX_VUS=10000 npm run stress
  ```

## 📁 Estrutura do Projeto

```
CoordixLoadTests/
├── config/
│   ├── targets.js      # Configuração dos targets (libs)
│   └── metrics.js      # Thresholds e métricas
├── scenarios/
│   ├── smoke.js        # Smoke test
│   ├── rampup.js       # Ramp-up test
│   ├── load-steady.js  # Load steady test
│   ├── spike.js        # Spike test
│   └── stress.js       # Stress test
├── scripts/
│   ├── run-scenario.js      # Executa um cenário
│   ├── run-all-scenarios.js # Executa todos os cenários
│   └── compare-results.js   # Compara resultados
├── results/            # Resultados JSON (gerado automaticamente)
├── package.json
└── README.md
```

## 📈 Interpretando Resultados

### Smoke Test
- ✅ **Passou:** p95 < 50ms, 0% errors → script está correto, API responde
- ❌ **Falhou:** Verificar configuração da API ou script k6

### Ramp-up
- **Ponto de quebra:** Quando p95/p99 começa a subir drasticamente
- **Comparação:** Qual lib aguenta mais VUs antes de degradar?
- **Observar:** RPS máximo alcançado por lib

### Load Steady
- **Estabilidade:** p95 deve oscilar pouco (variação < 20%)
- **Throughput:** RPS deve ser constante
- **Erros:** Deve manter ~0% durante todo o teste

### Spike Test
- **Elasticidade:** Quanto p95/p99 explode no pico?
- **Recuperação:** Quanto tempo leva pra voltar ao normal?
- **Erros:** Quantos erros acontecem durante o spike?

### Stress Test
- **Ponto de ruptura:** Quando começa a ter muitos 5xx/timeouts?
- **Comparação:** Qual lib aguenta mais carga antes de quebrar?
- **Throughput máximo:** Qual lib consegue maior RPS sob stress?

## ⚠️ Importante

**Não compare apenas latência!** Se Coordix dá 10% menos latência mas gasta 3x mais CPU, isso é questionável. Considere:

- Latência (p50, p95, p99)
- Throughput (RPS)
- Error rate
- **CPU e memória** (coletar manualmente durante os testes)
- **GC pressure** (se possível)

## 🔧 Customização

### Adicionar novos targets:
Edite `config/targets.js`:

```javascript
export const TARGETS = {
  coordix: {
    name: 'Coordix',
    path: '/coordix/int',
  },
  // Adicione novos aqui
};
```

### Ajustar thresholds:
Edite `config/metrics.js`:

```javascript
export const METRIC_THRESHOLDS = {
  smoke: {
    'http_req_duration': ['p(95)<50'], // Ajuste aqui
  },
  // ...
};
```

### Modificar cenários:
Edite os arquivos em `scenarios/` conforme necessário.

## 📝 Notas

- Os resultados são salvos em JSON no diretório `results/`
- Use `npm run compare` para gerar tabelas comparativas
- Para análise mais detalhada, importe os JSONs no Grafana k6 Cloud ou outras ferramentas
- **Sempre monitore CPU/memória da API durante os testes** (use `dotnet-counters` ou similar)

## 🤝 Contribuindo

Ao adicionar novos cenários ou métricas, mantenha a estrutura consistente para facilitar comparações.

