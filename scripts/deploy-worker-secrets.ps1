# ======================================
# STRIAE WORKER SECRETS DEPLOYMENT SCRIPT  
# ======================================
# This script deploys environment variables/secrets to Cloudflare Workers
# Run this AFTER workers are deployed to avoid deployment errors

# Colors for output
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Reset = "`e[0m"

Write-Host "${Blue}🔐 Striae Worker Secrets Deployment Script${Reset}"
Write-Host "=========================================="

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "${Red}❌ Error: .env file not found!${Reset}"
    Write-Host "Please copy .env.example to .env and fill in your values."
    exit 1
}

# Load environment variables from .env
Write-Host "${Yellow}📖 Loading environment variables from .env...${Reset}"
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]*)\s*=\s*(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Remove quotes if present
        if ($value -match "^[`"'](.*)[`"']$") {
            $value = $matches[1]
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Function to set worker secrets
function Set-WorkerSecrets {
    param(
        [string]$WorkerName,
        [string]$WorkerPath,
        [string[]]$Secrets
    )
    
    Write-Host ""
    Write-Host "${Blue}🔧 Setting secrets for $WorkerName...${Reset}"
    
    # Check if worker has a wrangler configuration file
    $jsonConfig = Join-Path $WorkerPath "wrangler.jsonc"
    $tomlConfig = Join-Path $WorkerPath "wrangler.toml"
    
    if (-not (Test-Path $jsonConfig) -and -not (Test-Path $tomlConfig)) {
        Write-Host "${Red}❌ Error: No wrangler configuration found for $WorkerName${Reset}"
        Write-Host "${Yellow}   Please copy wrangler.jsonc.example to wrangler.jsonc and configure it first.${Reset}"
        return $false
    }
    
    # Change to worker directory
    $originalLocation = Get-Location
    Set-Location $WorkerPath
    
    try {
        # Get the worker name from the configuration file
        $configWorkerName = $null
        
        if (Test-Path "wrangler.jsonc") {
            $content = Get-Content "wrangler.jsonc" -Raw
            if ($content -match '"name"\s*:\s*"([^"]*)"') {
                $configWorkerName = $matches[1]
            }
        } elseif (Test-Path "wrangler.toml") {
            $content = Get-Content "wrangler.toml" -Raw
            if ($content -match 'name\s*=\s*["\x27]([^"\x27]*)["\x27]') {
                $configWorkerName = $matches[1]
            }
        }
        
        if ([string]::IsNullOrWhiteSpace($configWorkerName)) {
            Write-Host "${Red}❌ Error: Could not determine worker name from configuration${Reset}"
            return $false
        }
        
        Write-Host "${Yellow}  Using worker name: $configWorkerName${Reset}"
        
        foreach ($secret in $Secrets) {
            Write-Host "${Yellow}  Setting $secret...${Reset}"
            $value = [Environment]::GetEnvironmentVariable($secret, "Process")
            
            # Create temporary file for the secret value
            $tempFile = [System.IO.Path]::GetTempFileName()
            try {
                # Write value to temp file
                Set-Content -Path $tempFile -Value $value -NoNewline
                
                # Use wrangler with input redirection
                $output = & cmd /c "wrangler secret put $secret --name `"$configWorkerName`" < `"$tempFile`"" 2>&1
                
                if ($LASTEXITCODE -ne 0) {
                    $errorMessage = ($output | Out-String).Trim()
                    Write-Host "${Red}❌ Failed to set $secret for $WorkerName`: $errorMessage${Reset}"
                    return $false
                }
            }
            catch {
                Write-Host "${Red}❌ Failed to set $secret for $WorkerName`: $($_.Exception.Message)${Reset}"
                return $false
            }
            finally {
                # Clean up temp file
                if (Test-Path $tempFile) {
                    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                }
            }
        }
        
        Write-Host "${Green}✅ $WorkerName secrets configured${Reset}"
        return $true
    }
    finally {
        Set-Location $originalLocation
    }
}

# Deploy secrets to each worker
Write-Host ""
Write-Host "${Blue}🔐 Deploying secrets to workers...${Reset}"

# Check if workers are configured
Write-Host "${Yellow}🔍 Checking worker configurations...${Reset}"
$workersConfigured = 0
$totalWorkers = 7

$workerDirs = Get-ChildItem "workers" -Directory
foreach ($workerDir in $workerDirs) {
    $jsonConfig = Join-Path $workerDir.FullName "wrangler.jsonc"
    $tomlConfig = Join-Path $workerDir.FullName "wrangler.toml"
    
    if ((Test-Path $jsonConfig) -or (Test-Path $tomlConfig)) {
        $workersConfigured++
    }
}

if ($workersConfigured -eq 0) {
    Write-Host "${Red}❌ No workers are configured!${Reset}"
    Write-Host "${Yellow}   Please copy wrangler.jsonc.example to wrangler.jsonc in each worker directory and configure them.${Reset}"
    Write-Host "${Yellow}   Then run this script again.${Reset}"
    exit 1
} elseif ($workersConfigured -lt $totalWorkers) {
    Write-Host "${Yellow}⚠️  Warning: Only $workersConfigured of $totalWorkers workers are configured.${Reset}"
    Write-Host "${Yellow}   Some workers may not have their secrets deployed.${Reset}"
}

# Audit Worker
$success = Set-WorkerSecrets "Audit Worker" "workers/audit-worker" @("R2_KEY_SECRET")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping Audit Worker (not configured)${Reset}"
}

# Keys Worker
$success = Set-WorkerSecrets "Keys Worker" "workers/keys-worker" @("KEYS_AUTH", "USER_DB_AUTH", "R2_KEY_SECRET", "ACCOUNT_HASH", "IMAGES_API_TOKEN")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping Keys Worker (not configured)${Reset}"
}

# User Worker
$success = Set-WorkerSecrets "User Worker" "workers/user-worker" @("USER_DB_AUTH", "SL_API_KEY", "R2_KEY_SECRET", "IMAGES_API_TOKEN")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping User Worker (not configured)${Reset}"
}

# Data Worker
$success = Set-WorkerSecrets "Data Worker" "workers/data-worker" @("R2_KEY_SECRET")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping Data Worker (not configured)${Reset}"
}

# Images Worker
$success = Set-WorkerSecrets "Images Worker" "workers/image-worker" @("ACCOUNT_ID", "API_TOKEN", "HMAC_KEY")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping Images Worker (not configured)${Reset}"
}

# Turnstile Worker
$success = Set-WorkerSecrets "Turnstile Worker" "workers/turnstile-worker" @("CFT_SECRET_KEY")
if (-not $success) {
    Write-Host "${Yellow}⚠️  Skipping Turnstile Worker (not configured)${Reset}"
}

# PDF Worker (no secrets needed)
Write-Host ""
Write-Host "${Blue}📄 PDF Worker: No environment variables needed${Reset}"

Write-Host ""
Write-Host "${Green}🎉 Worker secrets deployment completed!${Reset}"

# Remind about Pages environment variables
Write-Host ""
Write-Host "${Yellow}⚠️  IMPORTANT: Don't forget to set these variables in Cloudflare Pages Dashboard:${Reset}"
Write-Host "   - SL_API_KEY"

Write-Host ""
Write-Host "${Yellow}⚠️  WORKER CONFIGURATION REMINDERS:${Reset}"
Write-Host "   - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory"
Write-Host "   - Configure KV namespace ID in workers/user-worker/wrangler.jsonc"
Write-Host "   - Configure R2 bucket name in workers/data-worker/wrangler.jsonc"
Write-Host "   - Configure R2 bucket name in workers/audit-worker/wrangler.jsonc"
Write-Host "   - Update ACCOUNT_ID and custom domains in all worker configurations"

Write-Host ""
Write-Host "${Blue}📝 For manual deployment, use these commands:${Reset}"
Write-Host "   cd workers/[worker-name]"
Write-Host "   wrangler secret put VARIABLE_NAME --name [worker-name]"
Write-Host ""
Write-Host "${Green}✨ Worker secrets deployment complete!${Reset}"