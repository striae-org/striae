@echo off
REM ===================================
REM STRIAE CONFIGURATION SETUP SCRIPT
REM ===================================
REM This script sets up all configuration files and replaces placeholders
REM Run this BEFORE installing worker dependencies to avoid wrangler validation errors

setlocal enabledelayedexpansion

set "UPDATE_ENV=0"
set "SHOW_HELP=0"
for %%A in (%*) do (
    if /i "%%A"=="-h" set "SHOW_HELP=1"
    if /i "%%A"=="--help" set "SHOW_HELP=1"
    if /i "%%A"=="/h" set "SHOW_HELP=1"
    if /i "%%A"=="/?" set "SHOW_HELP=1"
    if /i "%%A"=="--update-env" set "UPDATE_ENV=1"
)

if "%SHOW_HELP%"=="1" (
    echo Usage: scripts\deploy-config.bat [--update-env]
    echo.
    echo Options:
    echo   --update-env   Reset .env from .env.example and overwrite configs
    echo   -h, --help     Show this help message
    exit /b 0
)

if "%UPDATE_ENV%"=="1" (
    echo [93m⚠️  Update-env mode: overwriting configs and regenerating .env values[0m
)

echo [94m⚙️  Striae Configuration Setup Script[0m
echo =====================================

REM Check if .env file exists
if "%UPDATE_ENV%"=="1" (
    if exist ".env" (
        copy ".env" ".env.backup" >nul
        echo [92m📄 Existing .env backed up to .env.backup[0m
    )
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
        echo [92m✅ .env file reset from .env.example[0m
    ) else (
        echo [91m❌ Error: .env.example file not found![0m
        exit /b 1
    )
) else (
    if not exist ".env" (
        echo [93m📄 .env file not found, copying from .env.example...[0m
        if exist ".env.example" (
            copy ".env.example" ".env" >nul 2>&1
            echo [92m✅ .env file created from .env.example[0m
        ) else (
            echo [91m❌ Error: Neither .env nor .env.example file found![0m
            echo Please create a .env.example file or provide a .env file.
            exit /b 1
        )
    )
)

REM Function to copy example configuration files
echo.
echo [94m📋 Copying example configuration files...[0m

REM Copy app configuration files
echo [93m  Copying app configuration files...[0m

REM Copy app config-example directory to config
if exist "app\config-example" (
    if "%UPDATE_ENV%"=="1" if exist "app\config" rmdir /s /q "app\config"
    if not exist "app\config" (
        xcopy "app\config-example" "app\config" /E /I /Q >nul
        echo [92m    ✅ app: config directory created from config-example[0m
    ) else (
        if "%UPDATE_ENV%"=="1" (
            xcopy "app\config-example" "app\config" /E /I /Q /Y >nul
            echo [92m    ✅ app: config directory replaced from config-example[0m
        ) else (
            echo [93m    ⚠️  app: config directory already exists, skipping copy[0m
        )
    )
)

REM Copy turnstile keys.json.example to keys.json
if exist "app\components\turnstile\keys.json.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "app\components\turnstile\keys.json.example" "app\components\turnstile\keys.json" >nul
        echo [92m    ✅ turnstile: keys.json created from example[0m
    ) else (
        if not exist "app\components\turnstile\keys.json" (
            copy "app\components\turnstile\keys.json.example" "app\components\turnstile\keys.json" >nul
            echo [92m    ✅ turnstile: keys.json created from example[0m
        ) else (
            echo [93m    ⚠️  turnstile: keys.json already exists, skipping copy[0m
        )
    )
)

REM Copy worker configuration files
echo [93m  Copying worker configuration files...[0m

REM Keys Worker
if exist "workers\keys-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\keys-worker\wrangler.jsonc.example" "workers\keys-worker\wrangler.jsonc" >nul
        echo [92m    ✅ keys-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\keys-worker\wrangler.jsonc" (
            copy "workers\keys-worker\wrangler.jsonc.example" "workers\keys-worker\wrangler.jsonc" >nul
            echo [92m    ✅ keys-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  keys-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM User Worker
if exist "workers\user-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\user-worker\wrangler.jsonc.example" "workers\user-worker\wrangler.jsonc" >nul
        echo [92m    ✅ user-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\user-worker\wrangler.jsonc" (
            copy "workers\user-worker\wrangler.jsonc.example" "workers\user-worker\wrangler.jsonc" >nul
            echo [92m    ✅ user-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  user-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM Data Worker
if exist "workers\data-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\data-worker\wrangler.jsonc.example" "workers\data-worker\wrangler.jsonc" >nul
        echo [92m    ✅ data-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\data-worker\wrangler.jsonc" (
            copy "workers\data-worker\wrangler.jsonc.example" "workers\data-worker\wrangler.jsonc" >nul
            echo [92m    ✅ data-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  data-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM Audit Worker
if exist "workers\audit-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\audit-worker\wrangler.jsonc.example" "workers\audit-worker\wrangler.jsonc" >nul
        echo [92m    ✅ audit-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\audit-worker\wrangler.jsonc" (
            copy "workers\audit-worker\wrangler.jsonc.example" "workers\audit-worker\wrangler.jsonc" >nul
            echo [92m    ✅ audit-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  audit-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM Image Worker
if exist "workers\image-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\image-worker\wrangler.jsonc.example" "workers\image-worker\wrangler.jsonc" >nul
        echo [92m    ✅ image-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\image-worker\wrangler.jsonc" (
            copy "workers\image-worker\wrangler.jsonc.example" "workers\image-worker\wrangler.jsonc" >nul
            echo [92m    ✅ image-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  image-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM Turnstile Worker
if exist "workers\turnstile-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\turnstile-worker\wrangler.jsonc.example" "workers\turnstile-worker\wrangler.jsonc" >nul
        echo [92m    ✅ turnstile-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\turnstile-worker\wrangler.jsonc" (
            copy "workers\turnstile-worker\wrangler.jsonc.example" "workers\turnstile-worker\wrangler.jsonc" >nul
            echo [92m    ✅ turnstile-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  turnstile-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM PDF Worker
if exist "workers\pdf-worker\wrangler.jsonc.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\pdf-worker\wrangler.jsonc.example" "workers\pdf-worker\wrangler.jsonc" >nul
        echo [92m    ✅ pdf-worker: wrangler.jsonc created from example[0m
    ) else (
        if not exist "workers\pdf-worker\wrangler.jsonc" (
            copy "workers\pdf-worker\wrangler.jsonc.example" "workers\pdf-worker\wrangler.jsonc" >nul
            echo [92m    ✅ pdf-worker: wrangler.jsonc created from example[0m
        ) else (
            echo [93m    ⚠️  pdf-worker: wrangler.jsonc already exists, skipping copy[0m
        )
    )
)

REM Copy worker source template files
echo [93m  Copying worker source template files...[0m

REM Keys worker source
if exist "workers\keys-worker\src\keys.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\keys-worker\src\keys.example.ts" "workers\keys-worker\src\keys.ts" >nul
        echo [92m    ✅ keys-worker: keys.ts created from example[0m
    ) else (
        if not exist "workers\keys-worker\src\keys.ts" (
            copy "workers\keys-worker\src\keys.example.ts" "workers\keys-worker\src\keys.ts" >nul
            echo [92m    ✅ keys-worker: keys.ts created from example[0m
        ) else (
            echo [93m    ⚠️  keys-worker: keys.ts already exists, skipping copy[0m
        )
    )
)

REM User worker source
if exist "workers\user-worker\src\user-worker.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\user-worker\src\user-worker.example.ts" "workers\user-worker\src\user-worker.ts" >nul
        echo [92m    ✅ user-worker: user-worker.ts created from example[0m
    ) else (
        if not exist "workers\user-worker\src\user-worker.ts" (
            copy "workers\user-worker\src\user-worker.example.ts" "workers\user-worker\src\user-worker.ts" >nul
            echo [92m    ✅ user-worker: user-worker.ts created from example[0m
        ) else (
            echo [93m    ⚠️  user-worker: user-worker.ts already exists, skipping copy[0m
        )
    )
)

REM Data worker source
if exist "workers\data-worker\src\data-worker.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\data-worker\src\data-worker.example.ts" "workers\data-worker\src\data-worker.ts" >nul
        echo [92m    ✅ data-worker: data-worker.ts created from example[0m
    ) else (
        if not exist "workers\data-worker\src\data-worker.ts" (
            copy "workers\data-worker\src\data-worker.example.ts" "workers\data-worker\src\data-worker.ts" >nul
            echo [92m    ✅ data-worker: data-worker.ts created from example[0m
        ) else (
            echo [93m    ⚠️  data-worker: data-worker.ts already exists, skipping copy[0m
        )
    )
)

REM Audit worker source
if exist "workers\audit-worker\src\audit-worker.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\audit-worker\src\audit-worker.example.ts" "workers\audit-worker\src\audit-worker.ts" >nul
        echo [92m    ✅ audit-worker: audit-worker.ts created from example[0m
    ) else (
        if not exist "workers\audit-worker\src\audit-worker.ts" (
            copy "workers\audit-worker\src\audit-worker.example.ts" "workers\audit-worker\src\audit-worker.ts" >nul
            echo [92m    ✅ audit-worker: audit-worker.ts created from example[0m
        ) else (
            echo [93m    ⚠️  audit-worker: audit-worker.ts already exists, skipping copy[0m
        )
    )
)

REM Image worker source
if exist "workers\image-worker\src\image-worker.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\image-worker\src\image-worker.example.ts" "workers\image-worker\src\image-worker.ts" >nul
        echo [92m    ✅ image-worker: image-worker.ts created from example[0m
    ) else (
        if not exist "workers\image-worker\src\image-worker.ts" (
            copy "workers\image-worker\src\image-worker.example.ts" "workers\image-worker\src\image-worker.ts" >nul
            echo [92m    ✅ image-worker: image-worker.ts created from example[0m
        ) else (
            echo [93m    ⚠️  image-worker: image-worker.ts already exists, skipping copy[0m
        )
    )
)

REM Turnstile worker source
if exist "workers\turnstile-worker\src\turnstile.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\turnstile-worker\src\turnstile.example.ts" "workers\turnstile-worker\src\turnstile.ts" >nul
        echo [92m    ✅ turnstile-worker: turnstile.ts created from example[0m
    ) else (
        if not exist "workers\turnstile-worker\src\turnstile.ts" (
            copy "workers\turnstile-worker\src\turnstile.example.ts" "workers\turnstile-worker\src\turnstile.ts" >nul
            echo [92m    ✅ turnstile-worker: turnstile.ts created from example[0m
        ) else (
            echo [93m    ⚠️  turnstile-worker: turnstile.ts already exists, skipping copy[0m
        )
    )
)

REM PDF worker source
if exist "workers\pdf-worker\src\pdf-worker.example.ts" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "workers\pdf-worker\src\pdf-worker.example.ts" "workers\pdf-worker\src\pdf-worker.ts" >nul
        echo [92m    ✅ pdf-worker: pdf-worker.ts created from example[0m
    ) else (
        if not exist "workers\pdf-worker\src\pdf-worker.ts" (
            copy "workers\pdf-worker\src\pdf-worker.example.ts" "workers\pdf-worker\src\pdf-worker.ts" >nul
            echo [92m    ✅ pdf-worker: pdf-worker.ts created from example[0m
        ) else (
            echo [93m    ⚠️  pdf-worker: pdf-worker.ts already exists, skipping copy[0m
        )
    )
)

REM Copy main wrangler.toml from example
if exist "wrangler.toml.example" (
    if "%UPDATE_ENV%"=="1" (
        copy /Y "wrangler.toml.example" "wrangler.toml" >nul
        echo [92m    ✅ root: wrangler.toml created from example[0m
    ) else (
        if not exist "wrangler.toml" (
            copy "wrangler.toml.example" "wrangler.toml" >nul
            echo [92m    ✅ root: wrangler.toml created from example[0m
        ) else (
            echo [93m    ⚠️  root: wrangler.toml already exists, skipping copy[0m
        )
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

REM Create or backup existing .env (skip backup in update-env mode as it was already done)
if exist ".env" (
    if "%UPDATE_ENV%"=="0" (
        copy ".env" ".env.backup" >nul
        echo [92m📄 Existing .env backed up to .env.backup[0m
    )
)

REM Copy .env.example to .env if it doesn't exist
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [92m📄 Created .env from .env.example[0m
)

REM Load existing .env values into batch variables so prompt_required can show current values
if exist ".env" (
    for /f "tokens=1,2 delims==" %%A in (.env) do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" (
            set "%%A=%%B"
        )
    )
    echo [92m✅ Loaded existing environment variables[0m
)

REM Always prompt for secrets configuration
:prompt_secrets
echo.
echo [94m📊 CLOUDFLARE CORE CONFIGURATION[0m
echo ==================================
echo [94mACCOUNT_ID[0m
echo [93mYour Cloudflare Account ID[0m
call :prompt_required ACCOUNT_ID
if not "%ACCOUNT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^ACCOUNT_ID=.*', 'ACCOUNT_ID=%ACCOUNT_ID%' | Set-Content '.env'"
    echo [92m✅ ACCOUNT_ID updated[0m
)

echo.
echo [94m🔐 SHARED AUTHENTICATION ^& STORAGE[0m
echo ===================================
echo [94mSL_API_KEY[0m
echo [93mSendLayer API key for email services[0m
call :prompt_required SL_API_KEY
if not "%SL_API_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^SL_API_KEY=.*', 'SL_API_KEY=%SL_API_KEY%' | Set-Content '.env'"
    echo [92m✅ SL_API_KEY updated[0m
)

echo [94mUSER_DB_AUTH[0m
echo [93mCustom user database authentication token (generate with: openssl rand -hex 16)[0m

REM Check if USER_DB_AUTH already exists in .env and is not a placeholder
call :is_placeholder "%USER_DB_AUTH%"
if "%ERRORLEVEL%"=="1" set "USER_DB_AUTH="
if "%UPDATE_ENV%"=="1" set "USER_DB_AUTH="
if "%USER_DB_AUTH%"=="" (
    echo [95mAuto-generating secret...[0m
    for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "USER_DB_AUTH=%%i"
    if not "%USER_DB_AUTH%"=="" (
        powershell -Command "(Get-Content '.env') -replace '^USER_DB_AUTH=.*', 'USER_DB_AUTH=%USER_DB_AUTH%' | Set-Content '.env'"
        echo [92m✅ USER_DB_AUTH auto-generated[0m
    ) else (
        echo [91m❌ Failed to auto-generate, please enter manually:[0m
        call :prompt_required USER_DB_AUTH
        if not "%USER_DB_AUTH%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^USER_DB_AUTH=.*', 'USER_DB_AUTH=%USER_DB_AUTH%' | Set-Content '.env'"
            echo [92m✅ USER_DB_AUTH updated[0m
        )
    )
) else (
    REM Current value exists
    echo [92mCurrent value: [HIDDEN][0m
    set /p "USER_DB_AUTH_CHOICE=Generate new secret? (press Enter to keep current, or type 'y' to generate): "
    if /i "%USER_DB_AUTH_CHOICE%"=="y" (
        echo [95mAuto-generating secret...[0m
        for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "USER_DB_AUTH=%%i"
        if not "%USER_DB_AUTH%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^USER_DB_AUTH=.*', 'USER_DB_AUTH=%USER_DB_AUTH%' | Set-Content '.env'"
            echo [92m✅ USER_DB_AUTH auto-generated[0m
        ) else (
            echo [91m❌ Failed to auto-generate, please enter manually:[0m
            call :prompt_required USER_DB_AUTH
            if not "%USER_DB_AUTH%"=="" (
                powershell -Command "(Get-Content '.env') -replace '^USER_DB_AUTH=.*', 'USER_DB_AUTH=%USER_DB_AUTH%' | Set-Content '.env'"
                echo [92m✅ USER_DB_AUTH updated[0m
            )
        )
    ) else (
        echo [92m✅ Keeping current value for USER_DB_AUTH[0m
    )
)

echo [94mR2_KEY_SECRET[0m
echo [93mCustom R2 storage authentication token (generate with: openssl rand -hex 16)[0m

REM Check if R2_KEY_SECRET already exists in .env and is not a placeholder
call :is_placeholder "%R2_KEY_SECRET%"
if "%ERRORLEVEL%"=="1" set "R2_KEY_SECRET="
if "%UPDATE_ENV%"=="1" set "R2_KEY_SECRET="
if "%R2_KEY_SECRET%"=="" (
    echo [95mAuto-generating secret...[0m
    for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "R2_KEY_SECRET=%%i"
    if not "%R2_KEY_SECRET%"=="" (
        powershell -Command "(Get-Content '.env') -replace '^R2_KEY_SECRET=.*', 'R2_KEY_SECRET=%R2_KEY_SECRET%' | Set-Content '.env'"
        echo [92m✅ R2_KEY_SECRET auto-generated[0m
    ) else (
        echo [91m❌ Failed to auto-generate, please enter manually:[0m
        call :prompt_required R2_KEY_SECRET
        if not "%R2_KEY_SECRET%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^R2_KEY_SECRET=.*', 'R2_KEY_SECRET=%R2_KEY_SECRET%' | Set-Content '.env'"
            echo [92m✅ R2_KEY_SECRET updated[0m
        )
    )
) else (
    REM Current value exists
    echo [92mCurrent value: [HIDDEN][0m
    set /p "R2_KEY_SECRET_CHOICE=Generate new secret? (press Enter to keep current, or type 'y' to generate): "
    if /i "%R2_KEY_SECRET_CHOICE%"=="y" (
        echo [95mAuto-generating secret...[0m
        for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "R2_KEY_SECRET=%%i"
        if not "%R2_KEY_SECRET%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^R2_KEY_SECRET=.*', 'R2_KEY_SECRET=%R2_KEY_SECRET%' | Set-Content '.env'"
            echo [92m✅ R2_KEY_SECRET auto-generated[0m
        ) else (
            echo [91m❌ Failed to auto-generate, please enter manually:[0m
            call :prompt_required R2_KEY_SECRET
            if not "%R2_KEY_SECRET%"=="" (
                powershell -Command "(Get-Content '.env') -replace '^R2_KEY_SECRET=.*', 'R2_KEY_SECRET=%R2_KEY_SECRET%' | Set-Content '.env'"
                echo [92m✅ R2_KEY_SECRET updated[0m
            )
        )
    ) else (
        echo [92m✅ Keeping current value for R2_KEY_SECRET[0m
    )
)

echo [94mIMAGES_API_TOKEN[0m
echo [93mCloudflare Images API token (shared between workers)[0m
call :prompt_required IMAGES_API_TOKEN
if not "%IMAGES_API_TOKEN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_API_TOKEN=.*', 'IMAGES_API_TOKEN=%IMAGES_API_TOKEN%' | Set-Content '.env'"
    echo [92m✅ IMAGES_API_TOKEN updated[0m
)

echo.
echo [94m🔥 FIREBASE AUTH CONFIGURATION[0m
echo ===============================
echo [94mAPI_KEY[0m
echo [93mFirebase API key[0m
call :prompt_required API_KEY
if not "%API_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^API_KEY=.*', 'API_KEY=%API_KEY%' | Set-Content '.env'"
    echo [92m✅ API_KEY updated[0m
)

echo [94mAUTH_DOMAIN[0m
echo [93mFirebase auth domain (project-id.firebaseapp.com)[0m
call :prompt_required AUTH_DOMAIN
if not "%AUTH_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^AUTH_DOMAIN=.*', 'AUTH_DOMAIN=%AUTH_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ AUTH_DOMAIN updated[0m
)

echo [94mPROJECT_ID[0m
echo [93mFirebase project ID[0m
call :prompt_required PROJECT_ID
if not "%PROJECT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PROJECT_ID=.*', 'PROJECT_ID=%PROJECT_ID%' | Set-Content '.env'"
    echo [92m✅ PROJECT_ID updated[0m
)

echo [94mSTORAGE_BUCKET[0m
echo [93mFirebase storage bucket[0m
call :prompt_required STORAGE_BUCKET
if not "%STORAGE_BUCKET%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^STORAGE_BUCKET=.*', 'STORAGE_BUCKET=%STORAGE_BUCKET%' | Set-Content '.env'"
    echo [92m✅ STORAGE_BUCKET updated[0m
)

echo [94mMESSAGING_SENDER_ID[0m
echo [93mFirebase messaging sender ID[0m
call :prompt_required MESSAGING_SENDER_ID
if not "%MESSAGING_SENDER_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^MESSAGING_SENDER_ID=.*', 'MESSAGING_SENDER_ID=%MESSAGING_SENDER_ID%' | Set-Content '.env'"
    echo [92m✅ MESSAGING_SENDER_ID updated[0m
)

echo [94mAPP_ID[0m
echo [93mFirebase app ID[0m
call :prompt_required APP_ID
if not "%APP_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^APP_ID=.*', 'APP_ID=%APP_ID%' | Set-Content '.env'"
    echo [92m✅ APP_ID updated[0m
)

echo [94mMEASUREMENT_ID[0m
echo [93mFirebase measurement ID (optional)[0m
call :prompt_required MEASUREMENT_ID
if not "%MEASUREMENT_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^MEASUREMENT_ID=.*', 'MEASUREMENT_ID=%MEASUREMENT_ID%' | Set-Content '.env'"
    echo [92m✅ MEASUREMENT_ID updated[0m
)

echo.
echo [94m📄 PAGES CONFIGURATION[0m
echo ======================
echo [94mPAGES_PROJECT_NAME[0m
echo [93mYour Cloudflare Pages project name[0m
call :prompt_required PAGES_PROJECT_NAME
if not "%PAGES_PROJECT_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PAGES_PROJECT_NAME=.*', 'PAGES_PROJECT_NAME=%PAGES_PROJECT_NAME%' | Set-Content '.env'"
    echo [92m✅ PAGES_PROJECT_NAME updated[0m
)

echo [94mPAGES_CUSTOM_DOMAIN[0m
echo [93mYour custom domain (e.g., striae.org) - DO NOT include https://[0m
call :prompt_required PAGES_CUSTOM_DOMAIN
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
call :prompt_required KEYS_WORKER_NAME
if not "%KEYS_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KEYS_WORKER_NAME=.*', 'KEYS_WORKER_NAME=%KEYS_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ KEYS_WORKER_NAME updated[0m
)

echo [94mKEYS_WORKER_DOMAIN[0m
echo [93mKeys worker domain (e.g., keys.striae.org) - DO NOT include https://[0m
call :prompt_required KEYS_WORKER_DOMAIN
if not "%KEYS_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KEYS_WORKER_DOMAIN=.*', 'KEYS_WORKER_DOMAIN=%KEYS_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ KEYS_WORKER_DOMAIN updated[0m
)

echo [94mUSER_WORKER_NAME[0m
echo [93mUser worker name[0m
call :prompt_required USER_WORKER_NAME
if not "%USER_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^USER_WORKER_NAME=.*', 'USER_WORKER_NAME=%USER_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ USER_WORKER_NAME updated[0m
)

echo [94mUSER_WORKER_DOMAIN[0m
echo [93mUser worker domain (e.g., users.striae.org) - DO NOT include https://[0m
call :prompt_required USER_WORKER_DOMAIN
if not "%USER_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^USER_WORKER_DOMAIN=.*', 'USER_WORKER_DOMAIN=%USER_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ USER_WORKER_DOMAIN updated[0m
)

echo [94mDATA_WORKER_NAME[0m
echo [93mData worker name[0m
call :prompt_required DATA_WORKER_NAME
if not "%DATA_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^DATA_WORKER_NAME=.*', 'DATA_WORKER_NAME=%DATA_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ DATA_WORKER_NAME updated[0m
)

echo [94mDATA_WORKER_DOMAIN[0m
echo [93mData worker domain (e.g., data.striae.org) - DO NOT include https://[0m
call :prompt_required DATA_WORKER_DOMAIN
if not "%DATA_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^DATA_WORKER_DOMAIN=.*', 'DATA_WORKER_DOMAIN=%DATA_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ DATA_WORKER_DOMAIN updated[0m
)

echo [94mAUDIT_WORKER_NAME[0m
echo [93mAudit worker name[0m
call :prompt_required AUDIT_WORKER_NAME
if not "%AUDIT_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^AUDIT_WORKER_NAME=.*', 'AUDIT_WORKER_NAME=%AUDIT_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ AUDIT_WORKER_NAME updated[0m
)

echo [94mAUDIT_WORKER_DOMAIN[0m
echo [93mAudit worker domain (e.g., audit.striae.org) - DO NOT include https://[0m
call :prompt_required AUDIT_WORKER_DOMAIN
if not "%AUDIT_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^AUDIT_WORKER_DOMAIN=.*', 'AUDIT_WORKER_DOMAIN=%AUDIT_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ AUDIT_WORKER_DOMAIN updated[0m
)

echo [94mIMAGES_WORKER_NAME[0m
echo [93mImages worker name[0m
call :prompt_required IMAGES_WORKER_NAME
if not "%IMAGES_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_WORKER_NAME=.*', 'IMAGES_WORKER_NAME=%IMAGES_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ IMAGES_WORKER_NAME updated[0m
)

echo [94mIMAGES_WORKER_DOMAIN[0m
echo [93mImages worker domain (e.g., images.striae.org) - DO NOT include https://[0m
call :prompt_required IMAGES_WORKER_DOMAIN
if not "%IMAGES_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^IMAGES_WORKER_DOMAIN=.*', 'IMAGES_WORKER_DOMAIN=%IMAGES_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ IMAGES_WORKER_DOMAIN updated[0m
)

echo [94mTURNSTILE_WORKER_NAME[0m
echo [93mTurnstile worker name[0m
call :prompt_required TURNSTILE_WORKER_NAME
if not "%TURNSTILE_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^TURNSTILE_WORKER_NAME=.*', 'TURNSTILE_WORKER_NAME=%TURNSTILE_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ TURNSTILE_WORKER_NAME updated[0m
)

echo [94mTURNSTILE_WORKER_DOMAIN[0m
echo [93mTurnstile worker domain (e.g., turnstile.striae.org) - DO NOT include https://[0m
call :prompt_required TURNSTILE_WORKER_DOMAIN
if not "%TURNSTILE_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^TURNSTILE_WORKER_DOMAIN=.*', 'TURNSTILE_WORKER_DOMAIN=%TURNSTILE_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ TURNSTILE_WORKER_DOMAIN updated[0m
)

echo [94mPDF_WORKER_NAME[0m
echo [93mPDF worker name[0m
call :prompt_required PDF_WORKER_NAME
if not "%PDF_WORKER_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PDF_WORKER_NAME=.*', 'PDF_WORKER_NAME=%PDF_WORKER_NAME%' | Set-Content '.env'"
    echo [92m✅ PDF_WORKER_NAME updated[0m
)

echo [94mPDF_WORKER_DOMAIN[0m
echo [93mPDF worker domain (e.g., pdf.striae.org) - DO NOT include https://[0m
call :prompt_required PDF_WORKER_DOMAIN
if not "%PDF_WORKER_DOMAIN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^PDF_WORKER_DOMAIN=.*', 'PDF_WORKER_DOMAIN=%PDF_WORKER_DOMAIN%' | Set-Content '.env'"
    echo [92m✅ PDF_WORKER_DOMAIN updated[0m
)

echo.
echo [94m🗄️ STORAGE CONFIGURATION[0m
echo =========================
echo [94mDATA_BUCKET_NAME[0m
echo [93mYour R2 bucket name for case data storage[0m
call :prompt_required DATA_BUCKET_NAME
if not "%DATA_BUCKET_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^DATA_BUCKET_NAME=.*', 'DATA_BUCKET_NAME=%DATA_BUCKET_NAME%' | Set-Content '.env'"
    echo [92m✅ DATA_BUCKET_NAME updated[0m
)

echo [94mAUDIT_BUCKET_NAME[0m
echo [93mYour R2 bucket name for audit logs (separate from data bucket)[0m
call :prompt_required AUDIT_BUCKET_NAME
if not "%AUDIT_BUCKET_NAME%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^AUDIT_BUCKET_NAME=.*', 'AUDIT_BUCKET_NAME=%AUDIT_BUCKET_NAME%' | Set-Content '.env'"
    echo [92m✅ AUDIT_BUCKET_NAME updated[0m
)

echo [94mKV_STORE_ID[0m
echo [93mYour KV namespace ID (UUID format)[0m
call :prompt_required KV_STORE_ID
if not "%KV_STORE_ID%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^KV_STORE_ID=.*', 'KV_STORE_ID=%KV_STORE_ID%' | Set-Content '.env'"
    echo [92m✅ KV_STORE_ID updated[0m
)

echo.
echo [94m🔐 SERVICE-SPECIFIC SECRETS[0m
echo ============================
echo [94mKEYS_AUTH[0m
echo [93mKeys worker authentication token (generate with: openssl rand -hex 16)[0m

REM Check if KEYS_AUTH already exists in .env and is not a placeholder
call :is_placeholder "%KEYS_AUTH%"
if "%ERRORLEVEL%"=="1" set "KEYS_AUTH="
if "%UPDATE_ENV%"=="1" set "KEYS_AUTH="
if "%KEYS_AUTH%"=="" (
    echo [95mAuto-generating secret...[0m
    for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "KEYS_AUTH=%%i"
    if not "%KEYS_AUTH%"=="" (
        powershell -Command "(Get-Content '.env') -replace '^KEYS_AUTH=.*', 'KEYS_AUTH=%KEYS_AUTH%' | Set-Content '.env'"
        echo [92m✅ KEYS_AUTH auto-generated[0m
    ) else (
        echo [91m❌ Failed to auto-generate, please enter manually:[0m
        call :prompt_required KEYS_AUTH
        if not "%KEYS_AUTH%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^KEYS_AUTH=.*', 'KEYS_AUTH=%KEYS_AUTH%' | Set-Content '.env'"
            echo [92m✅ KEYS_AUTH updated[0m
        )
    )
) else (
    REM Current value exists
    echo [92mCurrent value: [HIDDEN][0m
    set /p "KEYS_AUTH_CHOICE=Generate new secret? (press Enter to keep current, or type 'y' to generate): "
    if /i "%KEYS_AUTH_CHOICE%"=="y" (
        echo [95mAuto-generating secret...[0m
        for /f %%i in ('openssl rand -hex 32 2^>nul ^|^| powershell -Command "[System.Web.Security.Membership]::GeneratePassword(64, 0) -replace '[^a-f0-9]', '' | ForEach-Object { $_.Substring(0, [Math]::Min(64, $_.Length)) }"') do set "KEYS_AUTH=%%i"
        if not "%KEYS_AUTH%"=="" (
            powershell -Command "(Get-Content '.env') -replace '^KEYS_AUTH=.*', 'KEYS_AUTH=%KEYS_AUTH%' | Set-Content '.env'"
            echo [92m✅ KEYS_AUTH auto-generated[0m
        ) else (
            echo [91m❌ Failed to auto-generate, please enter manually:[0m
            call :prompt_required KEYS_AUTH
            if not "%KEYS_AUTH%"=="" (
                powershell -Command "(Get-Content '.env') -replace '^KEYS_AUTH=.*', 'KEYS_AUTH=%KEYS_AUTH%' | Set-Content '.env'"
                echo [92m✅ KEYS_AUTH updated[0m
            )
        )
    ) else (
        echo [92m✅ Keeping current value for KEYS_AUTH[0m
    )
)

echo [94mACCOUNT_HASH[0m
echo [93mCloudflare Images Account Hash[0m
call :prompt_required ACCOUNT_HASH
if not "%ACCOUNT_HASH%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^ACCOUNT_HASH=.*', 'ACCOUNT_HASH=%ACCOUNT_HASH%' | Set-Content '.env'"
    echo [92m✅ ACCOUNT_HASH updated[0m
)

echo [94mAPI_TOKEN[0m
echo [93mCloudflare Images API token (for Images Worker)[0m
call :prompt_required API_TOKEN
if not "%API_TOKEN%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^API_TOKEN=.*', 'API_TOKEN=%API_TOKEN%' | Set-Content '.env'"
    echo [92m✅ API_TOKEN updated[0m
)

echo [94mHMAC_KEY[0m
echo [93mCloudflare Images HMAC signing key[0m
call :prompt_required HMAC_KEY
if not "%HMAC_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^HMAC_KEY=.*', 'HMAC_KEY=%HMAC_KEY%' | Set-Content '.env'"
    echo [92m✅ HMAC_KEY updated[0m
)

echo [94mCFT_PUBLIC_KEY[0m
echo [93mCloudflare Turnstile public key[0m
call :prompt_required CFT_PUBLIC_KEY
if not "%CFT_PUBLIC_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^CFT_PUBLIC_KEY=.*', 'CFT_PUBLIC_KEY=%CFT_PUBLIC_KEY%' | Set-Content '.env'"
    echo [92m✅ CFT_PUBLIC_KEY updated[0m
)

echo [94mCFT_SECRET_KEY[0m
echo [93mCloudflare Turnstile secret key[0m
call :prompt_required CFT_SECRET_KEY
if not "%CFT_SECRET_KEY%"=="" (
    powershell -Command "(Get-Content '.env') -replace '^CFT_SECRET_KEY=.*', 'CFT_SECRET_KEY=%CFT_SECRET_KEY%' | Set-Content '.env'"
    echo [92m✅ CFT_SECRET_KEY updated[0m
)

echo.
echo [92m🎉 Environment variables setup completed![0m
echo [94m📄 All values saved to .env file[0m

REM Validate after secrets have been configured
echo [93m🔍 Validating required environment variables...[0m
for %%V in (
    ACCOUNT_ID
    SL_API_KEY
    USER_DB_AUTH
    R2_KEY_SECRET
    IMAGES_API_TOKEN
    API_KEY
    AUTH_DOMAIN
    PROJECT_ID
    STORAGE_BUCKET
    MESSAGING_SENDER_ID
    APP_ID
    MEASUREMENT_ID
    PAGES_PROJECT_NAME
    PAGES_CUSTOM_DOMAIN
    KEYS_WORKER_NAME
    USER_WORKER_NAME
    DATA_WORKER_NAME
    AUDIT_WORKER_NAME
    IMAGES_WORKER_NAME
    TURNSTILE_WORKER_NAME
    PDF_WORKER_NAME
    KEYS_WORKER_DOMAIN
    USER_WORKER_DOMAIN
    DATA_WORKER_DOMAIN
    AUDIT_WORKER_DOMAIN
    IMAGES_WORKER_DOMAIN
    TURNSTILE_WORKER_DOMAIN
    PDF_WORKER_DOMAIN
    DATA_BUCKET_NAME
    AUDIT_BUCKET_NAME
    KV_STORE_ID
    KEYS_AUTH
    ACCOUNT_HASH
    API_TOKEN
    HMAC_KEY
    CFT_PUBLIC_KEY
    CFT_SECRET_KEY
) do (
    call :require_env_value %%V
)
echo [92m✅ All required environment variables validated[0m

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

REM Audit Worker
if exist "workers\audit-worker\wrangler.jsonc" (
    echo [93m  Updating audit-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/audit-worker/wrangler.jsonc') -replace '\"AUDIT_WORKER_NAME\"', '\"%AUDIT_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"AUDIT_WORKER_DOMAIN\"', '\"%AUDIT_WORKER_DOMAIN%\"' -replace '\"AUDIT_BUCKET_NAME\"', '\"%AUDIT_BUCKET_NAME%\"' | Set-Content 'workers/audit-worker/wrangler.jsonc'"
    echo [92m    ✅ audit-worker configuration updated[0m
)

REM Update audit-worker source file placeholders
if exist "workers\audit-worker\src\audit-worker.ts" (
    echo [93m  Updating audit-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/audit-worker/src/audit-worker.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/audit-worker/src/audit-worker.ts'"
    echo [92m    ✅ audit-worker source placeholders updated[0m
)

REM Data Worker
if exist "workers\data-worker\wrangler.jsonc" (
    echo [93m  Updating data-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/data-worker/wrangler.jsonc') -replace '\"DATA_WORKER_NAME\"', '\"%DATA_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"DATA_WORKER_DOMAIN\"', '\"%DATA_WORKER_DOMAIN%\"' -replace '\"DATA_BUCKET_NAME\"', '\"%DATA_BUCKET_NAME%\"' | Set-Content 'workers/data-worker/wrangler.jsonc'"
    echo [92m    ✅ data-worker configuration updated[0m
)

REM Update data-worker source file placeholders
if exist "workers\data-worker\src\data-worker.ts" (
    echo [93m  Updating data-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/data-worker/src/data-worker.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/data-worker/src/data-worker.ts'"
    echo [92m    ✅ data-worker source placeholders updated[0m
)

REM Image Worker
if exist "workers\image-worker\wrangler.jsonc" (
    echo [93m  Updating image-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/image-worker/wrangler.jsonc') -replace '\"IMAGES_WORKER_NAME\"', '\"%IMAGES_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"IMAGES_WORKER_DOMAIN\"', '\"%IMAGES_WORKER_DOMAIN%\"' | Set-Content 'workers/image-worker/wrangler.jsonc'"
    echo [92m    ✅ image-worker configuration updated[0m
)

REM Update image-worker source file placeholders
if exist "workers\image-worker\src\image-worker.ts" (
    echo [93m  Updating image-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/image-worker/src/image-worker.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/image-worker/src/image-worker.ts'"
    echo [92m    ✅ image-worker source placeholders updated[0m
)

REM Keys Worker
if exist "workers\keys-worker\wrangler.jsonc" (
    echo [93m  Updating keys-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/keys-worker/wrangler.jsonc') -replace '\"KEYS_WORKER_NAME\"', '\"%KEYS_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"KEYS_WORKER_DOMAIN\"', '\"%KEYS_WORKER_DOMAIN%\"' | Set-Content 'workers/keys-worker/wrangler.jsonc'"
    echo [92m    ✅ keys-worker configuration updated[0m
)

REM Update keys-worker source file placeholders
if exist "workers\keys-worker\src\keys.ts" (
    echo [93m  Updating keys-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/keys-worker/src/keys.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/keys-worker/src/keys.ts'"
    echo [92m    ✅ keys-worker source placeholders updated[0m
)

REM PDF Worker
if exist "workers\pdf-worker\wrangler.jsonc" (
    echo [93m  Updating pdf-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/pdf-worker/wrangler.jsonc') -replace '\"PDF_WORKER_NAME\"', '\"%PDF_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"PDF_WORKER_DOMAIN\"', '\"%PDF_WORKER_DOMAIN%\"' | Set-Content 'workers/pdf-worker/wrangler.jsonc'"
    echo [92m    ✅ pdf-worker configuration updated[0m
)

REM Update pdf-worker source file placeholders
if exist "workers\pdf-worker\src\pdf-worker.ts" (
    echo [93m  Updating pdf-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/pdf-worker/src/pdf-worker.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/pdf-worker/src/pdf-worker.ts'"
    echo [92m    ✅ pdf-worker source placeholders updated[0m
)

REM Turnstile Worker
if exist "workers\turnstile-worker\wrangler.jsonc" (
    echo [93m  Updating turnstile-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/turnstile-worker/wrangler.jsonc') -replace '\"TURNSTILE_WORKER_NAME\"', '\"%TURNSTILE_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"TURNSTILE_WORKER_DOMAIN\"', '\"%TURNSTILE_WORKER_DOMAIN%\"' | Set-Content 'workers/turnstile-worker/wrangler.jsonc'"
    echo [92m    ✅ turnstile-worker configuration updated[0m
)

REM Update turnstile-worker source file placeholders
if exist "workers\turnstile-worker\src\turnstile.ts" (
    echo [93m  Updating turnstile-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/turnstile-worker/src/turnstile.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' | Set-Content 'workers/turnstile-worker/src/turnstile.ts'"
    echo [92m    ✅ turnstile-worker source placeholders updated[0m
)

REM User Worker
if exist "workers\user-worker\wrangler.jsonc" (
    echo [93m  Updating user-worker/wrangler.jsonc...[0m
    powershell -Command "(Get-Content 'workers/user-worker/wrangler.jsonc') -replace '\"USER_WORKER_NAME\"', '\"%USER_WORKER_NAME%\"' -replace '\"ACCOUNT_ID\"', '\"%ACCOUNT_ID%\"' -replace '\"USER_WORKER_DOMAIN\"', '\"%USER_WORKER_DOMAIN%\"' -replace '\"KV_STORE_ID\"', '\"%KV_STORE_ID%\"' | Set-Content 'workers/user-worker/wrangler.jsonc'"
    echo [92m    ✅ user-worker configuration updated[0m
)

REM Update user-worker source file placeholders
if exist "workers\user-worker\src\user-worker.ts" (
    echo [93m  Updating user-worker source placeholders...[0m
    powershell -Command "(Get-Content 'workers/user-worker/src/user-worker.ts') -replace '''PAGES_CUSTOM_DOMAIN''', '''https://%PAGES_CUSTOM_DOMAIN%''' -replace '''DATA_WORKER_DOMAIN''', '''https://%DATA_WORKER_DOMAIN%''' -replace '''IMAGES_WORKER_DOMAIN''', '''https://%IMAGES_WORKER_DOMAIN%''' | Set-Content 'workers/user-worker/src/user-worker.ts'"
    echo [92m    ✅ user-worker source placeholders updated[0m
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
    powershell -Command "(Get-Content 'app/config/config.json') -replace '\"PAGES_CUSTOM_DOMAIN\"', '\"https://%PAGES_CUSTOM_DOMAIN%\"' -replace '\"DATA_WORKER_CUSTOM_DOMAIN\"', '\"https://%DATA_WORKER_DOMAIN%\"' -replace '\"AUDIT_WORKER_CUSTOM_DOMAIN\"', '\"https://%AUDIT_WORKER_DOMAIN%\"' -replace '\"KEYS_WORKER_CUSTOM_DOMAIN\"', '\"https://%KEYS_WORKER_DOMAIN%\"' -replace '\"IMAGE_WORKER_CUSTOM_DOMAIN\"', '\"https://%IMAGES_WORKER_DOMAIN%\"' -replace '\"USER_WORKER_CUSTOM_DOMAIN\"', '\"https://%USER_WORKER_DOMAIN%\"' -replace '\"PDF_WORKER_CUSTOM_DOMAIN\"', '\"https://%PDF_WORKER_DOMAIN%\"' -replace '\"YOUR_KEYS_AUTH_TOKEN\"', '\"%KEYS_AUTH%\"' | Set-Content 'app/config/config.json'"
    echo [92m      ✅ app config.json updated[0m
)

REM Update app/config/meta-config.json
if exist "app\config\meta-config.json" (
    echo [93m    Updating app/config/meta-config.json...[0m
    powershell -Command "(Get-Content 'app/config/meta-config.json') -replace '\"PAGES_CUSTOM_DOMAIN\"', '\"https://%PAGES_CUSTOM_DOMAIN%\"' | Set-Content 'app/config/meta-config.json'"
    echo [92m      ✅ app meta-config.json updated[0m
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
    powershell -Command "$content = Get-Content 'app/components/turnstile/keys.json' -Raw; $content = $content -replace '\"CFT_PUBLIC_KEY\"\s*:\s*\"[^\"]*\"', '\"CFT_PUBLIC_KEY\": \"%CFT_PUBLIC_KEY%\"'; $content = $content -replace '\"worker_url\"\s*:\s*\"[^\"]*\"', '\"worker_url\": \"https://%TURNSTILE_WORKER_DOMAIN%\"'; Set-Content -Path 'app/components/turnstile/keys.json' -Value $content -NoNewline"
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

goto :eof

:is_placeholder
set "value=%~1"
if "%value%"=="" exit /b 0
echo(%value%| findstr /i /r "^your_.*_here$" >nul
if "%ERRORLEVEL%"=="0" exit /b 1
exit /b 0

:prompt_required
set "var_name=%~1"
set "current_value=!%var_name%!"
set "requires_value=0"
call :is_placeholder "!current_value!"
if "%ERRORLEVEL%"=="1" set "requires_value=1"
if "%UPDATE_ENV%"=="1" (
    set "requires_value=1"
    set "current_value="
)
:prompt_required_loop
set /p "%var_name%=Enter value: "
if "!%var_name%!"=="" (
    if "%requires_value%"=="1" (
        echo [91m❌ %var_name% cannot be empty or a placeholder.[0m
        goto prompt_required_loop
    ) else (
        set "%var_name%=!current_value!"
    )
)
call :is_placeholder "!%var_name%!"
if "%ERRORLEVEL%"=="1" (
    echo [91m❌ %var_name% cannot be a placeholder.[0m
    set "%var_name%="
    goto prompt_required_loop
)
exit /b 0

:require_env_value
set "var_name=%~1"
set "current_value=!%var_name%!"
call :is_placeholder "!current_value!"
if "%ERRORLEVEL%"=="1" set "current_value="
if "%current_value%"=="" (
    echo [91m❌ Error: %var_name% is not set in .env file or is a placeholder[0m
    exit /b 1
)
exit /b 0