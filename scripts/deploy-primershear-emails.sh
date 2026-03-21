#!/bin/bash

# ============================================
# PRIMERSHEAR EMAIL LIST DEPLOYMENT SCRIPT
# ============================================
# Reads primershear.emails, updates PRIMERSHEAR_EMAILS in .env,
# then deploys that secret directly to Cloudflare Pages.
#
# Usage:
#   bash ./scripts/deploy-primershear-emails.sh [--production-only|--preview-only|--env-only]
#
# Options:
#   --production-only  Deploy to production Pages environment only
#   --preview-only     Deploy to preview Pages environment only
#   --env-only         Update .env only; do not deploy to Cloudflare
#   -h, --help         Show this help message

set -e
set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📧 PrimerShear Email List Deployment${NC}"
echo "======================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

trap 'echo -e "\n${RED}❌ deploy-primershear-emails.sh failed near line ${LINENO}${NC}"' ERR

# ── Argument parsing ─────────────────────────────────────────────────────────

deploy_production=true
deploy_preview=true
env_only=false

for arg in "$@"; do
    case "$arg" in
        -h|--help)
            echo "Usage: bash ./scripts/deploy-primershear-emails.sh [--production-only|--preview-only|--env-only]"
            echo ""
            echo "Options:"
            echo "  --production-only  Deploy to production Pages environment only"
            echo "  --preview-only     Deploy to preview Pages environment only"
            echo "  --env-only         Update .env only; do not deploy to Cloudflare"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        --production-only)
            deploy_production=true
            deploy_preview=false
            ;;
        --preview-only)
            deploy_production=false
            deploy_preview=true
            ;;
        --env-only)
            env_only=true
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo "Use --help to see supported options."
            exit 1
            ;;
    esac
done

# ── Read emails file ──────────────────────────────────────────────────────────

EMAILS_FILE="$PROJECT_ROOT/primershear.emails"

if [ ! -f "$EMAILS_FILE" ]; then
    echo -e "${RED}❌ primershear.emails not found at: $EMAILS_FILE${NC}"
    echo -e "${YELLOW}   Create it with one email address per line.${NC}"
    exit 1
fi

# Strip comment lines and blank lines, then join with commas
# Use || true to avoid failure if paste gets no input (handles empty file gracefully)
PRIMERSHEAR_EMAILS=$(grep -v '^[[:space:]]*#' "$EMAILS_FILE" | grep -v '^[[:space:]]*$' | paste -sd ',' - || true)

if [ -z "$PRIMERSHEAR_EMAILS" ]; then
    echo -e "${YELLOW}⚠️  primershear.emails contains no active email addresses.${NC}"
    echo -e "${YELLOW}   The secret will be set to an empty string, disabling the feature.${NC}"
fi

EMAIL_COUNT=$(echo "$PRIMERSHEAR_EMAILS" | tr ',' '\n' | grep -c '[^[:space:]]' || true)
echo -e "${GREEN}✅ Loaded $EMAIL_COUNT email address(es) from primershear.emails${NC}"

# ── Update .env ───────────────────────────────────────────────────────────────

ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env not found. Run deploy-config first.${NC}"
    exit 1
fi

# Replace the PRIMERSHEAR_EMAILS= line in .env (handles both empty and populated values)
if grep -q '^PRIMERSHEAR_EMAILS=' "$ENV_FILE"; then
    # Use a temp file to avoid sed -i portability issues across macOS/Linux
    local_tmp=$(mktemp)
    sed "s|^PRIMERSHEAR_EMAILS=.*|PRIMERSHEAR_EMAILS=${PRIMERSHEAR_EMAILS}|" "$ENV_FILE" > "$local_tmp"
    mv "$local_tmp" "$ENV_FILE"
    echo -e "${GREEN}✅ Updated PRIMERSHEAR_EMAILS in .env${NC}"
else
    echo "" >> "$ENV_FILE"
    echo "PRIMERSHEAR_EMAILS=${PRIMERSHEAR_EMAILS}" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Appended PRIMERSHEAR_EMAILS to .env${NC}"
fi

if [ "$env_only" = "true" ]; then
    echo -e "\n${GREEN}🎉 .env updated. Skipping Cloudflare deployment (--env-only).${NC}"
    exit 0
fi

# ── Deploy to Cloudflare Pages ────────────────────────────────────────────────

if ! command -v wrangler > /dev/null 2>&1; then
    echo -e "${RED}❌ wrangler is not installed or not in PATH${NC}"
    exit 1
fi

source "$ENV_FILE"

PAGES_PROJECT_NAME=$(echo "$PAGES_PROJECT_NAME" | tr -d '\r')
if [ -z "$PAGES_PROJECT_NAME" ]; then
    echo -e "${RED}❌ PAGES_PROJECT_NAME is missing from .env${NC}"
    exit 1
fi

set_secret() {
    local pages_env=$1
    echo -e "${YELLOW}  Setting PRIMERSHEAR_EMAILS for $pages_env...${NC}"
    if [ "$pages_env" = "production" ]; then
        printf '%s' "$PRIMERSHEAR_EMAILS" | wrangler pages secret put PRIMERSHEAR_EMAILS \
            --project-name "$PAGES_PROJECT_NAME"
    else
        printf '%s' "$PRIMERSHEAR_EMAILS" | wrangler pages secret put PRIMERSHEAR_EMAILS \
            --project-name "$PAGES_PROJECT_NAME" --env "$pages_env"
    fi
}

if [ "$deploy_production" = "true" ]; then
    set_secret "production"
    echo -e "${GREEN}✅ PRIMERSHEAR_EMAILS deployed to production${NC}"
fi

if [ "$deploy_preview" = "true" ]; then
    set_secret "preview"
    echo -e "${GREEN}✅ PRIMERSHEAR_EMAILS deployed to preview${NC}"
fi

# Deploy Pages so the new secret takes effect immediately
echo -e "\n${YELLOW}🚀 Building and deploying Pages to activate new secret...${NC}"
if ! npm run deploy; then
    echo -e "${RED}❌ Pages deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pages deployment complete${NC}"

echo -e "\n${GREEN}🎉 PrimerShear email list deployment complete!${NC}"
