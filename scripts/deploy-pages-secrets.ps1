# ======================================
# STRIAE PAGES SECRETS DEPLOYMENT SCRIPT
# ======================================
# This script deploys environment variables to Cloudflare Pages
# Run this AFTER the Pages project has been deployed

# Colors for output
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Reset = "`e[0m"

Write-Host "${Blue}📄 Striae Pages Environment Variables Deployment Script${Reset}"
Write-Host "==========================================================="

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "${Red}❌ Error: .env file not found!${Reset}"
    Write-Host "Please copy .env.example to .env and fill in your values."
    exit 1
}

Write-Host "${Yellow}📖 Loading environment variables from .env...${Reset}"

# Read .env file and set environment variables
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#].*?)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Pages-specific environment variables
$pagesVars = @("SL_API_KEY")

Write-Host "${Yellow}🔍 Validating Pages environment variables...${Reset}"
foreach ($var in $pagesVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrEmpty($value)) {
        Write-Host "${Red}❌ Error: $var is not set in .env file${Reset}"
        exit 1
    }
}

Write-Host "${Green}✅ All Pages variables found${Reset}"

# Function to get the project name from wrangler.toml
function Get-PagesProjectName {
    if (Test-Path "wrangler.toml") {
        $content = Get-Content "wrangler.toml"
        foreach ($line in $content) {
            if ($line -match '^name\s*=\s*["\x27]([^"\x27]*)["\x27]') {
                return $matches[1]
            }
        }
    }
    return ""
}

# Get the Pages project name
Write-Host "${Yellow}🔍 Detecting Pages project name...${Reset}"
$projectName = Get-PagesProjectName

if ([string]::IsNullOrEmpty($projectName)) {
    Write-Host "${Red}❌ Error: Could not determine Pages project name from wrangler.toml${Reset}"
    Write-Host "${Yellow}   Please ensure wrangler.toml exists and has a 'name' field configured.${Reset}"
    exit 1
}

Write-Host "${Yellow}  Using Pages project: $projectName${Reset}"

# Deploy secrets to Cloudflare Pages
Write-Host ""
Write-Host "${Blue}🔐 Deploying secrets to Cloudflare Pages...${Reset}"

# Function to set Pages environment variables
function Set-PagesEnv {
    param(
        [string]$VarName,
        [string]$ProjectName
    )
    
    $varValue = [Environment]::GetEnvironmentVariable($VarName, "Process")
    
    Write-Host "${Yellow}  Setting $VarName...${Reset}"
    
    # Use wrangler pages secret put for environment variables
    $varValue | wrangler pages secret put $VarName --project-name $ProjectName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "${Red}❌ Failed to set $VarName for Pages project $ProjectName${Reset}"
        return $false
    }
    return $true
}

# Set each Pages environment variable
$success = $true
foreach ($var in $pagesVars) {
    if (-not (Set-PagesEnv -VarName $var -ProjectName $projectName)) {
        $success = $false
        break
    }
}

if (-not $success) {
    Write-Host "${Red}❌ Failed to deploy Pages secrets${Reset}"
    exit 1
}

Write-Host ""
Write-Host "${Green}🎉 Pages secrets deployment completed!${Reset}"

Write-Host ""
Write-Host "${Yellow}📝 Variables deployed to Pages project '$projectName':${Reset}"
foreach ($var in $pagesVars) {
    Write-Host "   ✅ $var"
}

Write-Host ""
Write-Host "${Blue}💡 Additional Notes:${Reset}"
Write-Host "   - These variables are now available in your Remix application"
Write-Host "   - You can verify them in the Cloudflare Pages dashboard"
Write-Host "   - For manual deployment, use: wrangler pages secret put VARIABLE_NAME --project-name $projectName"

Write-Host ""
Write-Host "${Green}✨ Pages environment setup complete!${Reset}"
