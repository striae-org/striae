@echo off
setlocal enabledelayedexpansion

REM ======================================
REM STRIAE PAGES SECRETS DEPLOYMENT SCRIPT
REM ======================================
REM This script deploys environment variables to Cloudflare Pages
REM Run this AFTER the Pages project has been deployed

echo [94m📄 Striae Pages Environment Variables Deployment Script[0m
echo ===========================================================

REM Check if .env file exists
if not exist ".env" (
    echo [91m❌ Error: .env file not found![0m
    echo Please copy .env.example to .env and fill in your values.
    exit /b 1
)

echo [93m📖 Loading environment variables from .env...[0m

REM Read .env file and set variables
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if not "!line!"=="" (
            set "%%a=%%b"
        )
    )
)

REM Check required Pages variables
echo [93m🔍 Validating Pages environment variables...[0m

if "%SL_API_KEY%"=="" (
    echo [91m❌ Error: SL_API_KEY is not set in .env file[0m
    exit /b 1
)

echo [92m✅ All Pages variables found[0m

REM Get project name from wrangler.toml
echo [93m🔍 Detecting Pages project name...[0m

if not exist "wrangler.toml" (
    echo [91m❌ Error: wrangler.toml not found![0m
    echo [93m   Please ensure wrangler.toml exists and has a 'name' field configured.[0m
    exit /b 1
)

REM Extract project name from wrangler.toml
for /f "tokens=2 delims==" %%a in ('findstr /r "^name" wrangler.toml') do (
    set "PROJECT_NAME=%%a"
    set "PROJECT_NAME=!PROJECT_NAME: =!"
    set "PROJECT_NAME=!PROJECT_NAME:"=!"
)

if "%PROJECT_NAME%"=="" (
    echo [91m❌ Error: Could not determine Pages project name from wrangler.toml[0m
    echo [93m   Please ensure wrangler.toml has a 'name' field configured.[0m
    exit /b 1
)

echo [93m  Using Pages project: %PROJECT_NAME%[0m

REM Deploy secrets to Cloudflare Pages
echo.
echo [94m🔐 Deploying secrets to Cloudflare Pages...[0m

echo [93m  Setting SL_API_KEY...[0m
echo %SL_API_KEY% | wrangler pages secret put SL_API_KEY --project-name %PROJECT_NAME%
if errorlevel 1 (
    echo [91m❌ Failed to set SL_API_KEY for Pages project %PROJECT_NAME%[0m
    exit /b 1
)

echo.
echo [92m🎉 Pages secrets deployment completed![0m

echo.
echo [93m📝 Variables deployed to Pages project '%PROJECT_NAME%':[0m
echo    ✅ SL_API_KEY

echo.
echo [94m💡 Additional Notes:[0m
echo    - These variables are now available in your Remix application
echo    - You can verify them in the Cloudflare Pages dashboard
echo    - For manual deployment, use: wrangler pages secret put VARIABLE_NAME --project-name %PROJECT_NAME%

echo.
echo [92m✨ Pages environment setup complete![0m
