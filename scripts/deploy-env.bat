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

echo 🔍 Required Environment Variables (must be set in .env):
echo.
echo === Core Cloudflare Configuration ===
echo    ACCOUNT_ID
echo.
echo === Shared Authentication ^& Storage ===
echo    SL_API_KEY
echo    USER_DB_AUTH
echo    R2_KEY_SECRET
echo    IMAGES_API_TOKEN
echo.
echo === Firebase Auth Configuration ===
echo    API_KEY
echo    AUTH_DOMAIN
echo    PROJECT_ID
echo    STORAGE_BUCKET
echo    MESSAGING_SENDER_ID
echo    APP_ID
echo    MEASUREMENT_ID
echo.
echo === Pages Configuration ===
echo    PAGES_PROJECT_NAME
echo    PAGES_CUSTOM_DOMAIN
echo.
echo === Worker Names ===
echo    KEYS_WORKER_NAME
echo    USER_WORKER_NAME
echo    DATA_WORKER_NAME
echo    IMAGES_WORKER_NAME
echo    TURNSTILE_WORKER_NAME
echo    PDF_WORKER_NAME
echo.
echo === Worker Domains ===
echo    KEYS_WORKER_DOMAIN
echo    USER_WORKER_DOMAIN
echo    DATA_WORKER_DOMAIN
echo    IMAGES_WORKER_DOMAIN
echo    TURNSTILE_WORKER_DOMAIN
echo    PDF_WORKER_DOMAIN
echo.
echo === Storage Configuration ===
echo    BUCKET_NAME
echo    KV_STORE_ID
echo.
echo === Worker-Specific Secrets ===
echo    KEYS_AUTH
echo    ACCOUNT_HASH
echo    API_TOKEN
echo    HMAC_KEY
echo    CFT_PUBLIC_KEY
echo    CFT_SECRET_KEY
echo.

echo.
echo 📋 STEP 1: Copy example configuration files
echo Run these commands first (or use PowerShell script for automation):
echo.
echo REM Copy app configuration files
echo xcopy app\config-example app\config /E /I
echo copy app\components\turnstile\keys.json.example app\components\turnstile\keys.json
echo.
echo REM Copy worker configuration files
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
echo    4. STEP 2: Update source files with your domains (CORS headers and worker URLs)
echo    5. Use the correct worker name from your configuration (not the hardcoded names below)
echo.

echo � STEP 2: Update worker source file configurations
echo Replace hardcoded placeholders in source files with your actual domains:
echo.
echo === Update CORS Headers in All Workers ===
echo In each worker's src/*.js file, replace 'PAGES_CUSTOM_DOMAIN' with your domain:
echo.
echo workers\data-worker\src\data-worker.js:
echo   Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:    'https://your.custom-domain.com'
echo.
echo workers\image-worker\src\image-worker.js:
echo   Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:    'https://your.custom-domain.com'
echo.
echo workers\keys-worker\src\keys.js:
echo   Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:    'https://your.custom-domain.com'
echo.
echo workers\pdf-worker\src\pdf-worker.js:
echo   Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:    'https://your.custom-domain.com'
echo.
echo workers\turnstile-worker\src\turnstile.js:
echo   Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:    'https://your.custom-domain.com'
echo.
echo === Update Worker URLs in User Worker ===
echo workers\user-worker\src\user-worker.js:
echo   Replace: 'DATA_WORKER_DOMAIN'
echo   With:    'https://your.data-worker-domain.com'
echo.
echo   Replace: 'IMAGES_WORKER_DOMAIN'
echo   With:    'https://your.images-worker-domain.com'
echo.
echo   AND Replace: 'PAGES_CUSTOM_DOMAIN'
echo   With:        'https://your.custom-domain.com'
echo.

echo 📋 STEP 3: Update app configuration files
echo Replace placeholders in app configuration files with your actual values:
echo.
echo === Update app/config/config.json ===
echo   Replace: "PAGES_CUSTOM_DOMAIN"
echo   With:    "https://your.custom-domain.com"
echo.
echo   Replace: "DATA_WORKER_CUSTOM_DOMAIN"
echo   With:    "https://your.data-worker-domain.com"
echo.
echo   Replace: "KEYS_WORKER_CUSTOM_DOMAIN"
echo   With:    "https://your.keys-worker-domain.com"
echo.
echo   Replace: "IMAGE_WORKER_CUSTOM_DOMAIN"
echo   With:    "https://your.images-worker-domain.com"
echo.
echo   Replace: "USER_WORKER_CUSTOM_DOMAIN"
echo   With:    "https://your.user-worker-domain.com"
echo.
echo   Replace: "PDF_WORKER_CUSTOM_DOMAIN"
echo   With:    "https://your.pdf-worker-domain.com"
echo.
echo   Replace: "YOUR_KEYS_AUTH_TOKEN"
echo   With:    "your_keys_auth_token" (from your .env file)
echo.
echo === Update app/config/firebase.ts ===
echo   Replace: "YOUR_FIREBASE_API_KEY"
echo   With:    "your_firebase_api_key" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_AUTH_DOMAIN"
echo   With:    "your_firebase_auth_domain" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_PROJECT_ID"
echo   With:    "your_firebase_project_id" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_STORAGE_BUCKET"
echo   With:    "your_firebase_storage_bucket" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_MESSAGING_SENDER_ID"
echo   With:    "your_firebase_messaging_sender_id" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_APP_ID"
echo   With:    "your_firebase_app_id" (from your .env file)
echo.
echo   Replace: "YOUR_FIREBASE_MEASUREMENT_ID"
echo   With:    "your_firebase_measurement_id" (from your .env file)
echo.
echo === Update app/components/turnstile/keys.json ===
echo   Replace: "insert-your-turnstile-site-key-here"
echo   With:    "your_turnstile_public_key" (from your .env file)
echo.
echo   Replace: "https://turnstile.your-domain.com"
echo   With:    "https://your.turnstile-worker-domain.com"
echo.

echo �🔧 AUTOMATED CONFIGURATION REPLACEMENT:
echo For automated configuration updates, use:
echo    PowerShell: .\deploy-env.ps1
echo    Bash/WSL:   ./deploy-env.sh
echo These scripts will automatically replace variables in both wrangler.jsonc AND source files.
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
