#!/bin/bash

# ======================================
# STRIAE COMPLETE DEPLOYMENT SCRIPT
# ======================================
# This script deploys the entire Striae application:
# 1. Configuration setup (copy configs, replace placeholders)
# 2. Worker dependencies installation
# 3. Workers (all 5 workers)
# 4. Worker secrets/environment variables
# 5. Pages (frontend)

set -e
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Striae Complete Deployment Script${NC}"
echo "======================================"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

trap 'echo -e "\n${RED}❌ deploy-all.sh failed near line ${LINENO}${NC}"' ERR

require_command() {
    local cmd=$1
    if ! command -v "$cmd" > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: required command '$cmd' is not installed or not in PATH${NC}"
        exit 1
    fi
}

assert_file_exists() {
    local file_path=$1
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ Error: required file is missing: $file_path${NC}"
        exit 1
    fi
}

run_config_checkpoint() {
    echo -e "${YELLOW}🧪 Running configuration checkpoint validation...${NC}"
    if ! bash "$SCRIPT_DIR/deploy-config.sh" --validate-only; then
        echo -e "${RED}❌ Configuration checkpoint validation failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Configuration checkpoint validation passed${NC}"
}

echo -e "${BLUE}🔍 Running deployment preflight checks...${NC}"
require_command bash
require_command node
require_command npm
require_command wrangler

assert_file_exists "$SCRIPT_DIR/deploy-config.sh"
assert_file_exists "$SCRIPT_DIR/install-workers.sh"
assert_file_exists "$SCRIPT_DIR/deploy-worker-secrets.sh"
assert_file_exists "package.json"

if [ ! -f ".env" ] && [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Error: neither .env nor .env.example was found in project root${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Preflight checks passed${NC}"
echo ""

# Step 1: Configuration Setup
echo -e "${PURPLE}Step 1/5: Configuration Setup${NC}"
echo "------------------------------"
echo -e "${YELLOW}⚙️  Setting up configuration files and replacing placeholders...${NC}"
if ! bash "$SCRIPT_DIR/deploy-config.sh"; then
    echo -e "${RED}❌ Configuration setup failed!${NC}"
    echo -e "${YELLOW}Please check your .env file and configuration before proceeding.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration setup completed successfully${NC}"
run_config_checkpoint
echo ""

# Step 2: Install Worker Dependencies
echo -e "${PURPLE}Step 2/5: Installing Worker Dependencies${NC}"
echo "----------------------------------------"
echo -e "${YELLOW}📦 Installing npm dependencies for all workers...${NC}"
if ! bash "$SCRIPT_DIR/install-workers.sh"; then
    echo -e "${RED}❌ Worker dependencies installation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All worker dependencies installed successfully${NC}"
echo ""

# Step 3: Deploy Workers
echo -e "${PURPLE}Step 3/5: Deploying Workers${NC}"
echo "----------------------------"
echo -e "${YELLOW}🔧 Deploying all 5 Cloudflare Workers...${NC}"
if ! npm run deploy-workers; then
    echo -e "${RED}❌ Worker deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All workers deployed successfully${NC}"
echo ""

# Step 4: Deploy Worker Secrets
echo -e "${PURPLE}Step 4/5: Deploying Worker Secrets${NC}"
echo "-----------------------------------"
echo -e "${YELLOW}🔐 Deploying worker environment variables...${NC}"
if ! bash "$SCRIPT_DIR/deploy-worker-secrets.sh"; then
    echo -e "${RED}❌ Worker secrets deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Worker secrets deployed successfully${NC}"
echo ""

# Step 5: Deploy Pages
echo -e "${PURPLE}Step 5/5: Deploying Pages${NC}"
echo "--------------------------"
echo -e "${YELLOW}🌐 Building and deploying Pages...${NC}"
if ! npm run deploy-pages; then
    echo -e "${RED}❌ Pages deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pages deployed successfully${NC}"
echo ""

# Success summary
echo "=========================================="
echo -e "${GREEN}🎉 COMPLETE DEPLOYMENT SUCCESSFUL! 🎉${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Deployed Components:${NC}"
echo "  ✅ Worker dependencies (npm install)"
echo "  ✅ 5 Cloudflare Workers"
echo "  ✅ Worker environment variables"
echo "  ✅ Cloudflare Pages frontend"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Test your application endpoints"
echo "  2. Verify all services are working"
echo "  3. Configure custom domain (optional)"
echo ""
echo -e "${GREEN}✨ Your Striae application is now fully deployed!${NC}"
