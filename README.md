# Coordix Load Tests - Professional Load Testing

Structured load tests using k6 to compare performance between **Coordix**, **MediatR**, and **Wolverine**.

## 🎯 Objective

This is not just "hit it with 1k VUs and see what happens". This project implements **structured test scenarios** with **specific metrics** for scientific comparison between the three libraries.

## 📋 Test Scenarios

### 1. Smoke Test (Sanity Check)

**Objective:** Ensure the endpoint responds and the k6 script is correct.

- **Configuration:** 10-20 RPS for 30-60 seconds
- **Expected metrics:**
  - 0% error rate
  - p95 < 50ms

### 2. Ramp-up (Discover Comfort Zone)

**Objective:** See how far we can go before degradation starts.

- **Configuration:** 10 VUs → 1000 VUs gradually (5-10 minutes)
- **Metrics to observe:**
  - RPS per library
  - `http_req_duration` (p50, p95, p99)
  - Error rate
- **When degradation appears:**
  - Sharp increase in p95/p99
  - HTTP 5xx errors
  - Timeouts

### 3. Load Steady (Steady State)

**Objective:** See how the library behaves under constant load.

- **Configuration:** 300 fixed VUs for 10 minutes (70% of breaking point)
- **Metrics:**
  - Latency stability (p95 should not oscillate wildly)
  - RPS stability
  - Error rate ~ 0

### 4. Spike Test (Sudden Burst)

**Objective:** Measure library elasticity for bursts.

- **Configuration:** 0 → 500-1000 VUs instantly for 30-60s → 0
- **Metrics:**
  - How much p95/p99 explodes
  - How many errors occur at peak
  - Time to "stabilize" when spike ends

### 5. Stress Test (Until It Breaks)

**Objective:** Discover system "breaking point".

- **Configuration:** Ramp up to 5k VUs (or maximum possible)
- **Metrics:**
  - p95/p99 under stress
  - Maximum throughput
  - Which library "buckles" first

## 📊 Collected Metrics

### In k6 (Automatically Collected):

All metrics are automatically collected by k6 and saved to JSON files in the `results/` directory.

#### Response Time Metrics (`http_req_duration`):

**Percentiles** (response time distribution):
- **p50 (50th percentile / Median)**: 50% of requests completed faster than this - typical latency
- **p75 (75th percentile)**: 75% of requests completed within this time
- **p90 (90th percentile)**: 90% of requests completed within this time
- **p95 (95th percentile)**: 95% of requests completed within this time - **common SLA target**
- **p99 (99th percentile)**: 99% of requests completed within this time - tail latency (pain point)
- **p99.9 (99.9th percentile)**: 99.9% of requests completed within this time - extreme tail latency

**Basic Statistics**:
- **Min**: Fastest response time observed
- **Max**: Slowest response time observed
- **Avg**: Average response time across all requests
- **Median**: Same as p50 - middle value when sorted

#### Throughput Metrics (`http_reqs`):

- **Total Requests**: Total number of requests sent during the test
- **RPS (Requests Per Second)**: Effective throughput - higher is better
- **`vus`, `vus_max`**: Virtual users count - confirms load was the same between libraries

#### Error Metrics (`http_req_failed`):

- **Errors**: Total number of failed requests
- **Error Rate**: Percentage of requests that failed (anything > 0.1% is concerning)

### On API Host (Collect Manually):

These metrics should be collected separately during tests using monitoring tools:

- **CPU (%)**: Processor usage - important for resource efficiency comparison
- **Memory (MB)**: Memory consumption - important for resource efficiency comparison
- **GC (via dotnet-counters)**:
  - Gen 0/1/2 collections: Garbage collection frequency
  - Allocated bytes/second: Memory allocation rate

**Why collect these?** A library might have 10% better latency but use 3x more CPU/memory - that's important context!

## 🚀 How to Use

> **💡 First time setup?** See the [Setup Guide](SETUP.md)  
> **💡 Using Windows?** See the [Windows-specific guide](WINDOWS.md)

### Prerequisites

1. Install k6:

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

2. Install .NET 8.0 SDK (for running the test server):

   ```bash
   # macOS/Linux
   # Download from: https://dotnet.microsoft.com/download/dotnet/8.0

   # Verify installation
   dotnet --version
   ```

3. Start the test server:

   ```bash
   # Navigate to the server project
   cd AdvancedSample/src/AdvancedSample.API

   # Restore dependencies
   dotnet restore

   # Run the server
   dotnet run
   ```

   The server will start at `https://localhost:7234` (or configure `BASE_URL` if using a different port/host)

   **Alternative: Using Docker**

   ```bash
   cd AdvancedSample/src/AdvancedSample.API
   docker build -t advancedsample-api .
   docker run -p 7234:8080 -p 5101:8081 advancedsample-api
   ```

### Running Tests

#### Run a specific scenario against all libraries:

```bash
npm run smoke          # Smoke test
npm run rampup         # Ramp-up test
npm run load-steady    # Load steady test
npm run spike          # Spike test
npm run stress         # Stress test
npm run overnight      # Overnight test (6h default) - safe for running while sleeping!
```

#### Run a scenario against a specific library:

```bash
node scripts/run-scenario.js smoke --target=coordix
node scripts/run-scenario.js rampup --target=mediatR
node scripts/run-scenario.js stress --target=wolverine
```

#### Run ALL scenarios (may take hours):

```bash
npm run all                                    # Default configuration
npm run all -- --vus=2000                     # Override VUs for all scenarios
npm run all -- --steady-vus=2000              # Override only load-steady VUs
npm run all -- --max-vus=10000                 # Override max VUs for stress test
npm run all -- --spike-vus=2000               # Override spike VUs
npm run all -- --target=coordix                # Test only Coordix
npm run all -- --vus=2000 --target=coordix   # Combine multiple options
```

**Note:** Use `--` before script arguments when using npm (this tells npm to pass arguments to the script).

**Features for long-running tests:**

- ✅ **No buffer limitations** - Uses `spawn()` instead of `exec()` to handle unlimited output
- ✅ **Safe interruption** - Press `Ctrl+C` to gracefully stop all processes (k6 and Node.js children)
- ✅ **Automatic cleanup** - All child processes are tracked and terminated on interruption
- ✅ **Robust file handling** - Ensures output directory exists before creating files
- ✅ **Safe for unattended runs** - Can run overnight without manual intervention

#### Run overnight test (safe for sleeping!):

```bash
npm run overnight                          # Default: 6h, 1000 VUs, all targets
npm run overnight --target=coordix        # Test only Coordix
npm run overnight --duration=8h           # Run for 8 hours
npm run overnight --vus=2000              # Use 2000 VUs
npm run overnight --target=all --duration=8h --vus=2000  # All options
```

**Overnight test features:**

- ✅ **Data saved incrementally** - even if interrupted, partial data is preserved
- ✅ **Detailed logs** - saved to `logs/` directory
- ✅ **Progress monitoring** - shows file growth every minute
- ✅ **Safe shutdown** - handles SIGINT/SIGTERM gracefully (Ctrl+C works correctly)
- ✅ **No data loss** - designed specifically for unattended runs
- ✅ **Process management** - all child processes are properly tracked and terminated

#### Compare results:

```bash
npm run compare                    # Compare all scenarios
npm run compare --scenario=rampup  # Compare only ramp-up
npm run compare --scenario=overnight  # Compare overnight results
```

The comparison script generates detailed tables showing:

**Table 1 - Percentiles & Average:**
- p50, p75, p90, p95, p99, p99.9 (response time percentiles)
- Average response time

**Table 2 - Min/Max & Throughput:**
- Min/Max response times
- Median response time
- Total requests sent
- RPS (Requests Per Second)
- Total errors

**Table 3 - Error Rate:**
- Error percentage for each library

**Analysis Section:**
- Automatically identifies winners for:
  - Best p50 (median latency)
  - Best p95 (SLA target)
  - Best p99 (tail latency)
  - Highest RPS (throughput)
  - Lowest error rate

#### Export results to CSV:

```bash
npm run export-csv                    # Export all scenarios
npm run export-csv --scenario=rampup # Export only ramp-up
```

The CSV export includes all metrics (percentiles, statistics, throughput, errors) in a format suitable for Excel, Google Sheets, or data analysis tools.

#### Visualize results in web interface:

```bash
npm run web
```

Then open your browser at `http://localhost:3000` to see interactive charts and graphs.

**Features:**
- 📊 **Interactive Charts**: Visual comparison of percentiles, statistics, throughput, and error rates
- 📈 **Multiple Visualizations**: Bar charts for percentiles, RPS, and error rates
- 📋 **Comparison Table**: Detailed metrics table with best values highlighted
- 🔄 **Real-time Updates**: Refresh button to reload latest results
- 🎯 **Scenario Selection**: Choose specific scenarios or view all available results

The web interface provides a user-friendly way to analyze and compare test results with graphical visualizations, making it easier to identify performance differences between Coordix, MediatR, and Wolverine.

### Configuration

#### Environment Variables:

All VU (Virtual User) counts and test parameters are **fully configurable** via environment variables. The k6 has no hard limits - your hardware is the only constraint!

**💡 Recommended: Use `.env` file**

The easiest way to configure environment variables is using the `.env` file:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env  # Linux/Mac
   copy .env.example .env  # Windows
   ```

2. Edit `.env` with your preferred values

3. Run tests normally - variables are automatically loaded:
   ```bash
   npm run smoke
   ```

**Common Variables:**

- **`BASE_URL`**: Base URL of the API (default: `https://localhost:7234`)
  ```bash
  BASE_URL=https://localhost:7234 npm run smoke
  ```

**Smoke Test Variables:**

- **`RATE`**: Requests per second (default: 15)
- **`DURATION`**: Test duration (default: `45s`)
- **`PRE_ALLOCATED_VUS`**: Pre-allocated VUs (default: 5)
- **`MAX_VUS`**: Maximum VUs (default: 20)
  ```bash
  RATE=50 DURATION=60s MAX_VUS=30 npm run smoke
  ```

**Ramp-up Test Variables:**

- **`START_VUS`**: Starting VUs (default: 10)
- **`STAGE1_TARGET`** through **`STAGE4_TARGET`**: VU targets for each stage (defaults: 100, 300, 600, 1000)
- **`STAGE1_DURATION`** through **`STAGE5_DURATION`**: Duration of each stage (defaults: `1m`, `2m`, `2m`, `2m`, `1m`)
- **`GRACEFUL_RAMP_DOWN`**: Ramp-down duration (default: `30s`)
  ```bash
  START_VUS=50 STAGE4_TARGET=2000 npm run rampup
  ```

**Load Steady Test Variables:**

- **`STEADY_VUS`**: Number of constant VUs (default: 300)
- **`DURATION`**: Test duration (default: `10m`)
  ```bash
  STEADY_VUS=500 DURATION=15m npm run load-steady
  ```

**Spike Test Variables:**

- **`SPIKE_VUS`**: Peak VUs for spike (default: 800)
- **`SPIKE_DURATION`**: Duration of spike (default: `60s`)
  ```bash
  SPIKE_VUS=2000 SPIKE_DURATION=120s npm run spike
  ```

**Stress Test Variables:**

- **`START_VUS`**: Starting VUs (default: 50)
- **`STAGE1_TARGET`** through **`STAGE3_TARGET`**: VU targets for stages (defaults: 500, 1500, 3000)
- **`MAX_VUS`**: Maximum VUs (default: 5000)
- **`STAGE1_DURATION`** through **`STAGE5_DURATION`**: Duration of each stage (defaults: `1m`, `2m`, `2m`, `2m`, `2m`)
- **`GRACEFUL_RAMP_DOWN`**: Ramp-down duration (default: `30s`)
  ```bash
  MAX_VUS=10000 STAGE3_TARGET=5000 npm run stress
  ```

**Note:** You can also edit the scenario files directly to change defaults or add more complex configurations.

## 📁 Project Structure

```
CoordixLoadTests/
├── AdvancedSample/           # Test server application (.NET 8.0)
│   ├── src/
│   │   ├── AdvancedSample.API/      # API with test endpoints
│   │   ├── AdvancedSample.Application/ # Query handlers
│   │   └── AdvancedSample.Domain/     # Domain queries
│   └── AdvancedSample.sln
├── config/
│   ├── targets.js      # Target configuration (libraries)
│   └── metrics.js      # Thresholds and metrics
├── scenarios/
│   ├── smoke.js        # Smoke test
│   ├── rampup.js       # Ramp-up test
│   ├── load-steady.js  # Load steady test
│   ├── spike.js        # Spike test
│   └── stress.js       # Stress test
├── scripts/
│   ├── run-scenario.js      # Execute a scenario (with improved signal handling & process management)
│   ├── run-all-scenarios.js # Execute all scenarios (uses spawn to avoid buffer limits)
│   ├── compare-results.js   # Compare results
│   ├── export-csv.js        # Export results to CSV
│   └── parse-k6-efficient.js # Efficient JSON parser
├── results/            # JSON results (auto-generated)
├── templates/          # Report templates
├── package.json
└── README.md
```

## 📈 Interpreting Results

### Understanding Percentiles

**Why percentiles matter:**
- **p50 (median)**: Shows typical performance - what most users experience
- **p95**: Common SLA target - 95% of users get this or better
- **p99**: Tail latency - worst-case for most users (1% get worse)
- **p99.9**: Extreme outliers - important for high-scale systems

**Example:** If p50 = 10ms but p99 = 500ms, the system has tail latency issues even though most requests are fast.

### Smoke Test

**Expected Results:**
- ✅ **Passed:** p95 < 50ms, 0% errors → script is correct, API responds
- ❌ **Failed:** Check API configuration or k6 script

**What to look for:**
- All libraries should have similar low latency (p50, p95)
- Error rate should be 0%
- If one library is significantly slower, investigate why

### Ramp-up

**What to analyze:**
- **Breaking point:** When p95/p99 starts rising drastically (look for inflection point)
- **Comparison:** Which library handles more VUs before degrading?
- **Observe:** Maximum RPS achieved per library
- **Latency progression:** How do p50, p95, p99 change as load increases?

**Key metrics:**
- VU count where degradation starts (compare between libraries)
- Maximum sustainable RPS before errors spike
- p99 behavior - does it explode or stay controlled?

### Load Steady

**What to analyze:**
- **Stability:** p95 should oscillate little (variation < 20%) - check min/max range
- **Throughput:** RPS should be constant (low standard deviation)
- **Errors:** Should maintain ~0% throughout the test
- **Consistency:** Compare p50 vs p95 vs p99 - large gaps indicate inconsistency

**Key metrics:**
- Average RPS (throughput comparison)
- p95 stability (min/max range)
- Error rate consistency
- CPU/Memory usage (if collected)

### Spike Test

**What to analyze:**
- **Elasticity:** How much does p95/p99 explode at peak? (compare peak vs baseline)
- **Recovery:** How long to return to normal after spike ends?
- **Errors:** How many errors occur during spike? (acceptable: < 5%)
- **Overshoot:** Does latency spike beyond spike duration?

**Key metrics:**
- Peak p95/p99 vs baseline p95/p99 (ratio)
- Error rate during spike
- Recovery time (time to return to baseline after spike)
- Maximum latency reached (max value)

### Stress Test

**What to analyze:**
- **Breaking point:** When do many 5xx/timeouts start? (error rate > 1%)
- **Comparison:** Which library handles more load before breaking?
- **Maximum throughput:** Which library achieves higher RPS under stress?
- **Graceful degradation:** Does latency increase gradually or crash suddenly?

**Key metrics:**
- Maximum VUs before failure
- Maximum RPS achieved
- p95/p99 under maximum load
- Error rate progression as load increases
- Which library "buckles" first (comparison)

### General Analysis Tips

1. **Don't just compare averages** - p95 and p99 tell you about tail latency
2. **Throughput matters** - Higher RPS with same latency = better
3. **Error rates are critical** - Even 0.1% can be significant at scale
4. **Consider resource usage** - Lower latency with 3x CPU usage may not be worth it
5. **Look for consistency** - Large gaps between p50 and p99 indicate variability
6. **Use the comparison script** - It automatically identifies winners for each metric

## ⚠️ Important

**Don't compare only latency!** If Coordix has 10% less latency but uses 3x more CPU, that's questionable. Consider:

- Latency (p50, p95, p99)
- Throughput (RPS)
- Error rate
- **CPU and memory** (collect manually during tests)
- **GC pressure** (if possible)

## 🛠️ Troubleshooting

### Tests stop unexpectedly or show "maxBuffer length exceeded"

- **Fixed!** The scripts now use `spawn()` instead of `exec()` to handle unlimited output. This issue should no longer occur.

### Ctrl+C doesn't work / Can't interrupt tests

- **Fixed!** Signal handling has been improved. Press `Ctrl+C` once and all processes (k6 and Node.js children) will be gracefully terminated within 2 seconds.

### File creation errors / Loop of file creation attempts

- **Fixed!** The scripts now ensure the `results/` directory exists before creating files and handle errors properly to prevent infinite loops.

### Tests running slowly or hanging

- Check if the API server is running and accessible
- Verify network connectivity to `BASE_URL`
- Check system resources (CPU, memory) - high load tests can consume significant resources
- Review k6 output for error messages or timeouts

## 🔧 Customization

### Add new targets:

Edit `config/targets.js`:

```javascript
export const TARGETS = {
  coordix: {
    name: "Coordix",
    path: "/tests/Coordix",
  },
  // Add new ones here
};
```

### Adjust thresholds:

Edit `config/metrics.js`:

```javascript
export const METRIC_THRESHOLDS = {
  smoke: {
    http_req_duration: ["p(95)<50"], // Adjust here
  },
  // ...
};
```

### Modify scenarios:

Edit files in `scenarios/` as needed.

## 📝 Notes

- **Start the test server first** before running load tests
- Results are saved as JSON in the `results/` directory (automatically created if missing)
- Use `npm run compare` to generate comparison tables
- Use `npm run export-csv` to export lightweight CSV files for analysis
- For detailed analysis, import JSONs into Grafana k6 Cloud or other tools
- **Always monitor API CPU/memory during tests** (use `dotnet-counters` or similar)
- The test server exposes three endpoints:
  - `GET /tests/Coordix` - Tests Coordix library
  - `GET /tests/MediatR` - Tests MediatR library
  - `GET /Tests/Wolverine` - Tests Wolverine library
- **Interrupting tests**: Press `Ctrl+C` to gracefully stop all running tests. The script will terminate all child processes (k6 instances) and exit cleanly.
- **Long-running tests**: The scripts are optimized for long-running tests (hours/days) with proper process management and no buffer limitations.

## 🤝 Contributing

When adding new scenarios or metrics, keep the structure consistent to facilitate comparisons.
