#!/bin/bash

# ======================================
# STRIAE COMPLETE DEPLOYMENT SCRIPT
# ======================================
# This script deploys the entire Striae application:
# 1. Configuration setup (copy configs, replace placeholders)
# 2. Worker dependencies installation
# 3. Wrangler types generation
# 4. Workers (all 6 workers)
# 5. Key registries (upload to R2 config bucket)
# 6. Worker secrets/environment variables
# 7. Pages secrets/environment variables
# 8. Pages (frontend)

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
assert_file_exists "$SCRIPT_DIR/upload-registries.sh"
assert_file_exists "$SCRIPT_DIR/deploy-pages-secrets.sh"
assert_file_exists "package.json"

if [ ! -f ".env" ] && [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Error: neither .env nor .env.example was found in project root${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Preflight checks passed${NC}"
echo ""

# Step 1: Configuration Setup
echo -e "${PURPLE}Step 1/8: Configuration Setup${NC}"
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
echo -e "${PURPLE}Step 2/8: Installing Worker Dependencies${NC}"
echo "----------------------------------------"
echo -e "${YELLOW}📦 Installing npm dependencies for all workers...${NC}"
if ! bash "$SCRIPT_DIR/install-workers.sh"; then
    echo -e "${RED}❌ Worker dependencies installation failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All worker dependencies installed successfully${NC}"
echo ""

# Step 3: Generate Wrangler Types
echo -e "${PURPLE}Step 3/8: Generating Wrangler Types${NC}"
echo "-------------------------------------"
echo -e "${YELLOW}📝 Running wrangler types in root and all worker directories...${NC}"
if ! npx wrangler types; then
    echo -e "${RED}❌ Root wrangler types generation failed!${NC}"
    exit 1
fi
for WORKER in audit-worker data-worker image-worker lists-worker pdf-worker user-worker; do
    echo -e "${YELLOW}  → Generating types for ${WORKER}...${NC}"
    if ! (cd "workers/$WORKER" && npx wrangler types); then
        echo -e "${RED}❌ wrangler types failed for ${WORKER}!${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Wrangler types generated successfully${NC}"
echo ""

# Step 4: Deploy Workers
echo -e "${PURPLE}Step 4/8: Deploying Workers${NC}"
echo "----------------------------"
echo -e "${YELLOW}🔧 Deploying all 6 Cloudflare Workers...${NC}"
if ! npm run deploy-workers; then
    echo -e "${RED}❌ Worker deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All workers deployed successfully${NC}"
echo ""

# Step 5: Upload Key Registries to R2
echo -e "${PURPLE}Step 5/8: Uploading Key Registries to R2${NC}"
echo "-----------------------------------------"
echo -e "${YELLOW}📦 Uploading key registries to config bucket...${NC}"
if ! bash "$SCRIPT_DIR/upload-registries.sh"; then
    echo -e "${RED}❌ Key registry upload failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Key registries uploaded successfully${NC}"
echo ""

# Step 6: Deploy Worker Secrets
echo -e "${PURPLE}Step 6/8: Deploying Worker Secrets${NC}"
echo "-----------------------------------"
echo -e "${YELLOW}🔐 Deploying worker environment variables...${NC}"
if ! bash "$SCRIPT_DIR/deploy-worker-secrets.sh"; then
    echo -e "${RED}❌ Worker secrets deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Worker secrets deployed successfully${NC}"
echo ""

# Step 7: Deploy Pages Secrets
echo -e "${PURPLE}Step 7/8: Deploying Pages Secrets${NC}"
echo "----------------------------------"
echo -e "${YELLOW}🔐 Deploying Pages environment variables...${NC}"
if ! bash "$SCRIPT_DIR/deploy-pages-secrets.sh"; then
    echo -e "${RED}❌ Pages secrets deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pages secrets deployed successfully${NC}"
echo ""

# Step 8: Deploy Pages
echo -e "${PURPLE}Step 8/8: Deploying Pages${NC}"
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
echo "  ✅ Wrangler types (root + all workers)"
echo "  ✅ 6 Cloudflare Workers"
echo "  ✅ Worker environment variables"
echo "  ✅ Pages environment variables"
echo "  ✅ Cloudflare Pages frontend"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Test your application endpoints"
echo "  2. Verify all services are working"
echo "  3. Verify worker and Pages secrets are set as expected"
echo ""
echo -e "${GREEN}✨ Your Striae application is now fully deployed!${NC}"
