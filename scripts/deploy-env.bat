@echo off
REM ================================
REM STRIAE ENVIRONMENT SETUP SCRIPT (Windows)
REM ================================
REM This script helps deploy environment variables to all Cloudflare Workers
REM Make sure you have wrangler CLI installed and authenticated

echo 🚀 Striae Environment Variables Deployment Script (Windows)
echo ==================================================

REM Check if .env file exists
if not exist ".env" (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

echo 📖 Loading environment variables from .env...

REM Note: Windows batch doesn't have a direct equivalent to source
REM You'll need to set variables manually or use PowerShell
echo.
echo ⚠️  IMPORTANT: This batch file provides the commands to run manually.
echo For automated deployment, use PowerShell or WSL with the bash script.
echo.

echo.
echo 📋 STEP 1: Copy example configuration files
echo Run these commands first (or use PowerShell script for automation):
echo.
echo cd workers\keys-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\user-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\data-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\image-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\turnstile-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\pdf-worker
echo copy wrangler.jsonc.example wrangler.jsonc
echo cd ..\..
echo.
echo REM Copy main wrangler.toml
echo copy wrangler.toml.example wrangler.toml
echo.

echo.
echo ⚠️  IMPORTANT: Before running these commands:
echo    1. Run STEP 1 commands above to copy example files
echo    2. Use PowerShell script (deploy-env.ps1) for automated configuration updates
echo    3. Manually replace variables in wrangler.jsonc files with values from .env:
echo       - Replace "insert-your-*" placeholders with actual values
echo       - Replace "YOUR_ACCOUNT_ID" with your Cloudflare account ID  
echo       - Replace domain placeholders with your custom domains
echo       - Replace bucket/KV placeholders with your resource IDs
echo    4. Use the correct worker name from your configuration (not the hardcoded names below)
echo.

echo 🔧 AUTOMATED CONFIGURATION REPLACEMENT:
echo For automated configuration updates, use:
echo    PowerShell: .\deploy-env.ps1
echo    Bash/WSL:   ./deploy-env.sh
echo These scripts will automatically replace variables in wrangler.jsonc files.
echo.

echo 🔐 Manual commands to deploy secrets to workers:
echo.
echo NOTE: Replace [worker-name] with the actual name from your wrangler.jsonc file
echo.

echo === Keys Worker ===
echo cd workers\keys-worker
echo wrangler secret put KEYS_AUTH --name [worker-name]
echo wrangler secret put USER_DB_AUTH --name [worker-name]
echo wrangler secret put R2_KEY_SECRET --name [worker-name]
echo wrangler secret put ACCOUNT_HASH --name [worker-name]
echo wrangler secret put IMAGES_API_TOKEN --name [worker-name]
echo cd ..\..
echo.

echo === User Worker ===
echo cd workers\user-worker
echo wrangler secret put USER_DB_AUTH --name [worker-name]
echo wrangler secret put SL_API_KEY --name [worker-name]
echo wrangler secret put R2_KEY_SECRET --name [worker-name]
echo wrangler secret put IMAGES_API_TOKEN --name [worker-name]
echo cd ..\..
echo.

echo === Data Worker ===
echo cd workers\data-worker
echo wrangler secret put R2_KEY_SECRET --name [worker-name]
echo cd ..\..
echo.

echo === Images Worker ===
echo cd workers\image-worker
echo wrangler secret put ACCOUNT_ID --name [worker-name]
echo wrangler secret put API_TOKEN --name [worker-name]
echo wrangler secret put HMAC_KEY --name [worker-name]
echo cd ..\..
echo.

echo === Turnstile Worker ===
echo cd workers\turnstile-worker
echo wrangler secret put CFT_SECRET_KEY --name [worker-name]
echo cd ..\..
echo.

echo 📄 PDF Worker: No environment variables needed
echo.

echo ⚠️  IMPORTANT: Don't forget to set these variables in Cloudflare Pages Dashboard:
echo    - SL_API_KEY
echo.

echo ⚠️  WORKER CONFIGURATION REMINDERS:
echo    - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory
echo    - Configure KV namespace ID in workers\user-worker\wrangler.jsonc
echo    - Configure R2 bucket name in workers\data-worker\wrangler.jsonc
echo    - Update ACCOUNT_ID and custom domains in all worker configurations
echo.

echo ✨ Use PowerShell or WSL for automated deployment!
pause
