#!/bin/bash

# Copyright (c) 2025 Stephen J. Lu
# SPDX-License-Identifier: Apache-2.0

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found. Run deploy-config first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
set -a
# shellcheck disable=SC1091
source .env
set +a

# Disambiguates the target account for `wrangler pages deploy` — wrangler does not read
# account_id from wrangler.toml for Pages subcommands, and can't prompt non-interactively.
ACCOUNT_ID=$(printf '%s' "${ACCOUNT_ID:-}" | tr -d '\r')
if [ -z "${ACCOUNT_ID:-}" ]; then
    echo -e "${RED}❌ Error: ACCOUNT_ID is missing in .env${NC}"
    exit 1
fi
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

# Deploy to Cloudflare Pages (includes build step)
echo -e "${YELLOW}🛡️ Running admin-service security guard before Pages deployment...${NC}"
if ! npm run security:admin-service-guard; then
    echo -e "${RED}❌ Admin-service security guard failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Admin-service security guard passed${NC}"
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
