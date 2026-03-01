# ======================================
# STRIAE WORKERS NPM INSTALL SCRIPT
# ======================================
# This script installs npm dependencies for all Striae workers:
# 1. audit-worker
# 2. data-worker
# 3. image-worker
# 4. keys-worker
# 5. pdf-worker
# 6. turnstile-worker
# 7. user-worker

Write-Host "📦 Striae Workers NPM Install Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Get the script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
$WorkersDir = Join-Path $ProjectRoot "workers"

# Check if workers directory exists
if (-not (Test-Path $WorkersDir)) {
    Write-Host "❌ Error: Workers directory not found at $WorkersDir" -ForegroundColor Red
    exit 1
}

Write-Host "Installing npm dependencies for all workers..." -ForegroundColor Magenta
Write-Host ""

# List of workers
$Workers = @("audit-worker", "data-worker", "image-worker", "keys-worker", "pdf-worker", "turnstile-worker", "user-worker")
$Total = $Workers.Count
$Current = 0

# Install dependencies for each worker
foreach ($Worker in $Workers) {
    $Current++
    $WorkerPath = Join-Path $WorkersDir $Worker
    
    Write-Host "[$Current/$Total] Installing dependencies for $Worker..." -ForegroundColor Yellow
    
    # Check if worker directory exists
    if (-not (Test-Path $WorkerPath)) {
        Write-Host "❌ Warning: Worker directory not found: $WorkerPath" -ForegroundColor Red
        continue
    }
    
    # Check if package.json exists
    $PackageJsonPath = Join-Path $WorkerPath "package.json"
    if (-not (Test-Path $PackageJsonPath)) {
        Write-Host "❌ Warning: package.json not found in $WorkerPath" -ForegroundColor Red
        continue
    }
    
    # Change to worker directory and install dependencies
    Push-Location $WorkerPath
    
    Write-Host "   Running npm install in $WorkerPath..." -ForegroundColor Gray
    
    try {
        & npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully installed dependencies for $Worker" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install dependencies for $Worker" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    } catch {
        Write-Host "❌ Failed to install dependencies for ${Worker}: $($_.Exception.Message)" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host ""
}

# Return to original directory
Set-Location $ProjectRoot

Write-Host "🎉 All worker dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Blue
Write-Host "- Installed dependencies for $Total workers"
Write-Host "- All workers are ready for development/deployment"
Write-Host ""
