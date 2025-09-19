@echo off
REM ======================================
REM STRIAE WORKER SECRETS DEPLOYMENT SCRIPT  
REM ======================================
REM This script deploys environment variables/secrets to Cloudflare Workers
REM Run this AFTER workers are deployed to avoid deployment errors

setlocal enabledelayedexpansion

echo [94m🔐 Striae Worker Secrets Deployment Script[0m
echo ==========================================

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

echo.
echo [94m🔐 Deploying secrets to workers...[0m

REM Check if workers are configured
echo [93m🔍 Checking worker configurations...[0m
set workers_configured=0
set total_workers=6

for /d %%d in (workers\*) do (
    if exist "%%d\wrangler.jsonc" set /a workers_configured+=1
    if exist "%%d\wrangler.toml" set /a workers_configured+=1
)

if %workers_configured%==0 (
    echo [91m❌ No workers are configured![0m
    echo [93m   Please copy wrangler.jsonc.example to wrangler.jsonc in each worker directory and configure them.[0m
    echo [93m   Then run this script again.[0m
    exit /b 1
)

if %workers_configured% lss %total_workers% (
    echo [93m⚠️  Warning: Only %workers_configured% of %total_workers% workers are configured.[0m
    echo [93m   Some workers may not have their secrets deployed.[0m
)

REM Keys Worker
echo.
echo [94m🔧 Setting secrets for Keys Worker...[0m
if exist "workers\keys-worker\wrangler.jsonc" (
    cd workers\keys-worker
    
    REM Get worker name from config
    for /f "tokens=2 delims=:" %%a in ('findstr /r "\"name\"" wrangler.jsonc') do (
        set "worker_name=%%a"
        set "worker_name=!worker_name: =!"
        set "worker_name=!worker_name:"=!"
        set "worker_name=!worker_name:,=!"
    )
    
    echo [93m  Using worker name: !worker_name![0m
    echo [93m  Setting KEYS_AUTH...[0m
    echo !KEYS_AUTH! | wrangler secret put KEYS_AUTH --name "!worker_name!"
    
    echo [93m  Setting USER_DB_AUTH...[0m
    echo !USER_DB_AUTH! | wrangler secret put USER_DB_AUTH --name "!worker_name!"
    
    echo [93m  Setting R2_KEY_SECRET...[0m
    echo !R2_KEY_SECRET! | wrangler secret put R2_KEY_SECRET --name "!worker_name!"
    
    echo [93m  Setting ACCOUNT_HASH...[0m
    echo !ACCOUNT_HASH! | wrangler secret put ACCOUNT_HASH --name "!worker_name!"
    
    echo [93m  Setting IMAGES_API_TOKEN...[0m
    echo !IMAGES_API_TOKEN! | wrangler secret put IMAGES_API_TOKEN --name "!worker_name!"
    
    echo [92m✅ Keys Worker secrets configured[0m
    cd ..\..
) else (
    echo [93m⚠️  Skipping Keys Worker (not configured)[0m
)

REM User Worker
echo.
echo [94m🔧 Setting secrets for User Worker...[0m
if exist "workers\user-worker\wrangler.jsonc" (
    cd workers\user-worker
    
    REM Get worker name from config
    for /f "tokens=2 delims=:" %%a in ('findstr /r "\"name\"" wrangler.jsonc') do (
        set "worker_name=%%a"
        set "worker_name=!worker_name: =!"
        set "worker_name=!worker_name:"=!"
        set "worker_name=!worker_name:,=!"
    )
    
    echo [93m  Using worker name: !worker_name![0m
    echo [93m  Setting USER_DB_AUTH...[0m
    echo !USER_DB_AUTH! | wrangler secret put USER_DB_AUTH --name "!worker_name!"
    
    echo [93m  Setting SL_API_KEY...[0m
    echo !SL_API_KEY! | wrangler secret put SL_API_KEY --name "!worker_name!"
    
    echo [93m  Setting R2_KEY_SECRET...[0m
    echo !R2_KEY_SECRET! | wrangler secret put R2_KEY_SECRET --name "!worker_name!"
    
    echo [93m  Setting IMAGES_API_TOKEN...[0m
    echo !IMAGES_API_TOKEN! | wrangler secret put IMAGES_API_TOKEN --name "!worker_name!"
    
    echo [92m✅ User Worker secrets configured[0m
    cd ..\..
) else (
    echo [93m⚠️  Skipping User Worker (not configured)[0m
)

REM Data Worker
echo.
echo [94m🔧 Setting secrets for Data Worker...[0m
if exist "workers\data-worker\wrangler.jsonc" (
    cd workers\data-worker
    
    REM Get worker name from config
    for /f "tokens=2 delims=:" %%a in ('findstr /r "\"name\"" wrangler.jsonc') do (
        set "worker_name=%%a"
        set "worker_name=!worker_name: =!"
        set "worker_name=!worker_name:"=!"
        set "worker_name=!worker_name:,=!"
    )
    
    echo [93m  Using worker name: !worker_name![0m
    echo [93m  Setting R2_KEY_SECRET...[0m
    echo !R2_KEY_SECRET! | wrangler secret put R2_KEY_SECRET --name "!worker_name!"
    
    echo [92m✅ Data Worker secrets configured[0m
    cd ..\..
) else (
    echo [93m⚠️  Skipping Data Worker (not configured)[0m
)

REM Images Worker
echo.
echo [94m🔧 Setting secrets for Images Worker...[0m
if exist "workers\image-worker\wrangler.jsonc" (
    cd workers\image-worker
    
    REM Get worker name from config
    for /f "tokens=2 delims=:" %%a in ('findstr /r "\"name\"" wrangler.jsonc') do (
        set "worker_name=%%a"
        set "worker_name=!worker_name: =!"
        set "worker_name=!worker_name:"=!"
        set "worker_name=!worker_name:,=!"
    )
    
    echo [93m  Using worker name: !worker_name![0m
    echo [93m  Setting ACCOUNT_ID...[0m
    echo !ACCOUNT_ID! | wrangler secret put ACCOUNT_ID --name "!worker_name!"
    
    echo [93m  Setting API_TOKEN...[0m
    echo !API_TOKEN! | wrangler secret put API_TOKEN --name "!worker_name!"
    
    echo [93m  Setting HMAC_KEY...[0m
    echo !HMAC_KEY! | wrangler secret put HMAC_KEY --name "!worker_name!"
    
    echo [92m✅ Images Worker secrets configured[0m
    cd ..\..
) else (
    echo [93m⚠️  Skipping Images Worker (not configured)[0m
)

REM Turnstile Worker
echo.
echo [94m🔧 Setting secrets for Turnstile Worker...[0m
if exist "workers\turnstile-worker\wrangler.jsonc" (
    cd workers\turnstile-worker
    
    REM Get worker name from config
    for /f "tokens=2 delims=:" %%a in ('findstr /r "\"name\"" wrangler.jsonc') do (
        set "worker_name=%%a"
        set "worker_name=!worker_name: =!"
        set "worker_name=!worker_name:"=!"
        set "worker_name=!worker_name:,=!"
    )
    
    echo [93m  Using worker name: !worker_name![0m
    echo [93m  Setting CFT_SECRET_KEY...[0m
    echo !CFT_SECRET_KEY! | wrangler secret put CFT_SECRET_KEY --name "!worker_name!"
    
    echo [92m✅ Turnstile Worker secrets configured[0m
    cd ..\..
) else (
    echo [93m⚠️  Skipping Turnstile Worker (not configured)[0m
)

REM PDF Worker (no secrets needed)
echo.
echo [94m📄 PDF Worker: No environment variables needed[0m

echo.
echo [92m🎉 Worker secrets deployment completed![0m

REM Remind about Pages environment variables
echo.
echo [93m⚠️  IMPORTANT: Don't forget to set these variables in Cloudflare Pages Dashboard:[0m
echo    - SL_API_KEY

echo.
echo [93m⚠️  WORKER CONFIGURATION REMINDERS:[0m
echo    - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory
echo    - Configure KV namespace ID in workers\user-worker\wrangler.jsonc
echo    - Configure R2 bucket name in workers\data-worker\wrangler.jsonc
echo    - Update ACCOUNT_ID and custom domains in all worker configurations

echo.
echo [94m📝 For manual deployment, use these commands:[0m
echo    cd workers\[worker-name]
echo    wrangler secret put VARIABLE_NAME --name [worker-name]
echo.
echo [92m✨ Worker secrets deployment complete![0m