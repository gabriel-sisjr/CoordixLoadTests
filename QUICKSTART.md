# 🚀 Quick Start - Testes de Carga

Guia rápido para começar a executar os testes de carga.

## Pré-requisitos

1. **k6 instalado**
   ```bash
   # macOS
   brew install k6
   
   # Verificar instalação
   k6 version
   ```

2. **API rodando**
   - Certifique-se de que sua API está rodando em `http://localhost:5000`
   - Ou configure `BASE_URL` antes de executar

## Execução Rápida

### 1. Smoke Test (teste rápido de sanidade)

```bash
npm run smoke
```

Isso vai executar o smoke test contra todas as 3 libs (coordix, mediatR, wolverine).

### 2. Testar uma lib específica

```bash
# Smoke test apenas Coordix
node scripts/run-scenario.js smoke --target=coordix

# Ramp-up apenas MediatR
node scripts/run-scenario.js rampup --target=mediatR

# Stress test apenas Wolverine
node scripts/run-scenario.js stress --target=wolverine
```

### 3. Comparar resultados

```bash
npm run compare
```

Isso vai mostrar tabelas comparativas para todos os cenários executados.

## Monitoramento do Host (durante os testes)

### macOS/Linux:

Em um terminal separado, enquanto os testes rodam:

```bash
# Monitorar processo dotnet
./scripts/monitor-host.sh "dotnet" "results/host_metrics_rampup_coordix.csv"
```

### Windows:

```powershell
.\scripts\monitor-host-dotnet.ps1 -ProcessName "dotnet" -OutputFile "results\host_metrics.csv"
```

## Fluxo Recomendado

1. **Comece com Smoke Test**
   ```bash
   npm run smoke
   ```
   Verifica se tudo está funcionando.

2. **Execute Ramp-up para descobrir limites**
   ```bash
   npm run rampup
   ```
   Isso vai mostrar até onde cada lib aguenta antes de degradar.

3. **Execute Load Steady com carga conhecida**
   ```bash
   # Primeiro descubra o ponto de quebra no ramp-up
   # Depois use ~70% desse valor
   STEADY_VUS=300 npm run load-steady
   ```

4. **Teste Spike**
   ```bash
   npm run spike
   ```

5. **Stress Test (opcional, pode quebrar a API)**
   ```bash
   npm run stress
   ```

6. **Compare tudo**
   ```bash
   npm run compare
   ```

## Configuração Rápida

### Mudar URL da API:

```bash
BASE_URL=http://localhost:8080 npm run smoke
```

### Ajustar carga:

```bash
# Load steady com mais VUs
STEADY_VUS=500 npm run load-steady

# Spike maior
SPIKE_VUS=1500 npm run spike

# Stress até mais VUs
MAX_VUS=10000 npm run stress
```

## Resultados

- **JSON**: `results/*.json` - Dados brutos do k6
- **CSV**: `results/host_metrics_*.csv` - Métricas do host (se monitorou)
- **Comparação**: Execute `npm run compare` para ver tabelas

## Dicas

1. **Sempre monitore CPU/memória** durante os testes (use os scripts de monitoramento)
2. **Execute testes em ambiente isolado** - não teste em produção!
3. **Compare sempre as mesmas condições** - mesma máquina, mesma hora, mesma configuração
4. **Anote observações** - se algo mudou entre testes, documente

## Troubleshooting

### k6 não encontrado
```bash
# Verificar instalação
which k6
k6 version

# Reinstalar se necessário
brew install k6
```

### API não responde
```bash
# Verificar se está rodando
curl http://localhost:5000/coordix/int

# Ou ajustar BASE_URL
BASE_URL=http://seu-host:porta npm run smoke
```

### Resultados não aparecem
```bash
# Verificar diretório results
ls -la results/

# Executar comparação
npm run compare
```

