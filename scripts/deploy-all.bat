@echo off
REM ======================================
REM STRIAE COMPLETE DEPLOYMENT SCRIPT
REM ======================================
REM This script deploys the entire Striae application:
REM 1. Configuration setup (copy configs, replace placeholders)
REM 2. Worker dependencies installation
REM 3. Workers (all 7 workers)
REM 4. Worker secrets/environment variables
REM 5. Pages (frontend)
REM 6. Pages secrets/environment variables

echo [94m🚀 Striae Complete Deployment Script[0m
echo ======================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0

REM Step 1: Configuration Setup
echo [95mStep 1/6: Configuration Setup[0m
echo ------------------------------
echo [93m⚙️  Setting up configuration files and replacing placeholders...[0m
call "%SCRIPT_DIR%deploy-config.bat"
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Configuration setup failed![0m
    echo [93mPlease check your .env file and configuration before proceeding.[0m
    exit /b 1
)
echo [92m✅ Configuration setup completed successfully[0m
echo.

REM Step 2: Install Worker Dependencies
echo [95mStep 2/6: Installing Worker Dependencies[0m
echo ----------------------------------------
echo [93m📦 Installing npm dependencies for all workers...[0m
call "%SCRIPT_DIR%install-workers.bat"
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Worker dependencies installation failed![0m
    exit /b 1
)
echo [92m✅ All worker dependencies installed successfully[0m
echo.

REM Step 3: Deploy Workers
echo [95mStep 3/6: Deploying Workers[0m
echo ----------------------------
echo [93m🔧 Deploying all 7 Cloudflare Workers...[0m
call npm run deploy-workers
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Worker deployment failed![0m
    exit /b 1
)
echo [92m✅ All workers deployed successfully[0m
echo.

REM Step 4: Deploy Worker Secrets
echo [95mStep 4/6: Deploying Worker Secrets[0m
echo -----------------------------------
echo [93m🔐 Deploying worker environment variables...[0m
call "%SCRIPT_DIR%deploy-worker-secrets.bat"
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Worker secrets deployment failed![0m
    exit /b 1
)
echo [92m✅ Worker secrets deployed successfully[0m
echo.

REM Step 5: Deploy Pages
echo [95mStep 5/6: Deploying Pages[0m
echo --------------------------
echo [93m🌐 Building and deploying Pages...[0m
call npm run deploy-pages
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Pages deployment failed![0m
    exit /b 1
)
echo [92m✅ Pages deployed successfully[0m
echo.

REM Step 6: Deploy Pages Secrets
echo [95mStep 6/6: Deploying Pages Secrets[0m
echo ----------------------------------
echo [93m🔑 Deploying Pages environment variables...[0m
call npm run deploy-pages:secrets
if %ERRORLEVEL% neq 0 (
    echo [91m❌ Pages secrets deployment failed![0m
    exit /b 1
)
echo [92m✅ Pages secrets deployed successfully[0m
echo.

REM Success summary
echo ==========================================
echo [92m🎉 COMPLETE DEPLOYMENT SUCCESSFUL! 🎉[0m
echo ==========================================
echo.
echo [94mDeployed Components:[0m
echo   ✅ Configuration setup and placeholder replacement
echo   ✅ Worker dependencies (npm install)
echo   ✅ 7 Cloudflare Workers
echo   ✅ Worker environment variables
echo   ✅ Cloudflare Pages frontend
echo   ✅ Pages environment variables
echo.
echo [94mNext Steps:[0m
echo   1. Test your application endpoints
echo   2. Verify all services are working
echo   3. Configure custom domain (optional)
echo.
echo [92m✨ Your Striae application is now fully deployed![0m