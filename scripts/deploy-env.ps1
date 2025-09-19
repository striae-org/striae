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
    # Core Cloudflare Configuration
    "ACCOUNT_ID",
    
    # Shared Authentication & Storage
    "SL_API_KEY",
    "USER_DB_AUTH",
    "R2_KEY_SECRET",
    "IMAGES_API_TOKEN",
    
    # Firebase Auth Configuration
    "API_KEY",
    "AUTH_DOMAIN",
    "PROJECT_ID",
    "STORAGE_BUCKET",
    "MESSAGING_SENDER_ID",
    "APP_ID",
    "MEASUREMENT_ID",
    
    # Pages Configuration
    "PAGES_PROJECT_NAME",
    "PAGES_CUSTOM_DOMAIN",
    
    # Worker Names (required for config replacement)
    "KEYS_WORKER_NAME",
    "USER_WORKER_NAME",
    "DATA_WORKER_NAME",
    "IMAGES_WORKER_NAME",
    "TURNSTILE_WORKER_NAME",
    "PDF_WORKER_NAME",
    
    # Worker Domains (required for config replacement)
    "KEYS_WORKER_DOMAIN",
    "USER_WORKER_DOMAIN",
    "DATA_WORKER_DOMAIN",
    "IMAGES_WORKER_DOMAIN",
    "TURNSTILE_WORKER_DOMAIN",
    "PDF_WORKER_DOMAIN",
    
    # Storage Configuration (required for config replacement)
    "BUCKET_NAME",
    "KV_STORE_ID",
    
    # Worker-Specific Secrets (required for deployment)
    "KEYS_AUTH",
    "ACCOUNT_HASH",
    "API_TOKEN",
    "HMAC_KEY",
    "CFT_PUBLIC_KEY",
    "CFT_SECRET_KEY"
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

# Function to copy example configuration files
function Copy-ExampleConfigs {
    Write-Host ""
    Write-Host "📋 Copying example configuration files..." -ForegroundColor Blue
    
    # Navigate to each worker directory and copy the example file
    Push-Location "workers\keys-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ keys-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  keys-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location

    Push-Location "workers\user-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ user-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  user-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location

    Push-Location "workers\data-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ data-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  data-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location

    Push-Location "workers\image-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ image-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  image-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location

    Push-Location "workers\turnstile-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ turnstile-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  turnstile-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location

    Push-Location "workers\pdf-worker"
    if ((Test-Path "wrangler.jsonc.example") -and (-not (Test-Path "wrangler.jsonc"))) {
        Copy-Item "wrangler.jsonc.example" "wrangler.jsonc"
        Write-Host "    ✅ pdf-worker: wrangler.jsonc created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.jsonc") {
        Write-Host "    ⚠️  pdf-worker: wrangler.jsonc already exists, skipping copy" -ForegroundColor Yellow
    }
    Pop-Location
    
    # Copy main wrangler.toml from example
    if ((Test-Path "wrangler.toml.example") -and (-not (Test-Path "wrangler.toml"))) {
        Copy-Item "wrangler.toml.example" "wrangler.toml"
        Write-Host "    ✅ root: wrangler.toml created from example" -ForegroundColor Green
    } elseif (Test-Path "wrangler.toml") {
        Write-Host "    ⚠️  root: wrangler.toml already exists, skipping copy" -ForegroundColor Yellow
    }
    
    Write-Host "✅ Configuration file copying completed" -ForegroundColor Green
}

# Copy example configuration files
Copy-ExampleConfigs

# Function to update wrangler configuration files
function Update-WranglerConfigs {
    Write-Host ""
    Write-Host "🔧 Updating wrangler configuration files..." -ForegroundColor Blue
    
    # Data Worker
    $dataWorkerConfig = "workers\data-worker\wrangler.jsonc"
    if (Test-Path $dataWorkerConfig) {
        Write-Host "  Updating data-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $dataWorkerConfig -Raw
        $content = $content -replace '"DATA_WORKER_NAME"', "`"$($envVars['DATA_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"DATA_WORKER_DOMAIN"', "`"$($envVars['DATA_WORKER_DOMAIN'])`""
        $content = $content -replace '"BUCKET_NAME"', "`"$($envVars['BUCKET_NAME'])`""
        Set-Content $dataWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ data-worker configuration updated" -ForegroundColor Green
    }
    
    # Update data-worker source file CORS headers only
    $dataWorkerSource = "workers\data-worker\src\data-worker.js"
    if (Test-Path $dataWorkerSource) {
        Write-Host "  Updating data-worker CORS headers..." -ForegroundColor Yellow
        $content = Get-Content $dataWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        Set-Content $dataWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ data-worker CORS headers updated" -ForegroundColor Green
    }
    
    # Image Worker
    $imageWorkerConfig = "workers\image-worker\wrangler.jsonc"
    if (Test-Path $imageWorkerConfig) {
        Write-Host "  Updating image-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $imageWorkerConfig -Raw
        $content = $content -replace '"IMAGES_WORKER_NAME"', "`"$($envVars['IMAGES_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"IMAGES_WORKER_DOMAIN"', "`"$($envVars['IMAGES_WORKER_DOMAIN'])`""
        Set-Content $imageWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ image-worker configuration updated" -ForegroundColor Green
    }
    
    # Update image-worker source file CORS headers only
    $imageWorkerSource = "workers\image-worker\src\image-worker.js"
    if (Test-Path $imageWorkerSource) {
        Write-Host "  Updating image-worker CORS headers..." -ForegroundColor Yellow
        $content = Get-Content $imageWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        Set-Content $imageWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ image-worker CORS headers updated" -ForegroundColor Green
    }
    
    # Keys Worker
    $keysWorkerConfig = "workers\keys-worker\wrangler.jsonc"
    if (Test-Path $keysWorkerConfig) {
        Write-Host "  Updating keys-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $keysWorkerConfig -Raw
        $content = $content -replace '"KEYS_WORKER_NAME"', "`"$($envVars['KEYS_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"KEYS_WORKER_DOMAIN"', "`"$($envVars['KEYS_WORKER_DOMAIN'])`""
        Set-Content $keysWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ keys-worker configuration updated" -ForegroundColor Green
    }
    
    # Update keys-worker source file CORS headers only
    $keysWorkerSource = "workers\keys-worker\src\keys.js"
    if (Test-Path $keysWorkerSource) {
        Write-Host "  Updating keys-worker CORS headers..." -ForegroundColor Yellow
        $content = Get-Content $keysWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        Set-Content $keysWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ keys-worker CORS headers updated" -ForegroundColor Green
    }
    
    # PDF Worker
    $pdfWorkerConfig = "workers\pdf-worker\wrangler.jsonc"
    if (Test-Path $pdfWorkerConfig) {
        Write-Host "  Updating pdf-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $pdfWorkerConfig -Raw
        $content = $content -replace '"PDF_WORKER_NAME"', "`"$($envVars['PDF_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"PDF_WORKER_DOMAIN"', "`"$($envVars['PDF_WORKER_DOMAIN'])`""
        Set-Content $pdfWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ pdf-worker configuration updated" -ForegroundColor Green
    }
    
    # Update pdf-worker source file CORS headers only
    $pdfWorkerSource = "workers\pdf-worker\src\pdf-worker.js"
    if (Test-Path $pdfWorkerSource) {
        Write-Host "  Updating pdf-worker CORS headers..." -ForegroundColor Yellow
        $content = Get-Content $pdfWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        Set-Content $pdfWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ pdf-worker CORS headers updated" -ForegroundColor Green
    }
    
    # Turnstile Worker
    $turnstileWorkerConfig = "workers\turnstile-worker\wrangler.jsonc"
    if (Test-Path $turnstileWorkerConfig) {
        Write-Host "  Updating turnstile-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $turnstileWorkerConfig -Raw
        $content = $content -replace '"TURNSTILE_WORKER_NAME"', "`"$($envVars['TURNSTILE_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"TURNSTILE_WORKER_DOMAIN"', "`"$($envVars['TURNSTILE_WORKER_DOMAIN'])`""
        Set-Content $turnstileWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ turnstile-worker configuration updated" -ForegroundColor Green
    }
    
    # Update turnstile-worker source file CORS headers only
    $turnstileWorkerSource = "workers\turnstile-worker\src\turnstile.js"
    if (Test-Path $turnstileWorkerSource) {
        Write-Host "  Updating turnstile-worker CORS headers..." -ForegroundColor Yellow
        $content = Get-Content $turnstileWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        Set-Content $turnstileWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ turnstile-worker CORS headers updated" -ForegroundColor Green
    }
    
    # User Worker
    $userWorkerConfig = "workers\user-worker\wrangler.jsonc"
    if (Test-Path $userWorkerConfig) {
        Write-Host "  Updating user-worker/wrangler.jsonc..." -ForegroundColor Yellow
        $content = Get-Content $userWorkerConfig -Raw
        $content = $content -replace '"USER_WORKER_NAME"', "`"$($envVars['USER_WORKER_NAME'])`""
        $content = $content -replace '"ACCOUNT_ID"', "`"$($envVars['ACCOUNT_ID'])`""
        $content = $content -replace '"USER_WORKER_DOMAIN"', "`"$($envVars['USER_WORKER_DOMAIN'])`""
        $content = $content -replace '"KV_STORE_ID"', "`"$($envVars['KV_STORE_ID'])`""
        Set-Content $userWorkerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ user-worker configuration updated" -ForegroundColor Green
    }
    
    # Update user-worker source file CORS headers and worker URLs only
    $userWorkerSource = "workers\user-worker\src\user-worker.js"
    if (Test-Path $userWorkerSource) {
        Write-Host "  Updating user-worker CORS headers and worker URLs..." -ForegroundColor Yellow
        $content = Get-Content $userWorkerSource -Raw
        $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$($envVars['PAGES_CUSTOM_DOMAIN'])'"
        $content = $content -replace "'DATA_WORKER_DOMAIN'", "'https://$($envVars['DATA_WORKER_DOMAIN'])'"
        $content = $content -replace "'IMAGES_WORKER_DOMAIN'", "'https://$($envVars['IMAGES_WORKER_DOMAIN'])'"
        Set-Content $userWorkerSource -Value $content -Encoding UTF8
        Write-Host "    ✅ user-worker CORS headers and worker URLs updated" -ForegroundColor Green
    }
    
    # Main wrangler.toml
    $mainWranglerConfig = "wrangler.toml"
    if (Test-Path $mainWranglerConfig) {
        Write-Host "  Updating wrangler.toml..." -ForegroundColor Yellow
        $content = Get-Content $mainWranglerConfig -Raw
        $content = $content -replace '"PAGES_PROJECT_NAME"', "`"$($envVars['PAGES_PROJECT_NAME'])`""
        Set-Content $mainWranglerConfig -Value $content -Encoding UTF8
        Write-Host "    ✅ main wrangler.toml configuration updated" -ForegroundColor Green
    }
    
    Write-Host "✅ All wrangler configuration files updated" -ForegroundColor Green
}

# Update wrangler configurations
Update-WranglerConfigs

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
    "KEYS_AUTH", "USER_DB_AUTH", "R2_KEY_SECRET", "ACCOUNT_HASH", "IMAGES_API_TOKEN"
))) {
    Write-Host "⚠️  Skipping Keys Worker (not configured)" -ForegroundColor Yellow
}

# User Worker  
if (-not (Set-WorkerSecrets -WorkerName "User Worker" -WorkerPath "workers/user-worker" -Secrets @(
    "USER_DB_AUTH", "SL_API_KEY", "R2_KEY_SECRET", "IMAGES_API_TOKEN"
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
