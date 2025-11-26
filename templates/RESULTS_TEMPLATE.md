# Relatório de Testes de Carga - Coordix vs MediatR vs Wolverine

**Data:** [DATA]  
**Ambiente:** [Local/Staging/Production]  
**Versão da API:** [VERSÃO]  
**Hardware:** [CPU, RAM, etc]

---

## Resumo Executivo

| Métrica | Coordix | MediatR | Wolverine | Vencedor |
|---------|---------|---------|-----------|----------|
| **Melhor p95 (load steady)** | X ms | Y ms | Z ms | [LIB] |
| **Maior RPS (ramp-up)** | X req/s | Y req/s | Z req/s | [LIB] |
| **Menor CPU (load steady)** | X % | Y % | Z % | [LIB] |
| **Menor memória (load steady)** | X MB | Y MB | Z MB | [LIB] |
| **Melhor elasticidade (spike)** | [NOTA] | [NOTA] | [NOTA] | [LIB] |

**Conclusão:** [RESUMO DE 2-3 LINHAS]

---

## 1. Smoke Test

**Objetivo:** Verificar que endpoints respondem corretamente

### Resultados

| Target | p50 | p95 | p99 | RPS | Errors | Error % | Status |
|--------|-----|-----|-----|-----|--------|---------|--------|
| Coordix | | | | | | | ✅/❌ |
| MediatR | | | | | | | ✅/❌ |
| Wolverine | | | | | | | ✅/❌ |

### Observações
- [Anotar qualquer anomalia]

---

## 2. Ramp-up Test

**Objetivo:** Descobrir ponto de quebra de cada lib

### Resultados

| Target | p50 | p95 | p99 | RPS Max | VUs no Breakpoint | Errors | Error % |
|--------|-----|-----|-----|---------|-------------------|--------|---------|
| Coordix | | | | | | | |
| MediatR | | | | | | | |
| Wolverine | | | | | | | |

### Gráfico de Degradação (descrever ou anexar)

**Coordix:**
- Ponto de quebra: ~X VUs
- Sintomas: [aumento de p95, 5xx, timeouts]

**MediatR:**
- Ponto de quebra: ~X VUs
- Sintomas: [aumento de p95, 5xx, timeouts]

**Wolverine:**
- Ponto de quebra: ~X VUs
- Sintomas: [aumento de p95, 5xx, timeouts]

### Observações
- [Anotar quando cada lib começou a degradar]

---

## 3. Load Steady Test

**Objetivo:** Verificar comportamento sob carga constante

**Configuração:** X VUs por Y minutos (70% do ponto de quebra)

### Resultados

| Target | p50 | p95 | p99 | RPS Médio | RPS Std Dev | Errors | Error % | CPU Médio | Memória Média |
|--------|-----|-----|-----|-----------|-------------|--------|---------|-----------|---------------|
| Coordix | | | | | | | | | |
| MediatR | | | | | | | | | |
| Wolverine | | | | | | | | | |

### Estabilidade

**Coordix:**
- Variação p95: ±X% (estável/instável)
- Variação RPS: ±X req/s

**MediatR:**
- Variação p95: ±X% (estável/instável)
- Variação RPS: ±X req/s

**Wolverine:**
- Variação p95: ±X% (estável/instável)
- Variação RPS: ±X req/s

### Observações
- [Anotar estabilidade, oscilações, etc]

---

## 4. Spike Test

**Objetivo:** Medir elasticidade para bursts

**Configuração:** 0 → X VUs instantaneamente por Y segundos → 0

### Resultados

| Target | p95 Normal | p95 Pico | p99 Normal | p99 Pico | Erros no Pico | Tempo Recuperação |
|--------|------------|----------|------------|----------|---------------|-------------------|
| Coordix | | | | | | |
| MediatR | | | | | | |
| Wolverine | | | | | | |

### Análise de Elasticidade

**Coordix:**
- Explosão p95: X ms → Y ms (X% aumento)
- Erros durante spike: X%
- Tempo para estabilizar: X segundos

**MediatR:**
- Explosão p95: X ms → Y ms (X% aumento)
- Erros durante spike: X%
- Tempo para estabilizar: X segundos

**Wolverine:**
- Explosão p95: X ms → Y ms (X% aumento)
- Erros durante spike: X%
- Tempo para estabilizar: X segundos

### Observações
- [Como cada lib lidou com o burst]

---

## 5. Stress Test

**Objetivo:** Descobrir ponto de ruptura

**Configuração:** Ramp até X VUs

### Resultados

| Target | p95 Máximo | p99 Máximo | RPS Máximo | VUs Máximo | Erros Totais | Status Final |
|--------|------------|------------|------------|------------|--------------|--------------|
| Coordix | | | | | | [Funcionando/Quebrado] |
| MediatR | | | | | | [Funcionando/Quebrado] |
| Wolverine | | | | | | [Funcionando/Quebrado] |

### Ponto de Ruptura

**Coordix:**
- Quebrou em: ~X VUs
- Sintomas: [5xx, timeouts, crash, etc]

**MediatR:**
- Quebrou em: ~X VUs
- Sintomas: [5xx, timeouts, crash, etc]

**Wolverine:**
- Quebrou em: ~X VUs
- Sintomas: [5xx, timeouts, crash, etc]

### Observações
- [Qual lib aguentou mais carga]

---

## 6. Análise de Recursos (CPU/Memória/GC)

### Load Steady (carga constante)

| Target | CPU Médio | CPU Pico | Memória Média | Memória Pico | GC Gen0 | GC Gen1 | GC Gen2 |
|--------|-----------|----------|---------------|--------------|---------|---------|---------|
| Coordix | | | | | | | |
| MediatR | | | | | | | |
| Wolverine | | | | | | | |

### Observações
- [Qual lib usa mais recursos]
- [Padrões de GC]
- [Vazamentos de memória?]

---

## 7. Conclusões e Recomendações

### Performance
- **Latência:** [Qual lib tem melhor latência e quando]
- **Throughput:** [Qual lib tem maior throughput]
- **Estabilidade:** [Qual lib é mais estável]

### Recursos
- **CPU:** [Qual lib usa menos CPU]
- **Memória:** [Qual lib usa menos memória]
- **GC:** [Qual lib tem menos pressão de GC]

### Elasticidade
- **Bursts:** [Qual lib lida melhor com spikes]
- **Recuperação:** [Qual lib se recupera mais rápido]

### Recomendação Final

**Para uso em produção, recomendo:** [LIB]

**Motivos:**
1. [Razão 1]
2. [Razão 2]
3. [Razão 3]

**Trade-offs:**
- [O que você ganha]
- [O que você perde]

---

## Anexos

- [ ] Arquivos JSON dos resultados (`results/`)
- [ ] Gráficos de CPU/memória (se coletados)
- [ ] Logs da API durante os testes
- [ ] Configuração exata usada (VUs, duração, etc)

---

## Notas Adicionais

[Qualquer observação adicional que não se encaixe nas seções acima]

