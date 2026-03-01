# ======================================
# STRIAE PAGES DEPLOYMENT SCRIPT
# ======================================
# This script deploys the Striae frontend to Cloudflare Pages

# Colors for output
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Reset = "`e[0m"

Write-Host "${Blue}📄 Striae Pages Deployment Script${Reset}"
Write-Host "=================================="

# Deploy to Cloudflare Pages (includes build step)
Write-Host "${Yellow}🚀 Building and deploying to Cloudflare Pages...${Reset}"
$deployResult = Start-Process -FilePath "npm" -ArgumentList "run", "deploy" -Wait -PassThru -NoNewWindow
if ($deployResult.ExitCode -ne 0) {
    Write-Host "${Red}❌ Deployment failed!${Reset}"
    exit 1
}

Write-Host "${Green}✅ Pages deployment completed successfully${Reset}"

Write-Host ""
Write-Host "${Blue}💡 Next Steps:${Reset}"
Write-Host "   1. Deploy Pages secrets: npm run deploy-pages:secrets"
Write-Host "   2. Configure custom domain (optional)"
Write-Host "   3. Test your application"

Write-Host ""
Write-Host "${Green}✨ Pages deployment complete!${Reset}"
