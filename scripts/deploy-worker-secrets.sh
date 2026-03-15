#!/bin/bash

# ======================================
# STRIAE WORKER SECRETS DEPLOYMENT SCRIPT  
# ======================================
# This script deploys environment variables/secrets to Cloudflare Workers
# Run this AFTER workers are deployed to avoid deployment errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Striae Worker Secrets Deployment Script${NC}"
echo "=========================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source the .env file
echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
source .env

is_admin_service_placeholder() {
    local value="$1"
    local normalized=$(echo "$value" | tr '[:upper:]' '[:lower:]')

    [[ -z "$normalized" || "$normalized" == your-* || "$normalized" == *"your_private_key"* ]]
}

load_required_admin_service_credentials() {
    local admin_service_path="app/config/admin-service.json"

    if [ ! -f "$admin_service_path" ]; then
        echo -e "${RED}❌ Error: Required Firebase admin service file not found: $admin_service_path${NC}"
        echo -e "${YELLOW}   Create app/config/admin-service.json before deploying worker secrets.${NC}"
        exit 1
    fi

    local service_project_id
    local service_client_email
    local service_private_key

    if ! service_project_id=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(data.project_id || '');" "$admin_service_path"); then
        echo -e "${RED}❌ Error: Could not parse project_id from $admin_service_path${NC}"
        exit 1
    fi

    if ! service_client_email=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(data.client_email || '');" "$admin_service_path"); then
        echo -e "${RED}❌ Error: Could not parse client_email from $admin_service_path${NC}"
        exit 1
    fi

    if ! service_private_key=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(data.private_key || '');" "$admin_service_path"); then
        echo -e "${RED}❌ Error: Could not parse private_key from $admin_service_path${NC}"
        exit 1
    fi

    local normalized_private_key="${service_private_key//$'\r'/}"
    normalized_private_key="${normalized_private_key//$'\n'/\\n}"

    if is_admin_service_placeholder "$service_project_id"; then
        echo -e "${RED}❌ Error: project_id in $admin_service_path is missing or placeholder${NC}"
        exit 1
    fi

    if is_admin_service_placeholder "$service_client_email" || [[ "$service_client_email" != *".gserviceaccount.com"* ]]; then
        echo -e "${RED}❌ Error: client_email in $admin_service_path is invalid${NC}"
        exit 1
    fi

    if is_admin_service_placeholder "$normalized_private_key" || [[ "$normalized_private_key" != *"-----BEGIN PRIVATE KEY-----"* ]] || [[ "$normalized_private_key" != *"-----END PRIVATE KEY-----"* ]]; then
        echo -e "${RED}❌ Error: private_key in $admin_service_path is invalid${NC}"
        exit 1
    fi

    PROJECT_ID="$service_project_id"
    FIREBASE_SERVICE_ACCOUNT_EMAIL="$service_client_email"
    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="$normalized_private_key"

    export PROJECT_ID
    export FIREBASE_SERVICE_ACCOUNT_EMAIL
    export FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY

    echo -e "${GREEN}✅ Loaded Firebase service account credentials from $admin_service_path${NC}"
}

load_required_admin_service_credentials

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

# Audit Worker
if ! set_worker_secrets "Audit Worker" "workers/audit-worker" \
    "R2_KEY_SECRET"; then
    echo -e "${YELLOW}⚠️  Skipping Audit Worker (not configured)${NC}"
fi

# Keys Worker
if ! set_worker_secrets "Keys Worker" "workers/keys-worker" \
    "KEYS_AUTH" "USER_DB_AUTH" "R2_KEY_SECRET" "ACCOUNT_HASH" "IMAGES_API_TOKEN" "PDF_WORKER_AUTH"; then
    echo -e "${YELLOW}⚠️  Skipping Keys Worker (not configured)${NC}"
fi

# User Worker  
if ! set_worker_secrets "User Worker" "workers/user-worker" \
    "USER_DB_AUTH" "R2_KEY_SECRET" "IMAGES_API_TOKEN" "DATA_WORKER_DOMAIN" "IMAGES_WORKER_DOMAIN" "PROJECT_ID" "FIREBASE_SERVICE_ACCOUNT_EMAIL" "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY"; then
    echo -e "${YELLOW}⚠️  Skipping User Worker (not configured)${NC}"
fi

# Data Worker
if ! set_worker_secrets "Data Worker" "workers/data-worker" \
    "R2_KEY_SECRET" "MANIFEST_SIGNING_PRIVATE_KEY" "MANIFEST_SIGNING_KEY_ID"; then
    echo -e "${YELLOW}⚠️  Skipping Data Worker (not configured)${NC}"
fi

# Images Worker
if ! set_worker_secrets "Images Worker" "workers/image-worker" \
    "ACCOUNT_ID" "API_TOKEN" "HMAC_KEY"; then
    echo -e "${YELLOW}⚠️  Skipping Images Worker (not configured)${NC}"
fi

# PDF Worker (no secrets needed)
# PDF Worker
if ! set_worker_secrets "PDF Worker" "workers/pdf-worker" \
    "PDF_WORKER_AUTH"; then
    echo -e "${YELLOW}⚠️  Skipping PDF Worker (not configured)${NC}"
fi

echo -e "\n${GREEN}🎉 Worker secrets deployment completed!${NC}"

echo -e "\n${YELLOW}⚠️  WORKER CONFIGURATION REMINDERS:${NC}"
echo "   - Copy wrangler.jsonc.example to wrangler.jsonc in each worker directory"
echo "   - Configure KV namespace ID in workers/user-worker/wrangler.jsonc"
echo "   - Configure R2 bucket name in workers/data-worker/wrangler.jsonc"
echo "   - Configure R2 bucket name in workers/audit-worker/wrangler.jsonc"
echo "   - Update ACCOUNT_ID and custom domains in all worker configurations"

echo -e "\n${BLUE}📝 For manual deployment, use these commands:${NC}"
echo "   cd workers/[worker-name]"
echo "   wrangler secret put VARIABLE_NAME --name [worker-name]"
echo -e "\n${GREEN}✨ Worker secrets deployment complete!${NC}"