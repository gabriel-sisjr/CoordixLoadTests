# Setup Guide

Complete guide to set up and run the load testing benchmark.

## Requirements

- **Node.js** 16+ (for running test scripts)
- **k6** (load testing tool)
- **.NET 8.0 SDK** (for running the test server)
- **Docker** (optional, for containerized server)

## Step-by-Step Setup

### 1. Install k6

#### macOS
```bash
brew install k6
```

#### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows
```powershell
choco install k6
```

Verify installation:
```bash
k6 version
```

### 2. Install .NET 8.0 SDK

Download and install from: https://dotnet.microsoft.com/download/dotnet/8.0

Verify installation:
```bash
dotnet --version
```

### 3. Set Up the Test Server

#### Option A: Run Locally

```bash
# Navigate to the API project
cd AdvancedSample/src/AdvancedSample.API

# Restore NuGet packages
dotnet restore

# Run the server
dotnet run
```

The server will start at:
- HTTPS: `https://localhost:7234`
- HTTP: `http://localhost:5101`

#### Option B: Run with Docker

```bash
# Navigate to the API project
cd AdvancedSample/src/AdvancedSample.API

# Build the Docker image
docker build -t advancedsample-api .

# Run the container
docker run -p 7234:8080 -p 5101:8081 advancedsample-api
```

### 4. Verify Server is Running

Open your browser and navigate to:
- Swagger UI: `https://localhost:7234/swagger`
- Or test an endpoint: `https://localhost:7234/tests/Coordix`

You should see a response (likely `1` or similar).

### 5. Install Node.js Dependencies

```bash
npm install
```

This installs required dependencies including `dotenv` for environment variable management.

### 6. Configure Environment Variables

The project uses a `.env` file to manage configuration. A template file `.env.example` is provided.

**To set up your environment:**

```bash
# Copy the example file to create your .env
cp .env.example .env  # Linux/Mac
copy .env.example .env  # Windows
```

**Edit `.env` to customize:**

- `BASE_URL`: The base URL of your API (default: `https://localhost:7234`)
- Test scenario parameters (VUs, durations, rates, etc.)

All environment variables are optional and have sensible defaults. The `.env` file is automatically loaded by the test scripts.

**Note:** The `.env` file is gitignored and won't be committed to the repository.

### 7. Run Your First Test

In a **new terminal** (keep the server running):

```bash
# Quick smoke test
npm run smoke

# Or run directly
node scripts/run-scenario.js smoke --target=coordix
```

## Troubleshooting

### Server won't start

**Port already in use:**
```bash
# Check what's using the port
lsof -i :7234  # macOS/Linux
netstat -ano | findstr :7234  # Windows

# Kill the process or change the port in launchSettings.json
```

**SSL certificate issues:**
- The server uses HTTPS with a development certificate
- Browsers may warn about self-signed certificates (this is normal)
- k6 scripts are configured to skip SSL verification for localhost

### k6 not found

Make sure k6 is in your PATH:
```bash
which k6  # macOS/Linux
where k6  # Windows
```

### Tests fail with connection errors

1. Verify server is running: `curl -k https://localhost:7234/tests/Coordix`
2. Check BASE_URL matches server URL
3. Ensure firewall isn't blocking the connection

### .NET restore fails

```bash
# Clear NuGet cache
dotnet nuget locals all --clear

# Restore again
dotnet restore
```

## Next Steps

Once setup is complete:
1. Read [QUICKSTART.md](QUICKSTART.md) for quick test execution
2. Read [README.md](README.md) for detailed documentation
3. Check [EXAMPLES.md](EXAMPLES.md) for usage examples

## Development Mode

For development, you can run the server with hot reload:

```bash
cd AdvancedSample/src/AdvancedSample.API
dotnet watch run
```

This will automatically restart the server when code changes.

