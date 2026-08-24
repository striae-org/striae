#!/bin/bash

# Copyright (c) 2025 Stephen J. Lu
# SPDX-License-Identifier: Apache-2.0

# ======================================
# STRIAE COMPLETE DEPLOYMENT SCRIPT
# ======================================
# This script deploys the entire Striae application:
# 1. Configuration setup (copy configs, replace placeholders, refresh generated
#    wrangler.jsonc/wrangler.toml/firebase.ts from templates via --refresh-templates)
# 2. Worker dependencies installation
# 3. Wrangler types generation
# 4. Workers (all 7 workers)
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

redeploy_only=false
for arg in "$@"; do
    case "$arg" in
        -r|--redeploy-only)
            redeploy_only=true
            ;;
        -h|--help)
            echo "Usage: deploy-all.sh [--redeploy-only]"
            echo ""
            echo "  --redeploy-only, -r   Redeploy workers and Pages using the existing"
            echo "                        configuration only. Skips configuration setup"
            echo "                        (deploy-config), but still validates the existing"
            echo "                        configuration (deploy-config --validate-only) and"
            echo "                        fails if it is missing values expected by the"
            echo "                        current templates, and still uploads key"
            echo "                        registries and deploys worker/Pages secrets."
            echo "                        Normal (non-redeploy-only) runs pass"
            echo "                        --refresh-templates to deploy-config.sh so"
            echo "                        already-initialized deployments regenerate"
            echo "                        wrangler.jsonc/wrangler.toml/firebase.ts from"
            echo "                        the current templates."
            echo "  -h, --help            Show this help message."
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo "Use --help to see supported options."
            exit 1
            ;;
    esac
done

if [ "$redeploy_only" = "true" ]; then
    echo -e "${YELLOW}🔁 Redeploy-only mode: configuration setup (deploy-config) will NOT be changed.${NC}"
    echo ""
fi

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
if [ "$redeploy_only" = "true" ]; then
    echo -e "${YELLOW}⏭️  Skipping configuration setup (redeploy-only mode)${NC}"
    echo -e "${YELLOW}🧪 Validating existing configuration is still current...${NC}"
    if ! bash "$SCRIPT_DIR/deploy-config.sh" --validate-only; then
        echo -e "${RED}❌ Configuration checkpoint validation failed!${NC}"
        echo -e "${YELLOW}Existing configuration is missing values expected by the current templates.${NC}"
        echo -e "${YELLOW}Re-run without --redeploy-only (or run 'deploy-config.sh --refresh-templates')${NC}"
        echo -e "${YELLOW}to regenerate configuration before redeploying.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Configuration checkpoint validation passed${NC}"
else
    echo -e "${YELLOW}⚙️  Setting up configuration files and replacing placeholders...${NC}"
    echo -e "${YELLOW}   (using --refresh-templates so already-initialized deployments pick up new template fields)${NC}"
    if ! bash "$SCRIPT_DIR/deploy-config.sh" --refresh-templates; then
        echo -e "${RED}❌ Configuration setup failed!${NC}"
        echo -e "${YELLOW}Please check your .env file and configuration before proceeding.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Configuration setup completed successfully${NC}"
    run_config_checkpoint
fi
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
for WORKER in audit-worker data-worker image-worker files-worker lists-worker pdf-worker user-worker; do
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
echo -e "${YELLOW}🛡️ Running admin-service security guard before worker deployment...${NC}"
if ! npm run security:admin-service-guard; then
    echo -e "${RED}❌ Admin-service security guard failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Admin-service security guard passed${NC}"
echo -e "${YELLOW}🔧 Deploying all 7 Cloudflare Workers...${NC}"
if ! npm run deploy-workers; then
    echo -e "${RED}❌ Worker deployment failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All 7 workers deployed successfully${NC}"
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
echo -e "${YELLOW}🛡️ Running admin-service security guard before Pages deployment...${NC}"
if ! npm run security:admin-service-guard; then
    echo -e "${RED}❌ Admin-service security guard failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Admin-service security guard passed${NC}"
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
echo "  ✅ 7 Cloudflare Workers"
echo "  ✅ Cloudflare Pages frontend"
echo "  ✅ Key registries"
echo "  ✅ Worker environment variables"
echo "  ✅ Pages environment variables"
if [ "$redeploy_only" = "true" ]; then
    echo "  ⏭️  Configuration setup (skipped - redeploy-only mode)"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Test your application endpoints"
echo "  2. Verify all services are working"
echo "  3. Verify worker and Pages secrets are set as expected"
echo ""
echo -e "${GREEN}✨ Your Striae application is now fully deployed!${NC}"
