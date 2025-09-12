# ================================
# STRIAE ENVIRONMENT SETUP SCRIPT (PowerShell)
# ================================
# This script helps deploy environment variables to all Cloudflare Workers
# Make sure you have wrangler CLI installed and authenticated

param(
    [switch]$WhatIf,
    [switch]$Help
)

if ($Help) {
    Write-Host "🚀 Striae Environment Variables Deployment Script" -ForegroundColor Blue
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\deploy-env.ps1           # Deploy all environment variables"
    Write-Host "  .\deploy-env.ps1 -WhatIf   # Show what would be deployed without actually doing it"
    Write-Host "  .\deploy-env.ps1 -Help     # Show this help message"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  - wrangler CLI installed and authenticated"
    Write-Host "  - .env file with all required variables"
    exit 0
}

Write-Host "🚀 Striae Environment Variables Deployment Script" -ForegroundColor Blue
Write-Host "=================================================="

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and fill in your values."
    exit 1
}

# Load environment variables from .env file
Write-Host "📖 Loading environment variables from .env..." -ForegroundColor Yellow

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]*?)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($name -and $value -and $value -ne "your_*_here") {
            $envVars[$name] = $value
        }
    }
}

# Validate required variables
$requiredVars = @(
    "ACCOUNT_ID",
    "SL_API_KEY",
    "KEYS_AUTH",
    "USER_DB_AUTH",
    "R2_KEY_SECRET",
    "ACCOUNT_HASH",
    "IMAGES_API_TOKEN",
    "INFINITY_ADMIN_TOKEN",
    "API_TOKEN",
    "CFT_SECRET_KEY",
    "HMAC_KEY"
)

Write-Host "🔍 Validating required environment variables..." -ForegroundColor Yellow
$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or -not $envVars[$var]) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Error: Missing required variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "✅ All required variables found" -ForegroundColor Green

# Function to set worker secrets
function Set-WorkerSecrets {
    param(
        [string]$WorkerName,
        [string]$WorkerPath,
        [string[]]$Secrets
    )
    
    Write-Host ""
    Write-Host "🔧 Setting secrets for $WorkerName..." -ForegroundColor Blue
    
    # Check if worker has a wrangler configuration file
    $wranglerJsonc = Join-Path $WorkerPath "wrangler.jsonc"
    $wranglerToml = Join-Path $WorkerPath "wrangler.toml"
    
    if (-not (Test-Path $wranglerJsonc) -and -not (Test-Path $wranglerToml)) {
        Write-Host "❌ Error: No wrangler configuration found for $WorkerName" -ForegroundColor Red
        Write-Host "   Please copy wrangler.jsonc.example to wrangler.jsonc and configure it first." -ForegroundColor Yellow
        return $false
    }
    
    Push-Location $WorkerPath
    
    # Get the worker name from the configuration file
    $configWorkerName = $null
    if (Test-Path "wrangler.jsonc") {
        $configContent = Get-Content "wrangler.jsonc" -Raw
        if ($configContent -match '"name"\s*:\s*"([^"]*)"') {
            $configWorkerName = $matches[1]
        }
    } elseif (Test-Path "wrangler.toml") {
        $configContent = Get-Content "wrangler.toml" -Raw
        if ($configContent -match 'name\s*=\s*["\x27]([^"\x27]*)["\x27]') {
            $configWorkerName = $matches[1]
        }
    }
    
    if (-not $configWorkerName) {
        Write-Host "❌ Error: Could not determine worker name from configuration" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    Write-Host "  Using worker name: $configWorkerName" -ForegroundColor Yellow
    
    $success = $true
    foreach ($secret in $Secrets) {
        if ($envVars.ContainsKey($secret)) {
            Write-Host "  Setting $secret..." -ForegroundColor Yellow
            if ($WhatIf) {
                Write-Host "    [WhatIf] Would run: echo '***' | wrangler secret put $secret --name $configWorkerName" -ForegroundColor Gray
            } else {
                try {
                    $envVars[$secret] | wrangler secret put $secret --name $configWorkerName
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    ✅ $secret set successfully" -ForegroundColor Green
                    } else {
                        Write-Host "    ❌ Failed to set $secret" -ForegroundColor Red
                        $success = $false
                    }
                } catch {
                    Write-Host "    ❌ Error setting $secret : $_" -ForegroundColor Red
                    $success = $false
                }
            }
        } else {
            Write-Host "    ⚠️ $secret not found in .env" -ForegroundColor Yellow
        }
    }
    
    Pop-Location
    if ($success) {
        Write-Host "✅ $WorkerName secrets configured" -ForegroundColor Green
    } else {
        Write-Host "❌ Some secrets failed to configure for $WorkerName" -ForegroundColor Red
    }
    return $success
}

# Deploy secrets to each worker
Write-Host ""
Write-Host "🔐 Deploying secrets to workers..." -ForegroundColor Blue

if ($WhatIf) {
    Write-Host "🔍 WhatIf mode: Showing what would be deployed..." -ForegroundColor Cyan
}

# Check if workers are configured
Write-Host "🔍 Checking worker configurations..." -ForegroundColor Yellow
$workersConfigured = 0
$totalWorkers = 5

Get-ChildItem "workers\*" -Directory | ForEach-Object {
    if ((Test-Path (Join-Path $_.FullName "wrangler.jsonc")) -or (Test-Path (Join-Path $_.FullName "wrangler.toml"))) {
        $workersConfigured++
    }
}

if ($workersConfigured -eq 0) {
    Write-Host "❌ No workers are configured!" -ForegroundColor Red
    Write-Host "   Please copy wrangler.jsonc.example to wrangler.jsonc in each worker directory and configure them." -ForegroundColor Yellow
    Write-Host "   Then run this script again." -ForegroundColor Yellow
    exit 1
} elseif ($workersConfigured -lt $totalWorkers) {
    Write-Host "⚠️  Warning: Only $workersConfigured of $totalWorkers workers are configured." -ForegroundColor Yellow
    Write-Host "   Some workers may not have their secrets deployed." -ForegroundColor Yellow
}

# Keys Worker
if (-not (Set-WorkerSecrets -WorkerName "Keys Worker" -WorkerPath "workers/keys-worker" -Secrets @(
    "KEYS_AUTH", "USER_DB_AUTH", "R2_KEY_SECRET", "ACCOUNT_HASH", "IMAGES_API_TOKEN", "INFINITY_ADMIN_TOKEN"
))) {
    Write-Host "⚠️  Skipping Keys Worker (not configured)" -ForegroundColor Yellow
}

# User Worker  
if (-not (Set-WorkerSecrets -WorkerName "User Worker" -WorkerPath "workers/user-worker" -Secrets @(
    "USER_DB_AUTH"
))) {
    Write-Host "⚠️  Skipping User Worker (not configured)" -ForegroundColor Yellow
}

# Data Worker
if (-not (Set-WorkerSecrets -WorkerName "Data Worker" -WorkerPath "workers/data-worker" -Secrets @(
    "R2_KEY_SECRET"
))) {
    Write-Host "⚠️  Skipping Data Worker (not configured)" -ForegroundColor Yellow
}

# Images Worker
if (-not (Set-WorkerSecrets -WorkerName "Images Worker" -WorkerPath "workers/image-worker" -Secrets @(
    "ACCOUNT_ID", "API_TOKEN", "HMAC_KEY"
))) {
    Write-Host "⚠️  Skipping Images Worker (not configured)" -ForegroundColor Yellow
}

# Turnstile Worker
if (-not (Set-WorkerSecrets -WorkerName "Turnstile Worker" -WorkerPath "workers/turnstile-worker" -Secrets @(
    "CFT_SECRET_KEY"
))) {
    Write-Host "⚠️  Skipping Turnstile Worker (not configured)" -ForegroundColor Yellow
}

# PDF Worker (no secrets needed)
Write-Host ""
Write-Host "📄 PDF Worker: No environment variables needed" -ForegroundColor Blue

if (-not $WhatIf) {
    Write-Host ""
    Write-Host "🎉 Worker secrets deployment completed!" -ForegroundColor Green
}

# Remind about Pages environment variables
Write-Host ""
Write-Host "⚠️  IMPORTANT: Don't forget to set these variables in Cloudflare Pages Dashboard:" -ForegroundColor Yellow
Write-Host "   - SL_API_KEY" -ForegroundColor White

Write-Host ""
Write-Host "⚠️  WORKER CONFIGURATION REMINDERS:" -ForegroundColor Yellow
Write-Host "   - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory" -ForegroundColor White
Write-Host "   - Configure KV namespace ID in workers/user-worker/wrangler.jsonc" -ForegroundColor White
Write-Host "   - Configure R2 bucket name in workers/data-worker/wrangler.jsonc" -ForegroundColor White
Write-Host "   - Update ACCOUNT_ID and custom domains in all worker configurations" -ForegroundColor White

Write-Host ""
Write-Host "📝 For manual deployment, use these commands:" -ForegroundColor Blue
Write-Host "   cd workers\[worker-name]" -ForegroundColor White
Write-Host "   wrangler secret put VARIABLE_NAME --name [worker-name]" -ForegroundColor White

Write-Host ""
Write-Host "✨ Environment setup complete!" -ForegroundColor Green
