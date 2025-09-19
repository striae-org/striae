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

REM Validate key required variables (basic check)
echo [93m🔍 Validating required environment variables...[0m
if "%ACCOUNT_ID%"=="" (
    echo [91m❌ Error: ACCOUNT_ID is not set in .env file[0m
    exit /b 1
)
if "%PAGES_CUSTOM_DOMAIN%"=="" (
    echo [91m❌ Error: PAGES_CUSTOM_DOMAIN is not set in .env file[0m
    exit /b 1
)

echo [92m✅ Environment variables validated[0m

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