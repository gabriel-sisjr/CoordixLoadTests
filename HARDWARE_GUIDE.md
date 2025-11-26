# Hardware Configuration Guide

## Recommended VU Limits by Hardware

### Your Setup: Ryzen 7 5700x (8 cores) + 32GB RAM

**Estimated Capacity:**
- **Comfortable load**: 5,000 - 10,000 VUs
- **Heavy load**: 10,000 - 20,000 VUs
- **Maximum (stress)**: 20,000 - 50,000 VUs (depending on test complexity)

**Why these numbers?**
- 8 cores can handle many concurrent connections efficiently
- 32GB RAM allows for large VU counts (each VU uses ~1-2MB)
- Network bandwidth may become the bottleneck before CPU/RAM

---

## Recommended Configurations for Your Hardware

### Smoke Test
**Default is fine, but you can push more:**
```bash
RATE=100 MAX_VUS=100 DURATION=2m npm run smoke
```
- Light test, your CPU can handle much more
- Good for quick validation

### Ramp-up Test
**Recommended for finding breaking point:**
```bash
START_VUS=100 \
STAGE1_TARGET=500 \
STAGE2_TARGET=2000 \
STAGE3_TARGET=5000 \
STAGE4_TARGET=10000 \
npm run rampup
```
- Start higher, ramp to 10k VUs
- Your hardware can easily handle this

### Load Steady Test
**Recommended for sustained load:**
```bash
STEADY_VUS=5000 DURATION=15m npm run load-steady
```
- 5k VUs constant for 15 minutes
- Good for stability testing
- Can go higher (10k) if needed

### Spike Test
**Recommended for burst testing:**
```bash
SPIKE_VUS=10000 SPIKE_DURATION=120s npm run spike
```
- 10k VUs instant spike
- Tests elasticity under sudden load

### Stress Test
**Recommended for maximum stress:**
```bash
START_VUS=500 \
STAGE1_TARGET=2000 \
STAGE2_TARGET=5000 \
STAGE3_TARGET=10000 \
MAX_VUS=20000 \
npm run stress
```
- Ramp up to 20k VUs
- Find absolute breaking point
- Your CPU/RAM can handle this, network may limit

---

## Performance Tips

### 1. Monitor System Resources
While running tests, monitor:
```bash
# CPU and Memory usage
# Windows: Task Manager
# Linux/Mac: htop or top
```

### 2. Network Considerations
- **Localhost**: Very fast, can push 50k+ VUs
- **LAN**: Depends on network speed (1Gbps = ~100k req/s theoretical)
- **Internet**: Limited by bandwidth and latency

### 3. k6 Resource Usage
- Each VU uses ~1-2MB RAM
- CPU usage scales with request rate, not VU count
- Network I/O is usually the bottleneck

### 4. Optimal Test Strategy
1. **Start conservative**: Use defaults first
2. **Gradually increase**: Find your system's sweet spot
3. **Monitor metrics**: Watch CPU, RAM, network
4. **Push limits**: Use stress test to find maximum

---

## Example: Aggressive Test Suite

For maximum load testing on your hardware:

```bash
# Smoke - quick validation
RATE=200 MAX_VUS=200 npm run smoke

# Ramp-up - find comfort zone
START_VUS=500 STAGE4_TARGET=15000 npm run rampup

# Load steady - sustained high load
STEADY_VUS=10000 DURATION=20m npm run load-steady

# Spike - extreme burst
SPIKE_VUS=20000 SPIKE_DURATION=180s npm run spike

# Stress - absolute maximum
MAX_VUS=50000 npm run stress
```

---

## Warning Signs

**Reduce VU count if you see:**
- CPU usage > 90% sustained
- RAM usage > 24GB (leave headroom)
- Network saturation
- High latency in k6 itself (not just API)
- System becoming unresponsive

**Your hardware can handle:**
- ✅ 10k VUs comfortably
- ✅ 20k VUs for stress tests
- ✅ 50k VUs for short bursts (if network allows)

---

## Distributed Testing (k6 Cloud)

For even higher loads, consider:
- **k6 Cloud**: Distributed testing across multiple machines
- **k6 Operator**: Kubernetes-based distributed testing
- **Multiple local instances**: Run k6 on multiple machines

Your single machine is powerful, but distributed testing can push millions of VUs.

