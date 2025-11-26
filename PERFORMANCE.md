# 🚀 Performance Optimizations

## Problem Solved

k6 JSON files can be **very large** (8GB+ for long tests), causing memory issues when trying to open them.

## Implemented Solutions

### 1. Streaming Processing ✅

Scripts now process files **line by line** instead of loading everything into memory:

- ✅ `compare-results.js` - Uses streaming
- ✅ `export-csv.js` - Uses streaming  
- ✅ `parse-k6-efficient.js` - Optimized parser

### 2. Smart Summary Search

The parser searches for **Summary at the end of the file first** (where it usually is), avoiding processing millions of unnecessary lines.

### 3. CSV Export

CSV files are **much lighter** and easier to open:

```bash
npm run export-csv
```

This generates `*_summary.csv` files that can be opened in Excel, Google Sheets, or any text editor.

## How to Use

### Quick Comparison (Terminal)

```bash
# Compare all scenarios
npm run compare

# Compare a specific scenario
npm run compare --scenario=rampup
```

**Advantage:** No need to open large files, everything is processed via streaming.

### Export to CSV (Open in Excel/Sheets)

```bash
# Export all scenarios
npm run export-csv

# Export a specific scenario
npm run export-csv --scenario=rampup
```

**Advantage:** CSV files are light (a few KB) and easy to open and analyze.

## Memory Comparison

| Method | Memory Used | Time |
|--------|-------------|------|
| **Before** (load everything) | 8GB+ | Very slow / crash |
| **Now** (streaming) | <100MB | Seconds |

## Generated Files

### JSON (k6 original)
- `results/smoke_coordix_*.json` - Complete k6 file (can be large)
- **Don't open directly** if very large!

### CSV (light summary)
- `results/smoke_summary.csv` - Summary in CSV (a few KB)
- **Can open easily** in Excel/Sheets

## Tips

1. **Use `npm run compare`** to see results quickly in terminal
2. **Use `npm run export-csv`** to generate light files for analysis
3. **Don't try to open large JSONs** directly - use scripts
4. **CSV is your friend** - much easier to work with

## Troubleshooting

### Script still slow?

- Check file size: `ls -lh results/*.json`
- If very large (>10GB), consider using `--summary` in k6 to generate smaller files

### Values appear as 0?

- Parser may not be finding Summary
- Verify JSON file is complete (k6 finished normally)
- Try running test again

### Want more details?

- Use `k6 run --out json=results/test.json` with `--summary` for smaller files
- Or use Grafana k6 Cloud for advanced visualization
