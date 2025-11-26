# Script PowerShell para monitorar CPU, memória e GC durante os testes de carga (Windows)
# 
# Uso:
#   .\scripts\monitor-host-dotnet.ps1 -ProcessName "dotnet" -OutputFile "results\host_metrics.csv"

param(
    [string]$ProcessName = "dotnet",
    [string]$OutputFile = "results\host_metrics_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
)

# Criar diretório se não existir
$outputDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "🔍 Monitorando processo: $ProcessName" -ForegroundColor Cyan
Write-Host "📁 Saída: $OutputFile" -ForegroundColor Cyan
Write-Host "⏹️  Pressione Ctrl+C para parar" -ForegroundColor Yellow
Write-Host ""

# Encontrar processo
$process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $process) {
    Write-Host "❌ Processo '$ProcessName' não encontrado!" -ForegroundColor Red
    Write-Host "   Tente: Get-Process | Where-Object {$_.ProcessName -like '*dotnet*'}" -ForegroundColor Yellow
    exit 1
}

$pid = $process.Id
Write-Host "✅ PID encontrado: $pid" -ForegroundColor Green
Write-Host ""

# Cabeçalho CSV
"timestamp,cpu_percent,memory_mb,gc_gen0,gc_gen1,gc_gen2" | Out-File -FilePath $OutputFile -Encoding UTF8

# Função para coletar métricas
function Collect-Metrics {
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    
    # CPU e memória
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if (-not $proc) {
        return $false
    }
    
    $cpuPercent = $proc.CPU
    $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
    
    # GC via dotnet-counters (se disponível)
    $gcGen0 = "N/A"
    $gcGen1 = "N/A"
    $gcGen2 = "N/A"
    
    if (Get-Command dotnet-counters -ErrorAction SilentlyContinue) {
        try {
            $gcOutput = dotnet-counters monitor --process-id $pid --counters "System.Runtime[gc-gen-0-collections,gc-gen-1-collections,gc-gen-2-collections]" --format json 2>$null
            # Parse básico (pode precisar ajuste)
            if ($gcOutput) {
                $gcGen0 = ($gcOutput | Select-String -Pattern '"gc-gen-0-collections":(\d+)').Matches.Groups[1].Value
                $gcGen1 = ($gcOutput | Select-String -Pattern '"gc-gen-1-collections":(\d+)').Matches.Groups[1].Value
                $gcGen2 = ($gcOutput | Select-String -Pattern '"gc-gen-2-collections":(\d+)').Matches.Groups[1].Value
            }
        } catch {
            # Ignora erros de dotnet-counters
        }
    }
    
    # Escrever no CSV
    "$timestamp,$cpuPercent,$memoryMB,$gcGen0,$gcGen1,$gcGen2" | Out-File -FilePath $OutputFile -Append -Encoding UTF8
    
    # Mostrar no console
    Write-Host "`r⏱️  CPU: $($cpuPercent.ToString('F2').PadLeft(6))% | Mem: $($memoryMB.ToString('F2').PadLeft(8)) MB | GC: Gen0=$gcGen0 Gen1=$gcGen1 Gen2=$gcGen2" -NoNewline
    
    return $true
}

# Trap para garantir que o arquivo seja fechado corretamente
try {
    while ($true) {
        if (-not (Collect-Metrics)) {
            Write-Host ""
            Write-Host "⚠️  Processo $pid não encontrado mais. Finalizando monitoramento." -ForegroundColor Yellow
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "✅ Monitoramento finalizado. Dados salvos em: $OutputFile" -ForegroundColor Green
}

