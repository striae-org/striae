#!/bin/bash

# ======================================
# STRIAE PAGES DEPLOYMENT SCRIPT
# ======================================
# This script deploys the Striae frontend to Cloudflare Pages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📄 Striae Pages Deployment Script${NC}"
echo "=================================="

# Deploy to Cloudflare Pages (includes build step)
echo -e "${YELLOW}🚀 Building and deploying to Cloudflare Pages...${NC}"
if ! npm run deploy; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pages deployment completed successfully${NC}"

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo "   1. Test your application"
echo "   2. Configure custom domain (optional)"
echo "   3. Verify Pages environment variables in Cloudflare dashboard"

echo -e "\n${GREEN}✨ Pages deployment complete!${NC}"
