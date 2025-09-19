# ===================================
# STRIAE CONFIGURATION SETUP SCRIPT
# ===================================
# This script sets up all configuration files and replaces placeholders
# Run this BEFORE installing worker dependencies to avoid wrangler validation errors

# Colors for output
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Reset = "`e[0m"

Write-Host "${Blue}⚙️  Striae Configuration Setup Script${Reset}"
Write-Host "====================================="

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

# Validate required variables
$required_vars = @(
    "ACCOUNT_ID",
    "SL_API_KEY",
    "USER_DB_AUTH", 
    "R2_KEY_SECRET",
    "IMAGES_API_TOKEN",
    "API_KEY",
    "AUTH_DOMAIN",
    "PROJECT_ID",
    "STORAGE_BUCKET",
    "MESSAGING_SENDER_ID",
    "APP_ID",
    "MEASUREMENT_ID",
    "PAGES_PROJECT_NAME",
    "PAGES_CUSTOM_DOMAIN",
    "KEYS_WORKER_NAME",
    "USER_WORKER_NAME",
    "DATA_WORKER_NAME",
    "IMAGES_WORKER_NAME",
    "TURNSTILE_WORKER_NAME",
    "PDF_WORKER_NAME",
    "KEYS_WORKER_DOMAIN",
    "USER_WORKER_DOMAIN",
    "DATA_WORKER_DOMAIN",
    "IMAGES_WORKER_DOMAIN",
    "TURNSTILE_WORKER_DOMAIN",
    "PDF_WORKER_DOMAIN",
    "BUCKET_NAME",
    "KV_STORE_ID",
    "KEYS_AUTH",
    "ACCOUNT_HASH",
    "API_TOKEN",
    "HMAC_KEY",
    "CFT_PUBLIC_KEY",
    "CFT_SECRET_KEY"
)

Write-Host "${Yellow}🔍 Validating required environment variables...${Reset}"
foreach ($var in $required_vars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "${Red}❌ Error: $var is not set in .env file${Reset}"
        exit 1
    }
}

Write-Host "${Green}✅ All required variables found${Reset}"

# Function to copy example configuration files
function Copy-ExampleConfigs {
    Write-Host ""
    Write-Host "${Blue}📋 Copying example configuration files...${Reset}"
    
    # Copy app configuration files
    Write-Host "${Yellow}  Copying app configuration files...${Reset}"
    
    # Copy app config-example directory to config
    if ((Test-Path "app/config-example") -and (-not (Test-Path "app/config"))) {
        Copy-Item -Path "app/config-example" -Destination "app/config" -Recurse
        Write-Host "${Green}    ✅ app: config directory created from config-example${Reset}"
    } elseif (Test-Path "app/config") {
        Write-Host "${Yellow}    ⚠️  app: config directory already exists, skipping copy${Reset}"
    }
    
    # Copy turnstile keys.json.example to keys.json
    if ((Test-Path "app/components/turnstile/keys.json.example") -and (-not (Test-Path "app/components/turnstile/keys.json"))) {
        Copy-Item -Path "app/components/turnstile/keys.json.example" -Destination "app/components/turnstile/keys.json"
        Write-Host "${Green}    ✅ turnstile: keys.json created from example${Reset}"
    } elseif (Test-Path "app/components/turnstile/keys.json") {
        Write-Host "${Yellow}    ⚠️  turnstile: keys.json already exists, skipping copy${Reset}"
    }
    
    # Copy worker configuration files
    Write-Host "${Yellow}  Copying worker configuration files...${Reset}"
    
    $workers = @("keys-worker", "user-worker", "data-worker", "image-worker", "turnstile-worker", "pdf-worker")
    
    foreach ($worker in $workers) {
        $examplePath = "workers/$worker/wrangler.jsonc.example"
        $configPath = "workers/$worker/wrangler.jsonc"
        
        if ((Test-Path $examplePath) -and (-not (Test-Path $configPath))) {
            Copy-Item -Path $examplePath -Destination $configPath
            Write-Host "${Green}    ✅ $worker`: wrangler.jsonc created from example${Reset}"
        } elseif (Test-Path $configPath) {
            Write-Host "${Yellow}    ⚠️  $worker`: wrangler.jsonc already exists, skipping copy${Reset}"
        }
    }
    
    # Copy main wrangler.toml from example
    if ((Test-Path "wrangler.toml.example") -and (-not (Test-Path "wrangler.toml"))) {
        Copy-Item -Path "wrangler.toml.example" -Destination "wrangler.toml"
        Write-Host "${Green}    ✅ root: wrangler.toml created from example${Reset}"
    } elseif (Test-Path "wrangler.toml") {
        Write-Host "${Yellow}    ⚠️  root: wrangler.toml already exists, skipping copy${Reset}"
    }
    
    Write-Host "${Green}✅ Configuration file copying completed${Reset}"
}

# Copy example configuration files
Copy-ExampleConfigs

# Function to replace variables in configuration files
function Update-WranglerConfigs {
    Write-Host ""
    Write-Host "${Blue}🔧 Updating wrangler configuration files...${Reset}"
    
    # Get environment variables
    $ACCOUNT_ID = [Environment]::GetEnvironmentVariable("ACCOUNT_ID", "Process")
    $PAGES_CUSTOM_DOMAIN = [Environment]::GetEnvironmentVariable("PAGES_CUSTOM_DOMAIN", "Process")
    $PAGES_PROJECT_NAME = [Environment]::GetEnvironmentVariable("PAGES_PROJECT_NAME", "Process")
    $DATA_WORKER_NAME = [Environment]::GetEnvironmentVariable("DATA_WORKER_NAME", "Process")
    $DATA_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("DATA_WORKER_DOMAIN", "Process")
    $BUCKET_NAME = [Environment]::GetEnvironmentVariable("BUCKET_NAME", "Process")
    $IMAGES_WORKER_NAME = [Environment]::GetEnvironmentVariable("IMAGES_WORKER_NAME", "Process")
    $IMAGES_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("IMAGES_WORKER_DOMAIN", "Process")
    $KEYS_WORKER_NAME = [Environment]::GetEnvironmentVariable("KEYS_WORKER_NAME", "Process")
    $KEYS_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("KEYS_WORKER_DOMAIN", "Process")
    $PDF_WORKER_NAME = [Environment]::GetEnvironmentVariable("PDF_WORKER_NAME", "Process")
    $PDF_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("PDF_WORKER_DOMAIN", "Process")
    $TURNSTILE_WORKER_NAME = [Environment]::GetEnvironmentVariable("TURNSTILE_WORKER_NAME", "Process")
    $TURNSTILE_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("TURNSTILE_WORKER_DOMAIN", "Process")
    $USER_WORKER_NAME = [Environment]::GetEnvironmentVariable("USER_WORKER_NAME", "Process")
    $USER_WORKER_DOMAIN = [Environment]::GetEnvironmentVariable("USER_WORKER_DOMAIN", "Process")
    $KV_STORE_ID = [Environment]::GetEnvironmentVariable("KV_STORE_ID", "Process")
    $API_KEY = [Environment]::GetEnvironmentVariable("API_KEY", "Process")
    $AUTH_DOMAIN = [Environment]::GetEnvironmentVariable("AUTH_DOMAIN", "Process")
    $PROJECT_ID = [Environment]::GetEnvironmentVariable("PROJECT_ID", "Process")
    $STORAGE_BUCKET = [Environment]::GetEnvironmentVariable("STORAGE_BUCKET", "Process")
    $MESSAGING_SENDER_ID = [Environment]::GetEnvironmentVariable("MESSAGING_SENDER_ID", "Process")
    $APP_ID = [Environment]::GetEnvironmentVariable("APP_ID", "Process")
    $MEASUREMENT_ID = [Environment]::GetEnvironmentVariable("MEASUREMENT_ID", "Process")
    $KEYS_AUTH = [Environment]::GetEnvironmentVariable("KEYS_AUTH", "Process")
    $CFT_PUBLIC_KEY = [Environment]::GetEnvironmentVariable("CFT_PUBLIC_KEY", "Process")
    
    # Update worker configurations
    $workerConfigs = @(
        @{
            path = "workers/data-worker/wrangler.jsonc"
            name = "data-worker"
            replacements = @{
                '"DATA_WORKER_NAME"' = "`"$DATA_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"DATA_WORKER_DOMAIN"' = "`"$DATA_WORKER_DOMAIN`""
                '"BUCKET_NAME"' = "`"$BUCKET_NAME`""
            }
        },
        @{
            path = "workers/image-worker/wrangler.jsonc"
            name = "image-worker"
            replacements = @{
                '"IMAGES_WORKER_NAME"' = "`"$IMAGES_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"IMAGES_WORKER_DOMAIN"' = "`"$IMAGES_WORKER_DOMAIN`""
            }
        },
        @{
            path = "workers/keys-worker/wrangler.jsonc"
            name = "keys-worker"
            replacements = @{
                '"KEYS_WORKER_NAME"' = "`"$KEYS_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"KEYS_WORKER_DOMAIN"' = "`"$KEYS_WORKER_DOMAIN`""
            }
        },
        @{
            path = "workers/pdf-worker/wrangler.jsonc"
            name = "pdf-worker"
            replacements = @{
                '"PDF_WORKER_NAME"' = "`"$PDF_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"PDF_WORKER_DOMAIN"' = "`"$PDF_WORKER_DOMAIN`""
            }
        },
        @{
            path = "workers/turnstile-worker/wrangler.jsonc"
            name = "turnstile-worker"
            replacements = @{
                '"TURNSTILE_WORKER_NAME"' = "`"$TURNSTILE_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"TURNSTILE_WORKER_DOMAIN"' = "`"$TURNSTILE_WORKER_DOMAIN`""
            }
        },
        @{
            path = "workers/user-worker/wrangler.jsonc"
            name = "user-worker"
            replacements = @{
                '"USER_WORKER_NAME"' = "`"$USER_WORKER_NAME`""
                '"ACCOUNT_ID"' = "`"$ACCOUNT_ID`""
                '"USER_WORKER_DOMAIN"' = "`"$USER_WORKER_DOMAIN`""
                '"KV_STORE_ID"' = "`"$KV_STORE_ID`""
            }
        }
    )
    
    foreach ($config in $workerConfigs) {
        if (Test-Path $config.path) {
            Write-Host "${Yellow}  Updating $($config.name)/wrangler.jsonc...${Reset}"
            $content = Get-Content $config.path -Raw
            foreach ($replacement in $config.replacements.GetEnumerator()) {
                $content = $content -replace [regex]::Escape($replacement.Key), $replacement.Value
            }
            Set-Content -Path $config.path -Value $content -NoNewline
            Write-Host "${Green}    ✅ $($config.name) configuration updated${Reset}"
        }
    }
    
    # Update worker source files (CORS headers)
    $workerSources = @(
        "workers/data-worker/src/data-worker.js",
        "workers/image-worker/src/image-worker.js", 
        "workers/keys-worker/src/keys.js",
        "workers/pdf-worker/src/pdf-worker.js",
        "workers/turnstile-worker/src/turnstile.js",
        "workers/user-worker/src/user-worker.js"
    )
    
    foreach ($sourcePath in $workerSources) {
        if (Test-Path $sourcePath) {
            $workerName = Split-Path (Split-Path $sourcePath) -Leaf
            Write-Host "${Yellow}  Updating $workerName CORS headers...${Reset}"
            $content = Get-Content $sourcePath -Raw
            $content = $content -replace "'PAGES_CUSTOM_DOMAIN'", "'$PAGES_CUSTOM_DOMAIN'"
            
            # Special handling for user-worker with additional URLs
            if ($sourcePath -like "*user-worker*") {
                $content = $content -replace "'DATA_WORKER_DOMAIN'", "'https://$DATA_WORKER_DOMAIN'"
                $content = $content -replace "'IMAGES_WORKER_DOMAIN'", "'https://$IMAGES_WORKER_DOMAIN'"
            }
            
            Set-Content -Path $sourcePath -Value $content -NoNewline
            Write-Host "${Green}    ✅ $workerName CORS headers updated${Reset}"
        }
    }
    
    # Update main wrangler.toml
    if (Test-Path "wrangler.toml") {
        Write-Host "${Yellow}  Updating wrangler.toml...${Reset}"
        $content = Get-Content "wrangler.toml" -Raw
        $content = $content -replace '"PAGES_PROJECT_NAME"', "`"$PAGES_PROJECT_NAME`""
        Set-Content -Path "wrangler.toml" -Value $content -NoNewline
        Write-Host "${Green}    ✅ main wrangler.toml configuration updated${Reset}"
    }
    
    # Update app configuration files
    Write-Host "${Yellow}  Updating app configuration files...${Reset}"
    
    # Update app/config/config.json
    if (Test-Path "app/config/config.json") {
        Write-Host "${Yellow}    Updating app/config/config.json...${Reset}"
        $content = Get-Content "app/config/config.json" -Raw
        $content = $content -replace '"PAGES_CUSTOM_DOMAIN"', "`"$PAGES_CUSTOM_DOMAIN`""
        $content = $content -replace '"DATA_WORKER_CUSTOM_DOMAIN"', "`"https://$DATA_WORKER_DOMAIN`""
        $content = $content -replace '"KEYS_WORKER_CUSTOM_DOMAIN"', "`"https://$KEYS_WORKER_DOMAIN`""
        $content = $content -replace '"IMAGE_WORKER_CUSTOM_DOMAIN"', "`"https://$IMAGES_WORKER_DOMAIN`""
        $content = $content -replace '"USER_WORKER_CUSTOM_DOMAIN"', "`"https://$USER_WORKER_DOMAIN`""
        $content = $content -replace '"PDF_WORKER_CUSTOM_DOMAIN"', "`"https://$PDF_WORKER_DOMAIN`""
        $content = $content -replace '"YOUR_KEYS_AUTH_TOKEN"', "`"$KEYS_AUTH`""
        Set-Content -Path "app/config/config.json" -Value $content -NoNewline
        Write-Host "${Green}      ✅ app config.json updated${Reset}"
    }
    
    # Update app/config/firebase.ts
    if (Test-Path "app/config/firebase.ts") {
        Write-Host "${Yellow}    Updating app/config/firebase.ts...${Reset}"
        $content = Get-Content "app/config/firebase.ts" -Raw
        $content = $content -replace '"YOUR_FIREBASE_API_KEY"', "`"$API_KEY`""
        $content = $content -replace '"YOUR_FIREBASE_AUTH_DOMAIN"', "`"$AUTH_DOMAIN`""
        $content = $content -replace '"YOUR_FIREBASE_PROJECT_ID"', "`"$PROJECT_ID`""
        $content = $content -replace '"YOUR_FIREBASE_STORAGE_BUCKET"', "`"$STORAGE_BUCKET`""
        $content = $content -replace '"YOUR_FIREBASE_MESSAGING_SENDER_ID"', "`"$MESSAGING_SENDER_ID`""
        $content = $content -replace '"YOUR_FIREBASE_APP_ID"', "`"$APP_ID`""
        $content = $content -replace '"YOUR_FIREBASE_MEASUREMENT_ID"', "`"$MEASUREMENT_ID`""
        Set-Content -Path "app/config/firebase.ts" -Value $content -NoNewline
        Write-Host "${Green}      ✅ app firebase.ts updated${Reset}"
    }
    
    # Update app/components/turnstile/keys.json
    if (Test-Path "app/components/turnstile/keys.json") {
        Write-Host "${Yellow}    Updating app/components/turnstile/keys.json...${Reset}"
        $content = Get-Content "app/components/turnstile/keys.json" -Raw
        $content = $content -replace '"insert-your-turnstile-site-key-here"', "`"$CFT_PUBLIC_KEY`""
        $content = $content -replace '"https://turnstile.your-domain.com"', "`"https://$TURNSTILE_WORKER_DOMAIN`""
        Set-Content -Path "app/components/turnstile/keys.json" -Value $content -NoNewline
        Write-Host "${Green}      ✅ turnstile keys.json updated${Reset}"
    }
    
    Write-Host "${Green}✅ All configuration files updated${Reset}"
}

# Update wrangler configurations
Update-WranglerConfigs

Write-Host ""
Write-Host "${Green}🎉 Configuration setup completed!${Reset}"
Write-Host "${Blue}📝 Next Steps:${Reset}"
Write-Host "   1. Install worker dependencies"
Write-Host "   2. Deploy workers"
Write-Host "   3. Deploy worker secrets"
Write-Host "   4. Deploy pages"
Write-Host "   5. Deploy pages secrets"
Write-Host ""
Write-Host "${Green}✨ Ready for deployment!${Reset}"