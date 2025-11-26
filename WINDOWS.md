# 🪟 Guia de Uso no Windows

## Compatibilidade

✅ **Scripts Node.js funcionam no Windows:**
- `compare-results.js` ✅
- `export-csv.js` ✅
- `run-scenario.js` ✅
- `run-all-scenarios.js` ✅
- `parse-k6-efficient.js` ✅

⚠️ **Scripts Shell não funcionam no Windows:**
- `monitor-host.sh` ❌ (use `monitor-host-dotnet.ps1`)

## Pré-requisitos

### 1. Node.js instalado
```powershell
# Verificar instalação
node --version
npm --version
```

### 2. k6 instalado
```powershell
# Windows (usando Chocolatey)
choco install k6

# Ou baixar manualmente de: https://k6.io/docs/getting-started/installation/
# Adicionar ao PATH do sistema

# Verificar instalação
k6 version
```

### 3. PowerShell (já vem com Windows)
```powershell
# Verificar versão
$PSVersionTable.PSVersion
```

## Como Usar

### Executar Testes

```powershell
# Smoke test
npm run smoke

# Ou diretamente
node scripts\run-scenario.js smoke

# Testar uma lib específica
node scripts\run-scenario.js smoke --target=coordix
```

### Comparar Resultados

```powershell
# Comparar todos os cenários
npm run compare

# Comparar um cenário específico
node scripts\compare-results.js --scenario=smoke
```

### Exportar para CSV

```powershell
# Exportar todos os cenários
npm run export-csv

# Exportar um cenário específico
node scripts\export-csv.js --scenario=smoke
```

## Monitoramento do Host (Windows)

Use o script PowerShell:

```powershell
# Em um terminal separado, enquanto os testes rodam
.\scripts\monitor-host-dotnet.ps1 -ProcessName "dotnet" -OutputFile "results\host_metrics.csv"
```

## Diferenças do Linux/macOS

### Caminhos de Arquivo
- ✅ Os scripts usam `path.join()` que funciona em ambos os sistemas
- ✅ Caminhos são tratados automaticamente

### Execução de Comandos
- ✅ `spawn('k6', ...)` funciona no Windows se k6 estiver no PATH
- ✅ Todos os comandos Node.js são cross-platform

### Variáveis de Ambiente
```powershell
# Windows PowerShell
$env:BASE_URL="https://localhost:7234"
npm run smoke

# Windows CMD
set BASE_URL=https://localhost:7234
npm run smoke
```

## Troubleshooting

### k6 não encontrado

```powershell
# Verificar se está no PATH
k6 version

# Se não funcionar, adicionar ao PATH:
# 1. Baixar k6 de https://k6.io/docs/getting-started/installation/
# 2. Extrair para uma pasta (ex: C:\k6)
# 3. Adicionar C:\k6 ao PATH do sistema
```

### Erro ao executar scripts

```powershell
# Se der erro de permissão, executar como:
node scripts\run-scenario.js smoke

# Ao invés de:
.\scripts\run-scenario.js smoke
```

### Problemas com npm scripts

```powershell
# Se npm run não funcionar, execute diretamente:
node scripts\compare-results.js
node scripts\export-csv.js
```

### Caminhos com espaços

Se houver espaços no caminho do projeto:
```powershell
# Use aspas:
cd "C:\Users\Meu Nome\Desktop\CoordixLoadTests"
npm run smoke
```

## Exemplo Completo

```powershell
# 1. Navegar até o projeto
cd C:\Users\SeuNome\Desktop\CoordixLoadTests

# 2. Verificar instalações
node --version
k6 version

# 3. Executar smoke test
npm run smoke

# 4. Comparar resultados
npm run compare

# 5. Exportar CSV
npm run export-csv

# 6. Abrir CSV no Excel
start results\smoke_summary.csv
```

## Notas Importantes

1. **Use PowerShell ou CMD** - Os scripts Node.js funcionam em ambos
2. **k6 deve estar no PATH** - Caso contrário, ajuste os scripts para usar caminho completo
3. **Use barras invertidas ou normais** - `path.join()` trata automaticamente
4. **Scripts .sh não funcionam** - Use PowerShell para monitoramento

## Suporte

Se encontrar problemas específicos do Windows, verifique:
- Versão do Node.js (recomendado: 16+)
- k6 instalado e no PATH
- Permissões de execução de scripts PowerShell (se necessário)

