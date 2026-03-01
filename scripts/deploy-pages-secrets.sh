#!/bin/bash

# ======================================
# STRIAE PAGES SECRETS DEPLOYMENT SCRIPT
# ======================================
# This script deploys environment variables to Cloudflare Pages
# Run this AFTER the Pages project has been deployed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📄 Striae Pages Environment Variables Deployment Script${NC}"
echo "==========================================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Source the .env file
echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
source .env

# Pages-specific environment variables
pages_vars=(
    "SL_API_KEY"
)

echo -e "${YELLOW}🔍 Validating Pages environment variables...${NC}"
for var in "${pages_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All Pages variables found${NC}"

# Function to get the project name from wrangler.toml
get_pages_project_name() {
    if [ -f "wrangler.toml" ]; then
        local project_name=$(grep '^name[[:space:]]*=' wrangler.toml | sed 's/.*=[[:space:]]*["\x27]\([^"\x27]*\)["\x27].*/\1/')
        echo "$project_name"
    else
        echo ""
    fi
}

# Get the Pages project name
echo -e "${YELLOW}🔍 Detecting Pages project name...${NC}"
PROJECT_NAME=$(get_pages_project_name)

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}❌ Error: Could not determine Pages project name from wrangler.toml${NC}"
    echo -e "${YELLOW}   Please ensure wrangler.toml exists and has a 'name' field configured.${NC}"
    exit 1
fi

echo -e "${YELLOW}  Using Pages project: $PROJECT_NAME${NC}"

# Deploy secrets to Cloudflare Pages
echo -e "\n${BLUE}🔐 Deploying secrets to Cloudflare Pages...${NC}"

# Function to set Pages environment variables
set_pages_env() {
    local var_name=$1
    local var_value="${!var_name}"
    
    echo -e "${YELLOW}  Setting $var_name...${NC}"
    
    # Use wrangler pages secret put for environment variables
    if ! echo "$var_value" | wrangler pages secret put "$var_name" --project-name "$PROJECT_NAME"; then
        echo -e "${RED}❌ Failed to set $var_name for Pages project $PROJECT_NAME${NC}"
        return 1
    fi
}

# Set each Pages environment variable
for var in "${pages_vars[@]}"; do
    if ! set_pages_env "$var"; then
        echo -e "${RED}❌ Failed to deploy Pages secrets${NC}"
        exit 1
    fi
done

echo -e "\n${GREEN}🎉 Pages secrets deployment completed!${NC}"

echo -e "\n${YELLOW}📝 Variables deployed to Pages project '$PROJECT_NAME':${NC}"
for var in "${pages_vars[@]}"; do
    echo "   ✅ $var"
done

echo -e "\n${BLUE}💡 Additional Notes:${NC}"
echo "   - These variables are now available in your Remix application"
echo "   - You can verify them in the Cloudflare Pages dashboard"
echo "   - For manual deployment, use: wrangler pages secret put VARIABLE_NAME --project-name $PROJECT_NAME"

echo -e "\n${GREEN}✨ Pages environment setup complete!${NC}"
