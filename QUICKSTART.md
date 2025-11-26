# 🚀 Quick Start - Load Testing

Quick guide to start running load tests.

## Prerequisites

1. **k6 installed**
   ```bash
   # macOS
   brew install k6
   
   # Verify installation
   k6 version
   ```

2. **.NET 8.0 SDK installed** (for running the test server)
   ```bash
   # Verify installation
   dotnet --version
   ```

3. **Start the test server**
   ```bash
   # Navigate to server directory
   cd AdvancedSample/src/AdvancedSample.API
   
   # Restore and run
   dotnet restore
   dotnet run
   ```
   
   The server will start at `https://localhost:7234`
   
   **Note:** Keep the server running in a separate terminal while executing load tests.

## Quick Execution

### 1. Smoke Test (quick sanity check)

```bash
npm run smoke
```

This will run the smoke test against all 3 libraries (coordix, mediatR, wolverine).

### 2. Test a specific library

```bash
# Smoke test only Coordix
node scripts/run-scenario.js smoke --target=coordix

# Ramp-up only MediatR
node scripts/run-scenario.js rampup --target=mediatR

# Stress test only Wolverine
node scripts/run-scenario.js stress --target=wolverine
```

### 3. Compare results

```bash
npm run compare
```

This will show comparison tables for all executed scenarios.

## Host Monitoring (during tests)

### macOS/Linux:

In a separate terminal, while tests run:

```bash
# Monitor dotnet process
./scripts/monitor-host.sh "dotnet" "results/host_metrics_rampup_coordix.csv"
```

### Windows:

```powershell
.\scripts\monitor-host-dotnet.ps1 -ProcessName "dotnet" -OutputFile "results\host_metrics.csv"
```

## Recommended Workflow

1. **Start with Smoke Test**
   ```bash
   npm run smoke
   ```
   Verifies everything is working.

2. **Run Ramp-up to discover limits**
   ```bash
   npm run rampup
   ```
   This will show how far each library can go before degrading.

3. **Run Load Steady with known load**
   ```bash
   # First discover the breaking point in ramp-up
   # Then use ~70% of that value
   STEADY_VUS=300 npm run load-steady
   ```

4. **Test Spike**
   ```bash
   npm run spike
   ```

5. **Stress Test (optional, may break the API)**
   ```bash
   npm run stress
   ```

6. **Compare everything**
   ```bash
   npm run compare
   ```

## Quick Configuration

### Change API URL:

```bash
BASE_URL=https://localhost:8080 npm run smoke
```

### Adjust load:

```bash
# Load steady with more VUs
STEADY_VUS=500 npm run load-steady

# Larger spike
SPIKE_VUS=1500 npm run spike

# Stress with more VUs
MAX_VUS=10000 npm run stress
```

## Results

- **JSON**: `results/*.json` - Raw k6 data
- **CSV**: `results/host_metrics_*.csv` - Host metrics (if monitored)
- **Comparison**: Run `npm run compare` to see tables

## Tips

1. **Always monitor CPU/memory** during tests (use monitoring scripts)
2. **Run tests in isolated environment** - don't test in production!
3. **Always compare same conditions** - same machine, same time, same configuration
4. **Note observations** - if something changed between tests, document it

## Troubleshooting

### k6 not found
```bash
# Verify installation
which k6
k6 version

# Reinstall if needed
brew install k6
```

### API not responding
```bash
# Check if it's running
curl -k https://localhost:7234/tests/Coordix

# Or adjust BASE_URL
BASE_URL=https://your-host:port npm run smoke
```

### Results don't appear
```bash
# Check results directory
ls -la results/

# Run comparison
npm run compare
```
