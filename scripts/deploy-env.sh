#!/bin/bash

# ================================
# STRIAE ENVIRONMENT SETUP SCRIPT
# ================================
# This script helps deploy environment variables to all Cloudflare Workers
# Make sure you have wrangler CLI installed and authenticated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Striae Environment Variables Deployment Script${NC}"
echo "=================================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source the .env file
echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
source .env

# Validate required variables
required_vars=(
    "ACCOUNT_ID"
    "SL_API_KEY"
    "KEYS_AUTH"
    "USER_DB_AUTH"
    "R2_KEY_SECRET"
    "ACCOUNT_HASH"
    "IMAGES_API_TOKEN"
    "API_TOKEN"
    "CFT_SECRET_KEY"
    "HMAC_KEY"
)

echo -e "${YELLOW}🔍 Validating required environment variables...${NC}"
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required variables found${NC}"

# Function to replace variables in wrangler configuration files
update_wrangler_configs() {
    echo -e "\n${BLUE}🔧 Updating wrangler configuration files...${NC}"
    
    # Data Worker
    if [ -f "workers/data-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating data-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"DATA_WORKER_NAME\"/\"$DATA_WORKER_NAME\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"DATA_WORKER_DOMAIN\"/\"$DATA_WORKER_DOMAIN\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"BUCKET_NAME\"/\"$BUCKET_NAME\"/g" workers/data-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ data-worker configuration updated${NC}"
    fi
    
    # Image Worker
    if [ -f "workers/image-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating image-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"IMAGES_WORKER_NAME\"/\"$IMAGES_WORKER_NAME\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"IMAGES_WORKER_DOMAIN\"/\"$IMAGES_WORKER_DOMAIN\"/g" workers/image-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ image-worker configuration updated${NC}"
    fi
    
    # Keys Worker
    if [ -f "workers/keys-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating keys-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"KEYS_WORKER_NAME\"/\"$KEYS_WORKER_NAME\"/g" workers/keys-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/keys-worker/wrangler.jsonc
        sed -i "s/\"KEYS_WORKER_DOMAIN\"/\"$KEYS_WORKER_DOMAIN\"/g" workers/keys-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ keys-worker configuration updated${NC}"
    fi
    
    # PDF Worker
    if [ -f "workers/pdf-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating pdf-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"PDF_WORKER_NAME\"/\"$PDF_WORKER_NAME\"/g" workers/pdf-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/pdf-worker/wrangler.jsonc
        sed -i "s/\"PDF_WORKER_DOMAIN\"/\"$PDF_WORKER_DOMAIN\"/g" workers/pdf-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ pdf-worker configuration updated${NC}"
    fi
    
    # Turnstile Worker
    if [ -f "workers/turnstile-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating turnstile-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"TURNSTILE_WORKER_NAME\"/\"$TURNSTILE_WORKER_NAME\"/g" workers/turnstile-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/turnstile-worker/wrangler.jsonc
        sed -i "s/\"TURNSTILE_WORKER_DOMAIN\"/\"$TURNSTILE_WORKER_DOMAIN\"/g" workers/turnstile-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ turnstile-worker configuration updated${NC}"
    fi
    
    # User Worker
    if [ -f "workers/user-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating user-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"USER_WORKER_NAME\"/\"$USER_WORKER_NAME\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"USER_WORKER_DOMAIN\"/\"$USER_WORKER_DOMAIN\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"KV_STORE_ID\"/\"$KV_STORE_ID\"/g" workers/user-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ user-worker configuration updated${NC}"
    fi
    
    # Main wrangler.toml
    if [ -f "wrangler.toml" ]; then
        echo -e "${YELLOW}  Updating wrangler.toml...${NC}"
        sed -i "s/\"PAGES_PROJECT_NAME\"/\"$PAGES_PROJECT_NAME\"/g" wrangler.toml
        echo -e "${GREEN}    ✅ main wrangler.toml configuration updated${NC}"
    fi
    
    echo -e "${GREEN}✅ All wrangler configuration files updated${NC}"
}

# Update wrangler configurations
update_wrangler_configs

# Function to set worker secrets
set_worker_secrets() {
    local worker_name=$1
    local worker_path=$2
    shift 2
    local secrets=("$@")
    
    echo -e "\n${BLUE}🔧 Setting secrets for $worker_name...${NC}"
    
    # Check if worker has a wrangler configuration file
    if [ ! -f "$worker_path/wrangler.jsonc" ] && [ ! -f "$worker_path/wrangler.toml" ]; then
        echo -e "${RED}❌ Error: No wrangler configuration found for $worker_name${NC}"
        echo -e "${YELLOW}   Please copy wrangler.jsonc.example to wrangler.jsonc and configure it first.${NC}"
        return 1
    fi
    
    # Change to worker directory
    pushd "$worker_path" > /dev/null
    
    # Get the worker name from the configuration file
    local config_worker_name
    if [ -f "wrangler.jsonc" ]; then
        config_worker_name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' wrangler.jsonc | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    elif [ -f "wrangler.toml" ]; then
        config_worker_name=$(grep '^name[[:space:]]*=' wrangler.toml | sed 's/.*=[[:space:]]*["\x27]\([^"\x27]*\)["\x27].*/\1/')
    fi
    
    if [ -z "$config_worker_name" ]; then
        echo -e "${RED}❌ Error: Could not determine worker name from configuration${NC}"
        popd > /dev/null
        return 1
    fi
    
    echo -e "${YELLOW}  Using worker name: $config_worker_name${NC}"
    
    for secret in "${secrets[@]}"; do
        echo -e "${YELLOW}  Setting $secret...${NC}"
        if ! echo "${!secret}" | wrangler secret put "$secret" --name "$config_worker_name"; then
            echo -e "${RED}❌ Failed to set $secret for $worker_name${NC}"
            popd > /dev/null
            return 1
        fi
    done
    
    echo -e "${GREEN}✅ $worker_name secrets configured${NC}"
    popd > /dev/null
}

# Deploy secrets to each worker
echo -e "\n${BLUE}🔐 Deploying secrets to workers...${NC}"

# Check if workers are configured
echo -e "${YELLOW}🔍 Checking worker configurations...${NC}"
workers_configured=0
total_workers=6

for worker_dir in workers/*/; do
    if [ -f "$worker_dir/wrangler.jsonc" ] || [ -f "$worker_dir/wrangler.toml" ]; then
        workers_configured=$((workers_configured + 1))
    fi
done

if [ $workers_configured -eq 0 ]; then
    echo -e "${RED}❌ No workers are configured!${NC}"
    echo -e "${YELLOW}   Please copy wrangler.jsonc.example to wrangler.jsonc in each worker directory and configure them.${NC}"
    echo -e "${YELLOW}   Then run this script again.${NC}"
    exit 1
elif [ $workers_configured -lt $total_workers ]; then
    echo -e "${YELLOW}⚠️  Warning: Only $workers_configured of $total_workers workers are configured.${NC}"
    echo -e "${YELLOW}   Some workers may not have their secrets deployed.${NC}"
fi

# Keys Worker
if ! set_worker_secrets "Keys Worker" "workers/keys-worker" \
    "KEYS_AUTH" "USER_DB_AUTH" "R2_KEY_SECRET" "ACCOUNT_HASH" "IMAGES_API_TOKEN"; then
    echo -e "${YELLOW}⚠️  Skipping Keys Worker (not configured)${NC}"
fi

# User Worker  
if ! set_worker_secrets "User Worker" "workers/user-worker" \
    "USER_DB_AUTH" "SL_API_KEY" "R2_KEY_SECRET" "IMAGES_API_TOKEN"; then
    echo -e "${YELLOW}⚠️  Skipping User Worker (not configured)${NC}"
fi

# Data Worker
if ! set_worker_secrets "Data Worker" "workers/data-worker" \
    "R2_KEY_SECRET"; then
    echo -e "${YELLOW}⚠️  Skipping Data Worker (not configured)${NC}"
fi

# Images Worker
if ! set_worker_secrets "Images Worker" "workers/image-worker" \
    "ACCOUNT_ID" "API_TOKEN" "HMAC_KEY"; then
    echo -e "${YELLOW}⚠️  Skipping Images Worker (not configured)${NC}"
fi

# Turnstile Worker
if ! set_worker_secrets "Turnstile Worker" "workers/turnstile-worker" \
    "CFT_SECRET_KEY"; then
    echo -e "${YELLOW}⚠️  Skipping Turnstile Worker (not configured)${NC}"
fi

# PDF Worker (no secrets needed)
echo -e "\n${BLUE}📄 PDF Worker: No environment variables needed${NC}"

echo -e "\n${GREEN}🎉 Worker secrets deployment completed!${NC}"

# Remind about Pages environment variables
echo -e "\n${YELLOW}⚠️  IMPORTANT: Don't forget to set these variables in Cloudflare Pages Dashboard:${NC}"
echo "   - SL_API_KEY"

echo -e "\n${YELLOW}⚠️  WORKER CONFIGURATION REMINDERS:${NC}"
echo "   - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory"
echo "   - Configure KV namespace ID in workers/user-worker/wrangler.jsonc"
echo "   - Configure R2 bucket name in workers/data-worker/wrangler.jsonc"
echo "   - Update ACCOUNT_ID and custom domains in all worker configurations"

echo -e "\n${BLUE}📝 For manual deployment, use these commands:${NC}"
echo "   cd workers/[worker-name]"
echo "   wrangler secret put VARIABLE_NAME --name [worker-name]"
echo -e "\n${GREEN}✨ Environment setup complete!${NC}"
