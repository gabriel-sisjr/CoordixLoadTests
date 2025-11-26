# Practical Execution Examples

## Example 1: Complete Test of One Library

```bash
# 1. Smoke test (verify it's working)
node scripts/run-scenario.js smoke --target=coordix

# 2. Ramp-up (discover limits)
node scripts/run-scenario.js rampup --target=coordix

# 3. Load steady with 70% of found limit (e.g., 300 VUs)
STEADY_VUS=300 node scripts/run-scenario.js load-steady --target=coordix

# 4. Spike test
node scripts/run-scenario.js spike --target=coordix

# 5. Stress test (optional)
node scripts/run-scenario.js stress --target=coordix

# 6. Compare (if other libraries already ran)
npm run compare
```

## Example 2: Quick Comparison (Smoke + Ramp-up)

```bash
# Run smoke on all libraries
npm run smoke

# Run ramp-up on all libraries
npm run rampup

# Compare results
npm run compare --scenario=smoke
npm run compare --scenario=rampup
```

## Example 3: Test with Host Monitoring

**Terminal 1 - Monitoring:**
```bash
# Find dotnet process PID
ps aux | grep dotnet

# Start monitoring
./scripts/monitor-host.sh "dotnet" "results/host_metrics_rampup_coordix.csv"
```

**Terminal 2 - Run Test:**
```bash
# Run ramp-up while monitoring
node scripts/run-scenario.js rampup --target=coordix
```

**Result:** You'll have CPU/memory/GC metrics synchronized with tests.

## Example 4: Custom Test

```bash
# Load steady with specific load
STEADY_VUS=500 DURATION=15m node scripts/run-scenario.js load-steady --target=mediatR

# Larger spike
SPIKE_VUS=1500 SPIKE_DURATION=90s node scripts/run-scenario.js spike --target=wolverine

# Stress with more VUs
MAX_VUS=10000 node scripts/run-scenario.js stress --target=coordix
```

## Example 5: API on Different Host

```bash
# Test remote API
BASE_URL=https://staging.example.com:8080 npm run smoke

# Or with authentication (adjust scripts if needed)
BASE_URL=https://api.example.com npm run rampup
```

## Example 6: Complete Comparison Workflow

```bash
# 1. Prepare environment
# - API running
# - Monitoring configured (optional)

# 2. Run all scenarios on all libraries
npm run all

# This will run:
# - smoke → coordix, mediatR, wolverine
# - rampup → coordix, mediatR, wolverine
# - load-steady → coordix, mediatR, wolverine
# - spike → coordix, mediatR, wolverine
# - stress → coordix, mediatR, wolverine

# 3. Compare results
npm run compare

# 4. Analyze detailed results
# Open JSON files in results/
# Or use Grafana k6 Cloud
```

## Example 7: Incremental Analysis

```bash
# Day 1: Discover limits
npm run rampup
npm run compare --scenario=rampup

# Note: Coordix breaks at ~800 VUs, MediatR at ~600 VUs, Wolverine at ~1000 VUs

# Day 2: Test steady load (70% of limit)
STEADY_VUS=560 node scripts/run-scenario.js load-steady --target=coordix  # 70% of 800
STEADY_VUS=420 node scripts/run-scenario.js load-steady --target=mediatR  # 70% of 600
STEADY_VUS=700 node scripts/run-scenario.js load-steady --target=wolverine # 70% of 1000

npm run compare --scenario=load-steady

# Day 3: Test elasticity
npm run spike
npm run compare --scenario=spike
```

## Example 8: Debugging

```bash
# If smoke test fails, check:
# 1. Is API running?
curl -k https://localhost:7234/tests/Coordix

# 2. Is k6 installed?
k6 version

# 3. Run with more verbosity
k6 run scenarios/smoke.js --env BASE_URL=https://localhost:7234 --env TARGET_PATH=/tests/Coordix --env TARGET_NAME=coordix

# 4. Check results
ls -la results/
cat results/smoke_coordix_*.json | head -20
```

## Example 9: CI/CD Integration

```yaml
# Example .github/workflows/load-test.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
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

## Example 10: JSON Results Analysis

```bash
# View result structure
cat results/rampup_coordix_*.json | jq '.' | head -50

# Extract only p95
cat results/rampup_coordix_*.json | jq 'select(.type=="Metric" and .metric.name=="http_req_duration") | .metric.values.p95'

# Count errors
cat results/stress_coordix_*.json | jq 'select(.type=="Metric" and .metric.name=="http_req_failed") | .metric.values.count'
```

## Final Tips

1. **Always start with smoke test** - ensures everything is working
2. **Monitor resources** - CPU/memory are as important as latency
3. **Run in isolated environment** - don't test in production
4. **Document conditions** - same machine, same time, same configuration
5. **Compare apples to apples** - same load, same environment
6. **Note observations** - use results template
