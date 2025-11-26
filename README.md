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

### In k6:
- **`http_req_duration`**
  - p50 (median): typical latency
  - p95: acceptable
  - p99: pain point
- **`http_reqs`**: total requests/second → effective throughput
- **`http_req_failed`**: error rate (anything > 0.1% is concerning)
- **`vus`, `vus_max`**: to confirm load was the same between libraries

### On API host (collect manually):
- CPU (%)
- Memory (MB)
- GC (if possible via dotnet-counters):
  - Gen 0/1/2 collections
  - Allocated bytes/second

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
```

#### Run a scenario against a specific library:
```bash
node scripts/run-scenario.js smoke --target=coordix
node scripts/run-scenario.js rampup --target=mediatR
node scripts/run-scenario.js stress --target=wolverine
```

#### Run ALL scenarios (may take hours):
```bash
npm run all
```

#### Compare results:
```bash
npm run compare                    # Compare all scenarios
npm run compare --scenario=rampup  # Compare only ramp-up
```

### Configuration

#### Environment Variables:

- **`BASE_URL`**: Base URL of the API (default: `https://localhost:7234`)
  ```bash
  BASE_URL=https://localhost:7234 npm run smoke
  ```

- **`STEADY_VUS`**: Number of VUs for load-steady (default: 300)
  ```bash
  STEADY_VUS=500 npm run load-steady
  ```

- **`SPIKE_VUS`**: Number of VUs for spike test (default: 800)
  ```bash
  SPIKE_VUS=1000 npm run spike
  ```

- **`MAX_VUS`**: Maximum VUs for stress test (default: 5000)
  ```bash
  MAX_VUS=10000 npm run stress
  ```

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
│   ├── run-scenario.js      # Execute a scenario
│   ├── run-all-scenarios.js # Execute all scenarios
│   ├── compare-results.js   # Compare results
│   ├── export-csv.js        # Export results to CSV
│   └── parse-k6-efficient.js # Efficient JSON parser
├── results/            # JSON results (auto-generated)
├── templates/          # Report templates
├── package.json
└── README.md
```

## 📈 Interpreting Results

### Smoke Test
- ✅ **Passed:** p95 < 50ms, 0% errors → script is correct, API responds
- ❌ **Failed:** Check API configuration or k6 script

### Ramp-up
- **Breaking point:** When p95/p99 starts rising drastically
- **Comparison:** Which library handles more VUs before degrading?
- **Observe:** Maximum RPS achieved per library

### Load Steady
- **Stability:** p95 should oscillate little (variation < 20%)
- **Throughput:** RPS should be constant
- **Errors:** Should maintain ~0% throughout the test

### Spike Test
- **Elasticity:** How much does p95/p99 explode at peak?
- **Recovery:** How long to return to normal?
- **Errors:** How many errors occur during spike?

### Stress Test
- **Breaking point:** When do many 5xx/timeouts start?
- **Comparison:** Which library handles more load before breaking?
- **Maximum throughput:** Which library achieves higher RPS under stress?

## ⚠️ Important

**Don't compare only latency!** If Coordix has 10% less latency but uses 3x more CPU, that's questionable. Consider:

- Latency (p50, p95, p99)
- Throughput (RPS)
- Error rate
- **CPU and memory** (collect manually during tests)
- **GC pressure** (if possible)

## 🔧 Customization

### Add new targets:
Edit `config/targets.js`:

```javascript
export const TARGETS = {
  coordix: {
    name: 'Coordix',
    path: '/tests/Coordix',
  },
  // Add new ones here
};
```

### Adjust thresholds:
Edit `config/metrics.js`:

```javascript
export const METRIC_THRESHOLDS = {
  smoke: {
    'http_req_duration': ['p(95)<50'], // Adjust here
  },
  // ...
};
```

### Modify scenarios:
Edit files in `scenarios/` as needed.

## 📝 Notes

- **Start the test server first** before running load tests
- Results are saved as JSON in the `results/` directory
- Use `npm run compare` to generate comparison tables
- Use `npm run export-csv` to export lightweight CSV files for analysis
- For detailed analysis, import JSONs into Grafana k6 Cloud or other tools
- **Always monitor API CPU/memory during tests** (use `dotnet-counters` or similar)
- The test server exposes three endpoints:
  - `GET /tests/Coordix` - Tests Coordix library
  - `GET /tests/MediatR` - Tests MediatR library
  - `GET /Tests/Wolverine` - Tests Wolverine library

## 🤝 Contributing

When adding new scenarios or metrics, keep the structure consistent to facilitate comparisons.
