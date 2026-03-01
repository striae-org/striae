@echo off
REM ======================================
REM STRIAE WORKERS NPM INSTALL SCRIPT
REM ======================================
REM This script installs npm dependencies for all Striae workers:
REM 1. audit-worker
REM 2. data-worker
REM 3. image-worker
REM 4. keys-worker
REM 5. pdf-worker
REM 6. turnstile-worker
REM 7. user-worker

echo [94m📦 Striae Workers NPM Install Script[0m
echo ========================================
echo.

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR:~0,-9%
set WORKERS_DIR=%PROJECT_ROOT%workers

REM Check if workers directory exists
if not exist "%WORKERS_DIR%" (
    echo [91m❌ Error: Workers directory not found at %WORKERS_DIR%[0m
    exit /b 1
)

echo [95mInstalling npm dependencies for all workers...[0m
echo.

REM List of workers
set WORKERS=audit-worker data-worker image-worker keys-worker pdf-worker turnstile-worker user-worker
set current=0
set total=7

REM Install dependencies for each worker
for %%w in (%WORKERS%) do (
    set /a current+=1
    set worker_path=%WORKERS_DIR%\%%w
    
    echo [93m[!current!/!total!] Installing dependencies for %%w...[0m
    
    REM Check if worker directory exists
    if not exist "!worker_path!" (
        echo [91m❌ Warning: Worker directory not found: !worker_path![0m
        goto :continue
    )
    
    REM Check if package.json exists
    if not exist "!worker_path!\package.json" (
        echo [91m❌ Warning: package.json not found in !worker_path![0m
        goto :continue
    )
    
    REM Change to worker directory and install dependencies
    cd /d "!worker_path!"
    
    echo    Running npm install in !worker_path!...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [91m❌ Failed to install dependencies for %%w[0m
        exit /b 1
    )
    
    echo [92m✅ Successfully installed dependencies for %%w[0m
    echo.
    
    :continue
)

REM Return to original directory
cd /d "%PROJECT_ROOT%"

echo [92m🎉 All worker dependencies installed successfully![0m
echo.
echo [94mSummary:[0m
echo - Installed dependencies for %total% workers
echo - All workers are ready for development/deployment
echo.
