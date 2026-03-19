#!/bin/bash

# ======================================
# STRIAE PAGES SECRETS DEPLOYMENT SCRIPT
# ======================================
# This script deploys required secrets to Cloudflare Pages environments.

set -e
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Striae Pages Secrets Deployment Script${NC}"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

trap 'echo -e "\n${RED}❌ deploy-pages-secrets.sh failed near line ${LINENO}${NC}"' ERR

show_help=false
deploy_production=true
deploy_preview=true

for arg in "$@"; do
    case "$arg" in
        -h|--help)
            show_help=true
            ;;
        --production-only)
            deploy_production=true
            deploy_preview=false
            ;;
        --preview-only)
            deploy_production=false
            deploy_preview=true
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo "Use --help to see supported options."
            exit 1
            ;;
    esac
done

if [ "$show_help" = "true" ]; then
    echo "Usage: bash ./scripts/deploy-pages-secrets.sh [--production-only|--preview-only]"
    echo ""
    echo "Options:"
    echo "  --production-only  Deploy secrets only to the production Pages environment"
    echo "  --preview-only     Deploy secrets only to the preview Pages environment"
    echo "  -h, --help         Show this help message"
    exit 0
fi

if [ "$deploy_production" != "true" ] && [ "$deploy_preview" != "true" ]; then
    echo -e "${RED}❌ No target environment selected${NC}"
    exit 1
fi

require_command() {
    local cmd=$1
    if ! command -v "$cmd" > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: required command '$cmd' is not installed or not in PATH${NC}"
        exit 1
    fi
}

strip_carriage_returns() {
    printf '%s' "$1" | tr -d '\r'
}

is_placeholder() {
    local value="$1"
    local normalized

    normalized=$(echo "$value" | tr '[:upper:]' '[:lower:]')

    if [ -z "$normalized" ]; then
        return 0
    fi

    [[ "$normalized" == your_*_here ]]
}

load_required_project_id() {
    local admin_service_path="app/config/admin-service.json"
    local service_project_id

    if [ ! -f "$admin_service_path" ]; then
        echo -e "${RED}❌ Error: Required Firebase admin service file not found: $admin_service_path${NC}"
        echo -e "${YELLOW}   Create app/config/admin-service.json before deploying Pages secrets.${NC}"
        exit 1
    fi

    if ! service_project_id=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(data.project_id || '');" "$admin_service_path"); then
        echo -e "${RED}❌ Error: Could not parse project_id from $admin_service_path${NC}"
        exit 1
    fi

    service_project_id=$(strip_carriage_returns "$service_project_id")

    if [ -z "$service_project_id" ] || is_placeholder "$service_project_id"; then
        echo -e "${RED}❌ Error: project_id in $admin_service_path is missing or placeholder${NC}"
        exit 1
    fi

    PROJECT_ID="$service_project_id"
    export PROJECT_ID

    echo -e "${GREEN}✅ Loaded PROJECT_ID from $admin_service_path${NC}"
}

get_required_value() {
    local var_name=$1
    local value="${!var_name}"

    value=$(strip_carriage_returns "$value")

    if [ -z "$value" ] || is_placeholder "$value"; then
        echo -e "${RED}❌ Error: required value for $var_name is missing or placeholder${NC}" >&2
        exit 1
    fi

    printf '%s' "$value"
}

get_optional_value() {
    local var_name=$1
    local value="${!var_name}"

    value=$(strip_carriage_returns "$value")

    if [ -z "$value" ] || is_placeholder "$value"; then
        printf ''
        return 0
    fi

    printf '%s' "$value"
}

set_pages_secret() {
    local secret_name=$1
    local secret_value=$2
    local pages_env=$3

    echo -e "${YELLOW}  Setting $secret_name for $pages_env...${NC}"

    if [ "$pages_env" = "production" ]; then
        printf '%s' "$secret_value" | wrangler pages secret put "$secret_name" --project-name "$PAGES_PROJECT_NAME"
        return 0
    fi

    printf '%s' "$secret_value" | wrangler pages secret put "$secret_name" --project-name "$PAGES_PROJECT_NAME" --env "$pages_env"
}

deploy_pages_environment_secrets() {
    local pages_env=$1
    local secret
    local secret_value

    echo -e "\n${BLUE}🔧 Deploying Pages secrets to $pages_env...${NC}"

    for secret in "${required_pages_secrets[@]}"; do
        secret_value=$(get_required_value "$secret")
        set_pages_secret "$secret" "$secret_value" "$pages_env"
    done

    local optional_api_token
    optional_api_token=$(get_optional_value "API_TOKEN")
    if [ -n "$optional_api_token" ]; then
        set_pages_secret "API_TOKEN" "$optional_api_token" "$pages_env"
    fi

    local optional_primershear_emails
    optional_primershear_emails=$(get_optional_value "PRIMERSHEAR_EMAILS")
    if [ -n "$optional_primershear_emails" ]; then
        set_pages_secret "PRIMERSHEAR_EMAILS" "$optional_primershear_emails" "$pages_env"
    fi

    echo -e "${GREEN}✅ Pages secrets deployed to $pages_env${NC}"
}

require_command wrangler
require_command node

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo -e "${YELLOW}   Run deploy-config first to generate and populate .env.${NC}"
    exit 1
fi

echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
source .env

load_required_project_id

PAGES_PROJECT_NAME=$(strip_carriage_returns "$PAGES_PROJECT_NAME")
if [ -z "$PAGES_PROJECT_NAME" ] || is_placeholder "$PAGES_PROJECT_NAME"; then
    echo -e "${RED}❌ Error: PAGES_PROJECT_NAME is missing or placeholder in .env${NC}"
    exit 1
fi

required_pages_secrets=(
    "AUDIT_WORKER_DOMAIN"
    "DATA_WORKER_DOMAIN"
    "IMAGES_API_TOKEN"
    "IMAGES_WORKER_DOMAIN"
    "PDF_WORKER_AUTH"
    "PDF_WORKER_DOMAIN"
    "PROJECT_ID"
    "R2_KEY_SECRET"
    "USER_DB_AUTH"
    "USER_WORKER_DOMAIN"
)

echo -e "${YELLOW}🔍 Validating required Pages secret values...${NC}"
for secret in "${required_pages_secrets[@]}"; do
    get_required_value "$secret" > /dev/null
done
echo -e "${GREEN}✅ Required Pages secret values found${NC}"

if [ "$deploy_production" = "true" ]; then
    deploy_pages_environment_secrets "production"
fi

if [ "$deploy_preview" = "true" ]; then
    deploy_pages_environment_secrets "preview"
fi

echo -e "\n${GREEN}🎉 Pages secrets deployment completed!${NC}"
