#!/bin/bash

# Script para monitorar CPU, memória e GC durante os testes de carga
# 
# Uso:
#   ./scripts/monitor-host.sh <process-name> <output-file>
#
# Exemplo:
#   ./scripts/monitor-host.sh "dotnet" "results/host_metrics_rampup_coordix.csv"

PROCESS_NAME=${1:-"dotnet"}
OUTPUT_FILE=${2:-"results/host_metrics_$(date +%Y%m%d_%H%M%S).csv"}

# Criar diretório se não existir
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "🔍 Monitorando processo: $PROCESS_NAME"
echo "📁 Saída: $OUTPUT_FILE"
echo "⏹️  Pressione Ctrl+C para parar"
echo ""

# Cabeçalho CSV
echo "timestamp,cpu_percent,memory_mb,gc_gen0,gc_gen1,gc_gen2" > "$OUTPUT_FILE"

# Encontrar PID do processo
PID=$(pgrep -f "$PROCESS_NAME" | head -1)

if [ -z "$PID" ]; then
    echo "❌ Processo '$PROCESS_NAME' não encontrado!"
    echo "   Tente: ps aux | grep dotnet"
    exit 1
fi

echo "✅ PID encontrado: $PID"
echo ""

# Função para coletar métricas
collect_metrics() {
    TIMESTAMP=$(date +%s)
    
    # CPU e memória via ps
    PS_OUTPUT=$(ps -p "$PID" -o %cpu,rss 2>/dev/null | tail -1)
    CPU_PERCENT=$(echo "$PS_OUTPUT" | awk '{print $1}')
    RSS_KB=$(echo "$PS_OUTPUT" | awk '{print $2}')
    MEMORY_MB=$(echo "scale=2; $RSS_KB / 1024" | bc)
    
    # GC via dotnet-counters (se disponível)
    GC_GEN0="N/A"
    GC_GEN1="N/A"
    GC_GEN2="N/A"
    
    if command -v dotnet-counters &> /dev/null; then
        GC_OUTPUT=$(dotnet-counters monitor --process-id "$PID" --counters "System.Runtime[gc-gen-0-collections,gc-gen-1-collections,gc-gen-2-collections]" --format json 2>/dev/null | head -3)
        # Parse básico (pode precisar ajuste dependendo da versão do dotnet-counters)
        GC_GEN0=$(echo "$GC_OUTPUT" | grep -o '"gc-gen-0-collections":[0-9]*' | cut -d: -f2 || echo "0")
        GC_GEN1=$(echo "$GC_OUTPUT" | grep -o '"gc-gen-1-collections":[0-9]*' | cut -d: -f2 || echo "0")
        GC_GEN2=$(echo "$GC_OUTPUT" | grep -o '"gc-gen-2-collections":[0-9]*' | cut -d: -f2 || echo "0")
    fi
    
    # Escrever no CSV
    echo "$TIMESTAMP,$CPU_PERCENT,$MEMORY_MB,$GC_GEN0,$GC_GEN1,$GC_GEN2" >> "$OUTPUT_FILE"
    
    # Mostrar no console (opcional)
    printf "\r⏱️  CPU: %5s%% | Mem: %8s MB | GC: Gen0=%s Gen1=%s Gen2=%s" \
        "$CPU_PERCENT" "$MEMORY_MB" "$GC_GEN0" "$GC_GEN1" "$GC_GEN2"
}

# Trap para garantir que o arquivo seja fechado corretamente
trap 'echo ""; echo "✅ Monitoramento finalizado. Dados salvos em: $OUTPUT_FILE"; exit 0' INT TERM

# Loop de coleta (a cada segundo)
while true; do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo ""
        echo "⚠️  Processo $PID não encontrado mais. Finalizando monitoramento."
        break
    fi
    
    collect_metrics
    sleep 1
done

