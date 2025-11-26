# 🪟 Windows Usage Guide

## Compatibility

✅ **Node.js scripts work on Windows:**
- `compare-results.js` ✅
- `export-csv.js` ✅
- `run-scenario.js` ✅
- `run-all-scenarios.js` ✅
- `parse-k6-efficient.js` ✅

⚠️ **Shell scripts don't work on Windows:**
- `monitor-host.sh` ❌ (use `monitor-host-dotnet.ps1`)

## Prerequisites

### 1. Node.js installed
```powershell
# Verify installation
node --version
npm --version
```

### 2. k6 installed
```powershell
# Windows (using Chocolatey)
choco install k6

# Or download manually from: https://k6.io/docs/getting-started/installation/
# Add to system PATH

# Verify installation
k6 version
```

### 3. PowerShell (comes with Windows)
```powershell
# Verify version
$PSVersionTable.PSVersion
```

## How to Use

### Run Tests

```powershell
# Smoke test
npm run smoke

# Or directly
node scripts\run-scenario.js smoke

# Test a specific library
node scripts\run-scenario.js smoke --target=coordix
```

### Compare Results

```powershell
# Compare all scenarios
npm run compare

# Compare a specific scenario
node scripts\compare-results.js --scenario=smoke
```

### Export to CSV

```powershell
# Export all scenarios
npm run export-csv

# Export a specific scenario
node scripts\export-csv.js --scenario=smoke
```

## Host Monitoring (Windows)

Use the PowerShell script:

```powershell
# In a separate terminal, while tests run
.\scripts\monitor-host-dotnet.ps1 -ProcessName "dotnet" -OutputFile "results\host_metrics.csv"
```

## Differences from Linux/macOS

### File Paths
- ✅ Scripts use `path.join()` which works on both systems
- ✅ Paths are handled automatically

### Command Execution
- ✅ `spawn('k6', ...)` works on Windows if k6 is in PATH
- ✅ All Node.js commands are cross-platform

### Environment Variables
```powershell
# Windows PowerShell
$env:BASE_URL="https://localhost:7234"
npm run smoke

# Windows CMD
set BASE_URL=https://localhost:7234
npm run smoke
```

## Troubleshooting

### k6 not found

```powershell
# Verify it's in PATH
k6 version

# If it doesn't work, add to PATH:
# 1. Download k6 from https://k6.io/docs/getting-started/installation/
# 2. Extract to a folder (e.g., C:\k6)
# 3. Add C:\k6 to system PATH
```

### Error running scripts

```powershell
# If permission error, run as:
node scripts\run-scenario.js smoke

# Instead of:
.\scripts\run-scenario.js smoke
```

### Problems with npm scripts

```powershell
# If npm run doesn't work, run directly:
node scripts\compare-results.js
node scripts\export-csv.js
```

### Paths with spaces

If there are spaces in project path:
```powershell
# Use quotes:
cd "C:\Users\My Name\Desktop\CoordixLoadTests"
npm run smoke
```

## Complete Example

```powershell
# 1. Navigate to project
cd C:\Users\YourName\Desktop\CoordixLoadTests

# 2. Verify installations
node --version
k6 version

# 3. Run smoke test
npm run smoke

# 4. Compare results
npm run compare

# 5. Export CSV
npm run export-csv

# 6. Open CSV in Excel
start results\smoke_summary.csv
```

## Important Notes

1. **Use PowerShell or CMD** - Node.js scripts work in both
2. **k6 must be in PATH** - Otherwise, adjust scripts to use full path
3. **Use backslashes or forward slashes** - `path.join()` handles automatically
4. **.sh scripts don't work** - Use PowerShell for monitoring

## Support

If you encounter Windows-specific issues, check:
- Node.js version (recommended: 16+)
- k6 installed and in PATH
- PowerShell script execution permissions (if needed)
