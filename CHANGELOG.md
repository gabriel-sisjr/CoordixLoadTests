# Changelog

## Updated Configuration

### URLs and Endpoints

**Base URL:** `https://localhost:7234` (previously `http://localhost:5000`)

**Endpoints:**
- Coordix: `/tests/Coordix` (previously `/coordix/int`)
- MediatR: `/tests/MediatR` (previously `/mediatR/int`)
- Wolverine: `/Tests/Wolverine` (previously `/wolverine/int`)

### SSL/TLS

All scenarios have been configured to accept self-signed SSL certificates (required for HTTPS localhost).

### Updated Files

- `config/targets.js` - Updated URLs and paths
- `scripts/run-scenario.js` - Updated BASE_URL and paths
- All scenarios (`scenarios/*.js`) - Updated default paths and SSL configuration

## Quick Test

To verify everything is working:

```bash
# Quick test against Coordix
node scripts/run-scenario.js smoke --target=coordix
```
