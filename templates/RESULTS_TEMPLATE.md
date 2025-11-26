# Load Test Report - Coordix vs MediatR vs Wolverine

**Date:** [DATE]  
**Environment:** [Local/Staging/Production]  
**API Version:** [VERSION]  
**Hardware:** [CPU, RAM, etc]

---

## Executive Summary

| Metric | Coordix | MediatR | Wolverine | Winner |
|--------|---------|---------|-----------|--------|
| **Best p95 (load steady)** | X ms | Y ms | Z ms | [LIB] |
| **Highest RPS (ramp-up)** | X req/s | Y req/s | Z req/s | [LIB] |
| **Lowest CPU (load steady)** | X % | Y % | Z % | [LIB] |
| **Lowest Memory (load steady)** | X MB | Y MB | Z MB | [LIB] |
| **Best Elasticity (spike)** | [NOTE] | [NOTE] | [NOTE] | [LIB] |

**Conclusion:** [2-3 LINE SUMMARY]

---

## 1. Smoke Test

**Objective:** Verify endpoints respond correctly

### Results

| Target | p50 | p95 | p99 | RPS | Errors | Error % | Status |
|--------|-----|-----|-----|-----|--------|---------|--------|
| Coordix | | | | | | | ✅/❌ |
| MediatR | | | | | | | ✅/❌ |
| Wolverine | | | | | | | ✅/❌ |

### Observations
- [Note any anomalies]

---

## 2. Ramp-up Test

**Objective:** Discover breaking point of each library

### Results

| Target | p50 | p95 | p99 | Max RPS | VUs at Breakpoint | Errors | Error % |
|--------|-----|-----|-----|---------|-------------------|--------|---------|
| Coordix | | | | | | | |
| MediatR | | | | | | | |
| Wolverine | | | | | | | |

### Degradation Graph (describe or attach)

**Coordix:**
- Breaking point: ~X VUs
- Symptoms: [p95 increase, 5xx, timeouts]

**MediatR:**
- Breaking point: ~X VUs
- Symptoms: [p95 increase, 5xx, timeouts]

**Wolverine:**
- Breaking point: ~X VUs
- Symptoms: [p95 increase, 5xx, timeouts]

### Observations
- [Note when each library started degrading]

---

## 3. Load Steady Test

**Objective:** Verify behavior under constant load

**Configuration:** X VUs for Y minutes (70% of breaking point)

### Results

| Target | p50 | p95 | p99 | Avg RPS | RPS Std Dev | Errors | Error % | Avg CPU | Avg Memory |
|--------|-----|-----|-----|---------|-------------|--------|---------|---------|------------|
| Coordix | | | | | | | | | |
| MediatR | | | | | | | | | |
| Wolverine | | | | | | | | | |

### Stability

**Coordix:**
- p95 variation: ±X% (stable/unstable)
- RPS variation: ±X req/s

**MediatR:**
- p95 variation: ±X% (stable/unstable)
- RPS variation: ±X req/s

**Wolverine:**
- p95 variation: ±X% (stable/unstable)
- RPS variation: ±X req/s

### Observations
- [Note stability, oscillations, etc]

---

## 4. Spike Test

**Objective:** Measure elasticity for bursts

**Configuration:** 0 → X VUs instantly for Y seconds → 0

### Results

| Target | Normal p95 | Peak p95 | Normal p99 | Peak p99 | Peak Errors | Recovery Time |
|--------|------------|----------|------------|----------|-------------|---------------|
| Coordix | | | | | | |
| MediatR | | | | | | |
| Wolverine | | | | | | |

### Elasticity Analysis

**Coordix:**
- p95 explosion: X ms → Y ms (X% increase)
- Errors during spike: X%
- Time to stabilize: X seconds

**MediatR:**
- p95 explosion: X ms → Y ms (X% increase)
- Errors during spike: X%
- Time to stabilize: X seconds

**Wolverine:**
- p95 explosion: X ms → Y ms (X% increase)
- Errors during spike: X%
- Time to stabilize: X seconds

### Observations
- [How each library handled the burst]

---

## 5. Stress Test

**Objective:** Discover breaking point

**Configuration:** Ramp up to X VUs

### Results

| Target | Max p95 | Max p99 | Max RPS | Max VUs | Total Errors | Final Status |
|--------|---------|---------|---------|---------|--------------|--------------|
| Coordix | | | | | | [Working/Broken] |
| MediatR | | | | | | [Working/Broken] |
| Wolverine | | | | | | [Working/Broken] |

### Breaking Point

**Coordix:**
- Broke at: ~X VUs
- Symptoms: [5xx, timeouts, crash, etc]

**MediatR:**
- Broke at: ~X VUs
- Symptoms: [5xx, timeouts, crash, etc]

**Wolverine:**
- Broke at: ~X VUs
- Symptoms: [5xx, timeouts, crash, etc]

### Observations
- [Which library handled more load]

---

## 6. Resource Analysis (CPU/Memory/GC)

### Load Steady (constant load)

| Target | Avg CPU | Peak CPU | Avg Memory | Peak Memory | GC Gen0 | GC Gen1 | GC Gen2 |
|--------|---------|----------|------------|-------------|---------|---------|---------|
| Coordix | | | | | | | |
| MediatR | | | | | | | |
| Wolverine | | | | | | | |

### Observations
- [Which library uses more resources]
- [GC patterns]
- [Memory leaks?]

---

## 7. Conclusions and Recommendations

### Performance
- **Latency:** [Which library has best latency and when]
- **Throughput:** [Which library has highest throughput]
- **Stability:** [Which library is most stable]

### Resources
- **CPU:** [Which library uses less CPU]
- **Memory:** [Which library uses less memory]
- **GC:** [Which library has less GC pressure]

### Elasticity
- **Bursts:** [Which library handles spikes better]
- **Recovery:** [Which library recovers faster]

### Final Recommendation

**For production use, I recommend:** [LIB]

**Reasons:**
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**Trade-offs:**
- [What you gain]
- [What you lose]

---

## Attachments

- [ ] Result JSON files (`results/`)
- [ ] CPU/memory graphs (if collected)
- [ ] API logs during tests
- [ ] Exact configuration used (VUs, duration, etc)

---

## Additional Notes

[Any additional observations that don't fit in the sections above]
