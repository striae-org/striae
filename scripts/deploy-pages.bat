@echo off
setlocal enabledelayedexpansion

REM ======================================
REM STRIAE PAGES DEPLOYMENT SCRIPT
REM ======================================
REM This script deploys the Striae frontend to Cloudflare Pages

echo [94m📄 Striae Pages Deployment Script[0m
echo ==================================

REM Deploy to Cloudflare Pages (includes build step)
echo [93m🚀 Building and deploying to Cloudflare Pages...[0m
call npm run deploy
if errorlevel 1 (
    echo [91m❌ Deployment failed![0m
    exit /b 1
)

echo [92m✅ Pages deployment completed successfully[0m

echo.
echo [94m💡 Next Steps:[0m
echo    1. Deploy Pages secrets: npm run deploy-pages:secrets
echo    2. Configure custom domain (optional)
echo    3. Test your application

echo.
echo [92m✨ Pages deployment complete![0m
