# 🚀 Otimizações de Performance

## Problema Resolvido

Os arquivos JSON do k6 podem ser **muito grandes** (8GB+ para testes longos), causando problemas de memória ao tentar abri-los.

## Soluções Implementadas

### 1. Processamento por Streaming ✅

Os scripts agora processam arquivos **linha por linha** ao invés de carregar tudo na memória:

- ✅ `compare-results.js` - Usa streaming
- ✅ `export-csv.js` - Usa streaming  
- ✅ `parse-k6-efficient.js` - Parser otimizado

### 2. Busca Inteligente do Summary

O parser busca o **Summary no final do arquivo primeiro** (onde geralmente está), evitando processar milhões de linhas desnecessárias.

### 3. Exportação para CSV

Arquivos CSV são **muito mais leves** e fáceis de abrir:

```bash
npm run export-csv
```

Isso gera arquivos `*_summary.csv` que podem ser abertos no Excel, Google Sheets ou qualquer editor de texto.

## Como Usar

### Comparação Rápida (Terminal)

```bash
# Comparar todos os cenários
npm run compare

# Comparar um cenário específico
npm run compare --scenario=rampup
```

**Vantagem:** Não precisa abrir arquivos grandes, tudo é processado em streaming.

### Exportar para CSV (Abrir em Excel/Sheets)

```bash
# Exportar todos os cenários
npm run export-csv

# Exportar um cenário específico
npm run export-csv --scenario=rampup
```

**Vantagem:** Arquivos CSV são leves (alguns KB) e fáceis de abrir e analisar.

## Comparação de Memória

| Método | Memória Usada | Tempo |
|--------|---------------|-------|
| **Antes** (carregar tudo) | 8GB+ | Muito lento / crash |
| **Agora** (streaming) | <100MB | Segundos |

## Arquivos Gerados

### JSON (k6 original)
- `results/smoke_coordix_*.json` - Arquivo completo do k6 (pode ser grande)
- **Não abra diretamente** se for muito grande!

### CSV (resumo leve)
- `results/smoke_summary.csv` - Resumo em CSV (alguns KB)
- **Pode abrir facilmente** no Excel/Sheets

## Dicas

1. **Use `npm run compare`** para ver resultados rapidamente no terminal
2. **Use `npm run export-csv`** para gerar arquivos leves para análise
3. **Não tente abrir JSONs grandes** diretamente - use os scripts
4. **CSV é seu amigo** - muito mais fácil de trabalhar

## Troubleshooting

### Script ainda está lento?

- Verifique o tamanho do arquivo: `ls -lh results/*.json`
- Se for muito grande (>10GB), considere usar `--summary` no k6 para gerar arquivos menores

### Valores aparecem como 0?

- O parser pode não estar encontrando o Summary
- Verifique se o arquivo JSON está completo (k6 terminou normalmente)
- Tente executar o teste novamente

### Quer mais detalhes?

- Use `k6 run --out json=results/test.json` com `--summary` para arquivos menores
- Ou use Grafana k6 Cloud para visualização avançada

