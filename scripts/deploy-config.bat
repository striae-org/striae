@echo off
REM ===================================
REM STRIAE CONFIGURATION SETUP SCRIPT
REM ===================================
REM This script sets up all configuration files and replaces placeholders
REM Run this BEFORE installing worker dependencies to avoid wrangler validation errors

setlocal enabledelayedexpansion

echo [94m⚙️  Striae Configuration Setup Script[0m
echo =====================================

REM Check if .env file exists
if not exist ".env" (
    echo [91m❌ Error: .env file not found![0m
    echo Please copy .env.example to .env and fill in your values.
    exit /b 1
)

REM Load environment variables from .env
echo [93m📖 Loading environment variables from .env...[0m
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
        REM Remove quotes if present
        call set "%%a=%%!%%a:"=%%"
    )
)

REM Validate required variables (complete check)
echo [93m🔍 Validating required environment variables...[0m

REM Core Cloudflare Configuration
if "%ACCOUNT_ID%"=="" (
    echo [91m❌ Error: ACCOUNT_ID is not set in .env file[0m
    exit /b 1
)

REM Shared Authentication & Storage
if "%SL_API_KEY%"=="" (
    echo [91m❌ Error: SL_API_KEY is not set in .env file[0m
    exit /b 1
)
if "%USER_DB_AUTH%"=="" (
    echo [91m❌ Error: USER_DB_AUTH is not set in .env file[0m
    exit /b 1
)
if "%R2_KEY_SECRET%"=="" (
    echo [91m❌ Error: R2_KEY_SECRET is not set in .env file[0m
    exit /b 1
)
if "%IMAGES_API_TOKEN%"=="" (
    echo [91m❌ Error: IMAGES_API_TOKEN is not set in .env file[0m
    exit /b 1
)

REM Firebase Auth Configuration
if "%API_KEY%"=="" (
    echo [91m❌ Error: API_KEY is not set in .env file[0m
    exit /b 1
)
if "%AUTH_DOMAIN%"=="" (
    echo [91m❌ Error: AUTH_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%PROJECT_ID%"=="" (
    echo [91m❌ Error: PROJECT_ID is not set in .env file[0m
    exit /b 1
)
if "%STORAGE_BUCKET%"=="" (
    echo [91m❌ Error: STORAGE_BUCKET is not set in .env file[0m
    exit /b 1
)
if "%MESSAGING_SENDER_ID%"=="" (
    echo [91m❌ Error: MESSAGING_SENDER_ID is not set in .env file[0m
    exit /b 1
)
if "%APP_ID%"=="" (
    echo [91m❌ Error: APP_ID is not set in .env file[0m
    exit /b 1
)
if "%MEASUREMENT_ID%"=="" (
    echo [91m❌ Error: MEASUREMENT_ID is not set in .env file[0m
    exit /b 1
)

REM Pages Configuration
if "%PAGES_PROJECT_NAME%"=="" (
    echo [91m❌ Error: PAGES_PROJECT_NAME is not set in .env file[0m
    exit /b 1
)
if "%PAGES_CUSTOM_DOMAIN%"=="" (
    echo [91m❌ Error: PAGES_CUSTOM_DOMAIN is not set in .env file[0m
    exit /b 1
)

REM Worker Names
if "%KEYS_WORKER_NAME%"=="" (
    echo [91m❌ Error: KEYS_WORKER_NAME is not set in .env file[0m
    exit /b 1
)
if "%USER_WORKER_NAME%"=="" (
    echo [91m❌ Error: USER_WORKER_NAME is not set in .env file[0m
    exit /b 1
)
if "%DATA_WORKER_NAME%"=="" (
    echo [91m❌ Error: DATA_WORKER_NAME is not set in .env file[0m
    exit /b 1
)
if "%IMAGES_WORKER_NAME%"=="" (
    echo [91m❌ Error: IMAGES_WORKER_NAME is not set in .env file[0m
    exit /b 1
)
if "%TURNSTILE_WORKER_NAME%"=="" (
    echo [91m❌ Error: TURNSTILE_WORKER_NAME is not set in .env file[0m
    exit /b 1
)
if "%PDF_WORKER_NAME%"=="" (
    echo [91m❌ Error: PDF_WORKER_NAME is not set in .env file[0m
    exit /b 1
)

REM Worker Domains
if "%KEYS_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: KEYS_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%USER_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: USER_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%DATA_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: DATA_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%IMAGES_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: IMAGES_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%TURNSTILE_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: TURNSTILE_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)
if "%PDF_WORKER_DOMAIN%"=="" (
    echo [91m❌ Error: PDF_WORKER_DOMAIN is not set in .env file[0m
    exit /b 1
)

REM Storage Configuration
if "%BUCKET_NAME%"=="" (
    echo [91m❌ Error: BUCKET_NAME is not set in .env file[0m
    exit /b 1
)
if "%KV_STORE_ID%"=="" (
    echo [91m❌ Error: KV_STORE_ID is not set in .env file[0m
    exit /b 1
)

REM Worker-Specific Secrets
if "%KEYS_AUTH%"=="" (
    echo [91m❌ Error: KEYS_AUTH is not set in .env file[0m
    exit /b 1
)
if "%ACCOUNT_HASH%"=="" (
    echo [91m❌ Error: ACCOUNT_HASH is not set in .env file[0m
    exit /b 1
)
if "%API_TOKEN%"=="" (
    echo [91m❌ Error: API_TOKEN is not set in .env file[0m
    exit /b 1
)
if "%HMAC_KEY%"=="" (
    echo [91m❌ Error: HMAC_KEY is not set in .env file[0m
    exit /b 1
)
if "%CFT_PUBLIC_KEY%"=="" (
    echo [91m❌ Error: CFT_PUBLIC_KEY is not set in .env file[0m
    exit /b 1
)
if "%CFT_SECRET_KEY%"=="" (
    echo [91m❌ Error: CFT_SECRET_KEY is not set in .env file[0m
    exit /b 1
)

echo [92m✅ All required environment variables validated[0m

REM Function to copy example configuration files
echo.
echo [94m📋 Copying example configuration files...[0m

REM Copy app configuration files
echo [93m  Copying app configuration files...[0m

REM Copy app config-example directory to config
if exist "app\config-example" if not exist "app\config" (
    xcopy "app\config-example" "app\config" /E /I /Q >nul
    echo [92m    ✅ app: config directory created from config-example[0m
) else (
    if exist "app\config" (
        echo [93m    ⚠️  app: config directory already exists, skipping copy[0m
    )
)

REM Copy turnstile keys.json.example to keys.json
if exist "app\components\turnstile\keys.json.example" if not exist "app\components\turnstile\keys.json" (
    copy "app\components\turnstile\keys.json.example" "app\components\turnstile\keys.json" >nul
    echo [92m    ✅ turnstile: keys.json created from example[0m
) else (
    if exist "app\components\turnstile\keys.json" (
        echo [93m    ⚠️  turnstile: keys.json already exists, skipping copy[0m
    )
)

REM Copy worker configuration files
echo [93m  Copying worker configuration files...[0m

REM Keys Worker
if exist "workers\keys-worker\wrangler.jsonc.example" if not exist "workers\keys-worker\wrangler.jsonc" (
    copy "workers\keys-worker\wrangler.jsonc.example" "workers\keys-worker\wrangler.jsonc" >nul
    echo [92m    ✅ keys-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\keys-worker\wrangler.jsonc" (
        echo [93m    ⚠️  keys-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM User Worker
if exist "workers\user-worker\wrangler.jsonc.example" if not exist "workers\user-worker\wrangler.jsonc" (
    copy "workers\user-worker\wrangler.jsonc.example" "workers\user-worker\wrangler.jsonc" >nul
    echo [92m    ✅ user-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\user-worker\wrangler.jsonc" (
        echo [93m    ⚠️  user-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM Data Worker
if exist "workers\data-worker\wrangler.jsonc.example" if not exist "workers\data-worker\wrangler.jsonc" (
    copy "workers\data-worker\wrangler.jsonc.example" "workers\data-worker\wrangler.jsonc" >nul
    echo [92m    ✅ data-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\data-worker\wrangler.jsonc" (
        echo [93m    ⚠️  data-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM Image Worker
if exist "workers\image-worker\wrangler.jsonc.example" if not exist "workers\image-worker\wrangler.jsonc" (
    copy "workers\image-worker\wrangler.jsonc.example" "workers\image-worker\wrangler.jsonc" >nul
    echo [92m    ✅ image-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\image-worker\wrangler.jsonc" (
        echo [93m    ⚠️  image-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM Turnstile Worker
if exist "workers\turnstile-worker\wrangler.jsonc.example" if not exist "workers\turnstile-worker\wrangler.jsonc" (
    copy "workers\turnstile-worker\wrangler.jsonc.example" "workers\turnstile-worker\wrangler.jsonc" >nul
    echo [92m    ✅ turnstile-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\turnstile-worker\wrangler.jsonc" (
        echo [93m    ⚠️  turnstile-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM PDF Worker
if exist "workers\pdf-worker\wrangler.jsonc.example" if not exist "workers\pdf-worker\wrangler.jsonc" (
    copy "workers\pdf-worker\wrangler.jsonc.example" "workers\pdf-worker\wrangler.jsonc" >nul
    echo [92m    ✅ pdf-worker: wrangler.jsonc created from example[0m
) else (
    if exist "workers\pdf-worker\wrangler.jsonc" (
        echo [93m    ⚠️  pdf-worker: wrangler.jsonc already exists, skipping copy[0m
    )
)

REM Copy main wrangler.toml from example
if exist "wrangler.toml.example" if not exist "wrangler.toml" (
    copy "wrangler.toml.example" "wrangler.toml" >nul
    echo [92m    ✅ root: wrangler.toml created from example[0m
) else (
    if exist "wrangler.toml" (
        echo [93m    ⚠️  root: wrangler.toml already exists, skipping copy[0m
    )
)

echo [92m✅ Configuration file copying completed[0m

REM Function to prompt for environment variables and update .env file
echo.
echo [94m🔐 Environment Variables Setup[0m
echo ==============================
echo [93mPlease provide values for the following environment variables.[0m
echo [93mPress Enter to keep existing values (if any).[0m
echo.

REM Create or backup existing .env
if exist ".env" (
    copy ".env" ".env.backup" >nul
    echo [92m📄 Existing .env backed up to .env.backup[0m
)

REM Copy .env.example to .env if it doesn't exist
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [92m📄 Created .env from .env.example[0m
)

REM Check if user wants to update environment variables
if "%1"=="--update-env" goto :prompt_secrets
if not exist ".env" goto :prompt_secrets
echo [93m📝 .env file exists. Use --update-env flag to update environment variables.[0m
goto :skip_prompt

:prompt_secrets
echo.
echo [94m📊 CLOUDFLARE CORE CONFIGURATION[0m
echo ==================================
echo [94mACCOUNT_ID[0m
echo [93mYour Cloudflare Account ID[0m
set /p "ACCOUNT_ID=Enter value: "
if not "%ACCOUNT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^ACCOUNT_ID=.*', 'ACCOUNT_ID=%ACCOUNT_ID%' | Set-Content '.env'"
    echo [92m✅ ACCOUNT_ID updated[0m
)

echo.
echo [94m🔐 SHARED AUTHENTICATION ^& STORAGE[0m
echo ===================================
echo [94mSL_API_KEY[0m
echo [93mSendLayer API key for email services[0m
set /p "SL_API_KEY=Enter value: "
if not "%SL_API_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^SL_API_KEY=.*', 'SL_API_KEY=%SL_API_KEY%' | Set-Content '.env'"
    echo [92m✅ SL_API_KEY updated[0m
)

echo [94mUSER_DB_AUTH[0m
echo [93mCustom user database authentication token (generate with: openssl rand -hex 16)[0m
set /p "USER_DB_AUTH=Enter value: "
if not "%USER_DB_AUTH%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^USER_DB_AUTH=.*', 'USER_DB_AUTH=%USER_DB_AUTH%' | Set-Content '.env'"
    echo [92m✅ USER_DB_AUTH updated[0m
)

echo [94mR2_KEY_SECRET[0m
echo [93mCustom R2 storage authentication token (generate with: openssl rand -hex 16)[0m
set /p "R2_KEY_SECRET=Enter value: "
if not "%R2_KEY_SECRET%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^R2_KEY_SECRET=.*', 'R2_KEY_SECRET=%R2_KEY_SECRET%' | Set-Content '.env'"
    echo [92m✅ R2_KEY_SECRET updated[0m
)

echo [94mIMAGES_API_TOKEN[0m
echo [93mCloudflare Images API token (shared between workers)[0m
set /p "IMAGES_API_TOKEN=Enter value: "
if not "%IMAGES_API_TOKEN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_API_TOKEN=.*', 'IMAGES_API_TOKEN=%IMAGES_API_TOKEN%' | Set-Content '.env'"
    echo [92m✅ IMAGES_API_TOKEN updated[0m
)

echo.
echo [94m🔥 FIREBASE AUTH CONFIGURATION[0m
echo ===============================
echo [94mAPI_KEY[0m
echo [93mFirebase API key[0m
set /p "API_KEY=Enter value: "
if not "%API_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^API_KEY=.*', 'API_KEY=%API_KEY%' | Set-Content '.env'"
    echo [92m✅ API_KEY updated[0m
)

echo [94mAUTH_DOMAIN[0m
echo [93mFirebase auth domain (project-id.firebaseapp.com)[0m
set /p "AUTH_DOMAIN=Enter value: "
if not "%AUTH_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^AUTH_DOMAIN=.*', 'AUTH_DOMAIN=%AUTH_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ AUTH_DOMAIN updated[0m
)

echo [94mPROJECT_ID[0m
echo [93mFirebase project ID[0m
set /p "PROJECT_ID=Enter value: "
if not "%PROJECT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PROJECT_ID=.*', 'PROJECT_ID=%PROJECT_ID%' | Set-Content '.env'"
    echo [92m✅ PROJECT_ID updated[0m
)

echo [94mSTORAGE_BUCKET[0m
echo [93mFirebase storage bucket[0m
set /p "STORAGE_BUCKET=Enter value: "
if not "%STORAGE_BUCKET%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^STORAGE_BUCKET=.*', 'STORAGE_BUCKET=%STORAGE_BUCKET%' | Set-Content '.env'"
    echo [92m✅ STORAGE_BUCKET updated[0m
)

echo [94mMESSAGING_SENDER_ID[0m
echo [93mFirebase messaging sender ID[0m
set /p "MESSAGING_SENDER_ID=Enter value: "
if not "%MESSAGING_SENDER_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^MESSAGING_SENDER_ID=.*', 'MESSAGING_SENDER_ID=%MESSAGING_SENDER_ID%' | Set-Content '.env'"
    echo [92m✅ MESSAGING_SENDER_ID updated[0m
)

echo [94mAPP_ID[0m
echo [93mFirebase app ID[0m
set /p "APP_ID=Enter value: "
if not "%APP_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^APP_ID=.*', 'APP_ID=%APP_ID%' | Set-Content '.env'"
    echo [92m✅ APP_ID updated[0m
)

echo [94mMEASUREMENT_ID[0m
echo [93mFirebase measurement ID (optional)[0m
set /p "MEASUREMENT_ID=Enter value: "
if not "%MEASUREMENT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^MEASUREMENT_ID=.*', 'MEASUREMENT_ID=%MEASUREMENT_ID%' | Set-Content '.env'"
    echo [92m✅ MEASUREMENT_ID updated[0m
)

echo.
echo [94m📄 PAGES CONFIGURATION[0m
echo ======================
echo [94mPAGES_PROJECT_NAME[0m
echo [93mYour Cloudflare Pages project name[0m
set /p "PAGES_PROJECT_NAME=Enter value: "
if not "%PAGES_PROJECT_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PAGES_PROJECT_NAME=.*', 'PAGES_PROJECT_NAME=%PAGES_PROJECT_NAME%' | Set-Content '.env'"
    echo [92m✅ PAGES_PROJECT_NAME updated[0m
)

echo [94mPAGES_CUSTOM_DOMAIN[0m
echo [93mYour custom domain (e.g., striae.org) - DO NOT include https://[0m
set /p "PAGES_CUSTOM_DOMAIN=Enter value: "
if not "%PAGES_CUSTOM_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PAGES_CUSTOM_DOMAIN=.*', 'PAGES_CUSTOM_DOMAIN=%PAGES_CUSTOM_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ PAGES_CUSTOM_DOMAIN updated[0m
)

REM Worker names and domains
echo.
echo [94m🔑 WORKER NAMES ^& DOMAINS[0m
echo =========================

echo [94mKEYS_WORKER_NAME[0m
echo [93mKeys worker name[0m
set /p "KEYS_WORKER_NAME=Enter value: "
if not "%KEYS_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KEYS_WORKER_NAME=.*', 'KEYS_WORKER_NAME=%KEYS_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ KEYS_WORKER_NAME updated[0m
)

echo [94mKEYS_WORKER_DOMAIN[0m
echo [93mKeys worker domain (e.g., keys.striae.org) - DO NOT include https://[0m
set /p "KEYS_WORKER_DOMAIN=Enter value: "
if not "%KEYS_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KEYS_WORKER_DOMAIN=.*', 'KEYS_WORKER_DOMAIN=%KEYS_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ KEYS_WORKER_DOMAIN updated[0m
)

echo [94mUSER_WORKER_NAME[0m
echo [93mUser worker name[0m
set /p "USER_WORKER_NAME=Enter value: "
if not "%USER_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^USER_WORKER_NAME=.*', 'USER_WORKER_NAME=%USER_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ USER_WORKER_NAME updated[0m
)

echo [94mUSER_WORKER_DOMAIN[0m
echo [93mUser worker domain (e.g., users.striae.org) - DO NOT include https://[0m
set /p "USER_WORKER_DOMAIN=Enter value: "
if not "%USER_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^USER_WORKER_DOMAIN=.*', 'USER_WORKER_DOMAIN=%USER_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ USER_WORKER_DOMAIN updated[0m
)

echo [94mDATA_WORKER_NAME[0m
echo [93mData worker name[0m
set /p "DATA_WORKER_NAME=Enter value: "
if not "%DATA_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^DATA_WORKER_NAME=.*', 'DATA_WORKER_NAME=%DATA_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ DATA_WORKER_NAME updated[0m
)

echo [94mDATA_WORKER_DOMAIN[0m
echo [93mData worker domain (e.g., data.striae.org) - DO NOT include https://[0m
set /p "DATA_WORKER_DOMAIN=Enter value: "
if not "%DATA_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^DATA_WORKER_DOMAIN=.*', 'DATA_WORKER_DOMAIN=%DATA_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ DATA_WORKER_DOMAIN updated[0m
)

echo [94mIMAGES_WORKER_NAME[0m
echo [93mImages worker name[0m
set /p "IMAGES_WORKER_NAME=Enter value: "
if not "%IMAGES_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_WORKER_NAME=.*', 'IMAGES_WORKER_NAME=%IMAGES_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ IMAGES_WORKER_NAME updated[0m
)

echo [94mIMAGES_WORKER_DOMAIN[0m
echo [93mImages worker domain (e.g., images.striae.org) - DO NOT include https://[0m
set /p "IMAGES_WORKER_DOMAIN=Enter value: "
if not "%IMAGES_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_WORKER_DOMAIN=.*', 'IMAGES_WORKER_DOMAIN=%IMAGES_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ IMAGES_WORKER_DOMAIN updated[0m
)

echo [94mTURNSTILE_WORKER_NAME[0m
echo [93mTurnstile worker name[0m
set /p "TURNSTILE_WORKER_NAME=Enter value: "
if not "%TURNSTILE_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^TURNSTILE_WORKER_NAME=.*', 'TURNSTILE_WORKER_NAME=%TURNSTILE_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ TURNSTILE_WORKER_NAME updated[0m
)

echo [94mTURNSTILE_WORKER_DOMAIN[0m
echo [93mTurnstile worker domain (e.g., turnstile.striae.org) - DO NOT include https://[0m
set /p "TURNSTILE_WORKER_DOMAIN=Enter value: "
if not "%TURNSTILE_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^TURNSTILE_WORKER_DOMAIN=.*', 'TURNSTILE_WORKER_DOMAIN=%TURNSTILE_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ TURNSTILE_WORKER_DOMAIN updated[0m
)

echo [94mPDF_WORKER_NAME[0m
echo [93mPDF worker name[0m
set /p "PDF_WORKER_NAME=Enter value: "
if not "%PDF_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PDF_WORKER_NAME=.*', 'PDF_WORKER_NAME=%PDF_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ PDF_WORKER_NAME updated[0m
)

echo [94mPDF_WORKER_DOMAIN[0m
echo [93mPDF worker domain (e.g., pdf.striae.org) - DO NOT include https://[0m
set /p "PDF_WORKER_DOMAIN=Enter value: "
if not "%PDF_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PDF_WORKER_DOMAIN=.*', 'PDF_WORKER_DOMAIN=%PDF_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ PDF_WORKER_DOMAIN updated[0m
)

echo.
echo [94m🗄️ STORAGE CONFIGURATION[0m
echo =========================
echo [94mBUCKET_NAME[0m
echo [93mYour R2 bucket name[0m
set /p "BUCKET_NAME=Enter value: "
if not "%BUCKET_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^BUCKET_NAME=.*', 'BUCKET_NAME=%BUCKET_NAME%' | Set-Content '.env'"
    echo [92m✅ BUCKET_NAME updated[0m
)

echo [94mKV_STORE_ID[0m
echo [93mYour KV namespace ID (UUID format)[0m
set /p "KV_STORE_ID=Enter value: "
if not "%KV_STORE_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KV_STORE_ID=.*', 'KV_STORE_ID=%KV_STORE_ID%' | Set-Content '.env'"
    echo [92m✅ KV_STORE_ID updated[0m
)

echo.
echo [94m🔐 SERVICE-SPECIFIC SECRETS[0m
echo ============================
echo [94mKEYS_AUTH[0m
echo [93mKeys worker authentication token (generate with: openssl rand -hex 16)[0m
set /p "KEYS_AUTH=Enter value: "
if not "%KEYS_AUTH%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KEYS_AUTH=.*', 'KEYS_AUTH=%KEYS_AUTH%' | Set-Content '.env'"
    echo [92m✅ KEYS_AUTH updated[0m
)

echo [94mACCOUNT_HASH[0m
echo [93mCloudflare Images Account Hash[0m
set /p "ACCOUNT_HASH=Enter value: "
if not "%ACCOUNT_HASH%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^ACCOUNT_HASH=.*', 'ACCOUNT_HASH=%ACCOUNT_HASH%' | Set-Content '.env'"
    echo [92m✅ ACCOUNT_HASH updated[0m
)

echo [94mAPI_TOKEN[0m
echo [93mCloudflare Images API token (for Images Worker)[0m
set /p "API_TOKEN=Enter value: "
if not "%API_TOKEN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^API_TOKEN=.*', 'API_TOKEN=%API_TOKEN%' | Set-Content '.env'"
    echo [92m✅ API_TOKEN updated[0m
)

echo [94mHMAC_KEY[0m
echo [93mCloudflare Images HMAC signing key[0m
set /p "HMAC_KEY=Enter value: "
if not "%HMAC_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^HMAC_KEY=.*', 'HMAC_KEY=%HMAC_KEY%' | Set-Content '.env'"
    echo [92m✅ HMAC_KEY updated[0m
)

echo [94mCFT_PUBLIC_KEY[0m
echo [93mCloudflare Turnstile public key[0m
set /p "CFT_PUBLIC_KEY=Enter value: "
if not "%CFT_PUBLIC_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^CFT_PUBLIC_KEY=.*', 'CFT_PUBLIC_KEY=%CFT_PUBLIC_KEY%' | Set-Content '.env'"
    echo [92m✅ CFT_PUBLIC_KEY updated[0m
)

echo [94mCFT_SECRET_KEY[0m
echo [93mCloudflare Turnstile secret key[0m
set /p "CFT_SECRET_KEY=Enter value: "
if not "%CFT_SECRET_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^CFT_SECRET_KEY=.*', 'CFT_SECRET_KEY=%CFT_SECRET_KEY%' | Set-Content '.env'"
    echo [92m✅ CFT_SECRET_KEY updated[0m
)

echo.
echo [92m🎉 Environment variables setup completed![0m
echo [94m📄 All values saved to .env file[0m

:skip_prompt
REM Reload environment variables from .env file
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
        REM Remove quotes if present
        call set "%%a=%%!%%a:"=%%"
    )
)

REM Update configuration files with environment variables
echo.
echo [94m🔧 Updating configuration files...[0m

REM Update wrangler configuration files
echo [93m  Updating wrangler configuration files...[0m

REM Data Worker
if exist "workers\data-worker\wrangler.jsonc" (
    echo [93m  Updating data-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/data-worker/wrangler.jsonc') -replace '\"DATA_WORKER_NAME\"', '\"%DATA_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"DATA_WORKER_DOMAIN\"', '\"%DATA_WORKER_DOMAIN%\"' -replace '\"BUCKET_NAME\"', '\"%BUCKET_NAME%\"' | Set-Content 'workers/data-worker/wrangler.jsonc'"
    echo [92m    ✅ data-worker configuration updated[0m
)

REM Update data-worker source file CORS headers
if exist "workers\data-worker\src\data-worker.js" (
    echo [93m  Updating data-worker CORS headers...[0m
    powershell -Command "(Get-Content 'workers/data-worker/src/data-worker.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/data-worker/src/data-worker.js'"
    echo [92m    ✅ data-worker CORS headers updated[0m
)

REM Image Worker
if exist "workers\image-worker\wrangler.jsonc" (
    echo [93m  Updating image-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/image-worker/wrangler.jsonc') -replace '\"IMAGES_WORKER_NAME\"', '\"%IMAGES_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"IMAGES_WORKER_DOMAIN\"', '\"%IMAGES_WORKER_DOMAIN%\"' | Set-Content 'workers/image-worker/wrangler.jsonc'"
    echo [92m    ✅ image-worker configuration updated[0m
)

REM Update image-worker source file CORS headers
if exist "workers\image-worker\src\image-worker.js" (
    echo [93m  Updating image-worker CORS headers...[0m
    powershell -Command "(Get-Content 'workers/image-worker/src/image-worker.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/image-worker/src/image-worker.js'"
    echo [92m    ✅ image-worker CORS headers updated[0m
)

REM Keys Worker
if exist "workers\keys-worker\wrangler.jsonc" (
    echo [93m  Updating keys-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/keys-worker/wrangler.jsonc') -replace '\"KEYS_WORKER_NAME\"', '\"%KEYS_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"KEYS_WORKER_DOMAIN\"', '\"%KEYS_WORKER_DOMAIN%\"' | Set-Content 'workers/keys-worker/wrangler.jsonc'"
    echo [92m    ✅ keys-worker configuration updated[0m
)

REM Update keys-worker source file CORS headers
if exist "workers\keys-worker\src\keys.js" (
    echo [93m  Updating keys-worker CORS headers...[0m
    powershell -Command "(Get-Content 'workers/keys-worker/src/keys.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/keys-worker/src/keys.js'"
    echo [92m    ✅ keys-worker CORS headers updated[0m
)

REM PDF Worker
if exist "workers\pdf-worker\wrangler.jsonc" (
    echo [93m  Updating pdf-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/pdf-worker/wrangler.jsonc') -replace '\"PDF_WORKER_NAME\"', '\"%PDF_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"PDF_WORKER_DOMAIN\"', '\"%PDF_WORKER_DOMAIN%\"' | Set-Content 'workers/pdf-worker/wrangler.jsonc'"
    echo [92m    ✅ pdf-worker configuration updated[0m
)

REM Update pdf-worker source file CORS headers
if exist "workers\pdf-worker\src\pdf-worker.js" (
    echo [93m  Updating pdf-worker CORS headers...[0m
    powershell -Command "(Get-Content 'workers/pdf-worker/src/pdf-worker.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/pdf-worker/src/pdf-worker.js'"
    echo [92m    ✅ pdf-worker CORS headers updated[0m
)

REM Turnstile Worker
if exist "workers\turnstile-worker\wrangler.jsonc" (
    echo [93m  Updating turnstile-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/turnstile-worker/wrangler.jsonc') -replace '\"TURNSTILE_WORKER_NAME\"', '\"%TURNSTILE_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"TURNSTILE_WORKER_DOMAIN\"', '\"%TURNSTILE_WORKER_DOMAIN%\"' | Set-Content 'workers/turnstile-worker/wrangler.jsonc'"
    echo [92m    ✅ turnstile-worker configuration updated[0m
)

REM Update turnstile-worker source file CORS headers
if exist "workers\turnstile-worker\src\turnstile.js" (
    echo [93m  Updating turnstile-worker CORS headers...[0m
    powershell -Command "(Get-Content 'workers/turnstile-worker/src/turnstile.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/turnstile-worker/src/turnstile.js'"
    echo [92m    ✅ turnstile-worker CORS headers updated[0m
)

REM User Worker
if exist "workers\user-worker\wrangler.jsonc" (
    echo [93m  Updating user-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/user-worker/wrangler.jsonc') -replace '\"USER_WORKER_NAME\"', '\"%USER_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"USER_WORKER_DOMAIN\"', '\"%USER_WORKER_DOMAIN%\"' -replace '\"KV_STORE_ID\"', '\"%KV_STORE_ID%\"' | Set-Content 'workers/user-worker/wrangler.jsonc'"
    echo [92m    ✅ user-worker configuration updated[0m
)

REM Update user-worker source file CORS headers and worker URLs
if exist "workers\user-worker\src\user-worker.js" (
    echo [93m  Updating user-worker CORS headers and worker URLs...[0m
    powershell -Command "(Get-Content 'workers/user-worker/src/user-worker.js') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' -replace '''DATA_WORKER_DOMAIN''', '''https://%DATA_WORKER_DOMAIN%''' -replace '''IMAGES_WORKER_DOMAIN''', '''https://%IMAGES_WORKER_DOMAIN%''' | Set-Content 'workers/user-worker/src/user-worker.js'"
    echo [92m    ✅ user-worker CORS headers and worker URLs updated[0m
)

REM Main wrangler.toml
if exist "wrangler.toml" (
    echo [93m  Updating wrangler.toml...[0m
    powershell -Command "(Get-Content 'wrangler.toml') -replace '\"PAGES_PROJECT_NAME\"', '\"%PAGES_PROJECT_NAME%\"' | Set-Content 'wrangler.toml'"
    echo [92m    ✅ main wrangler.toml configuration updated[0m
)

REM Update app configuration files
echo [93m  Updating app configuration files...[0m

REM Update app/config/config.json
if exist "app\config\config.json" (
    echo [93m    Updating app/config/config.json...[0m
    powershell -Command "(Get-Content 'app/config/config.json') -replace '\"PAGES_CUSTOM_DOMAIN\"', '\"https://%PAGES_CUSTOM_DOMAIN%\"' -replace '\"DATA_WORKER_CUSTOM_DOMAIN\"', '\"https://%DATA_WORKER_DOMAIN%\"' -replace '\"KEYS_WORKER_CUSTOM_DOMAIN\"', '\"https://%KEYS_WORKER_DOMAIN%\"' -replace '\"IMAGE_WORKER_CUSTOM_DOMAIN\"', '\"https://%IMAGES_WORKER_DOMAIN%\"' -replace '\"USER_WORKER_CUSTOM_DOMAIN\"', '\"https://%USER_WORKER_DOMAIN%\"' -replace '\"PDF_WORKER_CUSTOM_DOMAIN\"', '\"https://%PDF_WORKER_DOMAIN%\"' -replace '\"YOUR_KEYS_AUTH_TOKEN\"', '\"%KEYS_AUTH%\"' | Set-Content 'app/config/config.json'"
    echo [92m      ✅ app config.json updated[0m
)

REM Update app/config/firebase.ts
if exist "app\config\firebase.ts" (
    echo [93m    Updating app/config/firebase.ts...[0m
    powershell -Command "(Get-Content 'app/config/firebase.ts') -replace '\"YOUR_FIREBASE_API_KEY\"', '\"%API_KEY%\"' -replace '\"YOUR_FIREBASE_AUTH_DOMAIN\"', '\"%AUTH_DOMAIN%\"' -replace '\"YOUR_FIREBASE_PROJECT_ID\"', '\"%PROJECT_ID%\"' -replace '\"YOUR_FIREBASE_STORAGE_BUCKET\"', '\"%STORAGE_BUCKET%\"' -replace '\"YOUR_FIREBASE_MESSAGING_SENDER_ID\"', '\"%MESSAGING_SENDER_ID%\"' -replace '\"YOUR_FIREBASE_APP_ID\"', '\"%APP_ID%\"' -replace '\"YOUR_FIREBASE_MEASUREMENT_ID\"', '\"%MEASUREMENT_ID%\"' | Set-Content 'app/config/firebase.ts'"
    echo [92m      ✅ app firebase.ts updated[0m
)

REM Update app/components/turnstile/keys.json
if exist "app\components\turnstile\keys.json" (
    echo [93m    Updating app/components/turnstile/keys.json...[0m
    powershell -Command "(Get-Content 'app/components/turnstile/keys.json') -replace '\"insert-your-turnstile-site-key-here\"', '\"%CFT_PUBLIC_KEY%\"' -replace '\"https://turnstile.your-domain.com\"', '\"https://%TURNSTILE_WORKER_DOMAIN%\"' | Set-Content 'app/components/turnstile/keys.json'"
    echo [92m      ✅ turnstile keys.json updated[0m
)

echo [92m✅ All configuration files updated[0m

echo.
echo [92m🎉 Configuration setup completed![0m
echo [94m📝 Next Steps:[0m
echo    1. Install worker dependencies
echo    2. Deploy workers
echo    3. Deploy worker secrets
echo    4. Deploy pages
echo    5. Deploy pages secrets
echo.
echo [92m✨ Ready for deployment![0m