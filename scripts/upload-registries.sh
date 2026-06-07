#!/bin/bash

# ===================================
# UPLOAD KEY REGISTRIES TO R2
# ===================================
# Extracts key registry JSON from .env and uploads them to the
# R2 config bucket (CONFIG_BUCKET_NAME) as separate files per scope.
#
# Usage: bash ./scripts/upload-registries.sh [--dry-run]

set -e
set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Upload Key Registries to R2${NC}"
echo "================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

dry_run=false
for arg in "$@"; do
    case "$arg" in
        --dry-run)
            dry_run=true
            ;;
        -h|--help)
            echo "Usage: bash ./scripts/upload-registries.sh [--dry-run]"
            echo ""
            echo "Extracts key registries from .env and uploads them to R2."
            echo ""
            echo "Options:"
            echo "  --dry-run   Show what would be uploaded without actually uploading"
            echo "  -h, --help  Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            exit 1
            ;;
    esac
done

# Source .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found. Run deploy-config.sh first.${NC}"
    exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${CONFIG_BUCKET_NAME:-}" ]; then
    echo -e "${RED}❌ CONFIG_BUCKET_NAME is not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}  Target bucket: ${CONFIG_BUCKET_NAME}${NC}"

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

uploaded=0
skipped=0

upload_registry() {
    local env_var_name=$1
    local filename=$2
    local scope_label=$3

    local value="${!env_var_name:-}"

    if [ -z "$value" ] || [ "$value" = "'{}'" ] || [ "$value" = "{}" ]; then
        echo -e "${YELLOW}  ⏭️  Skipping ${scope_label}: ${env_var_name} is empty or placeholder${NC}"
        skipped=$((skipped + 1))
        return
    fi

    # Strip outer single quotes if present (from .env quoting)
    value="${value#\'}"
    value="${value%\'}"

    # Validate JSON
    if ! echo "$value" | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{JSON.parse(d); process.exit(0)})" 2>/dev/null; then
        echo -e "${RED}  ❌ ${scope_label}: ${env_var_name} is not valid JSON, skipping${NC}"
        skipped=$((skipped + 1))
        return
    fi

    local filepath="${TEMP_DIR}/${filename}"
    printf '%s' "$value" > "$filepath"
    local size
    size=$(wc -c < "$filepath" | tr -d ' ')

    if [ "$dry_run" = "true" ]; then
        echo -e "${BLUE}  [dry-run] Would upload ${scope_label}: ${filename} (${size} bytes)${NC}"
    else
        echo -e "${YELLOW}  Uploading ${scope_label}: ${filename} (${size} bytes)...${NC}"
        if wrangler r2 object put "${CONFIG_BUCKET_NAME}/${filename}" --file "$filepath" --content-type "application/json" 2>/dev/null; then
            echo -e "${GREEN}    ✅ ${filename} uploaded${NC}"
            uploaded=$((uploaded + 1))
        else
            echo -e "${RED}    ❌ Failed to upload ${filename}${NC}"
            exit 1
        fi
    fi
}

echo ""

upload_registry "DATA_AT_REST_ENCRYPTION_KEYS_JSON" "data-at-rest-keys.json" "Data-at-rest encryption"
upload_registry "EXPORT_ENCRYPTION_KEYS_JSON" "export-encryption-keys.json" "Export encryption"
upload_registry "MANIFEST_SIGNING_KEYS_JSON" "manifest-signing-keys.json" "Manifest signing"
upload_registry "USER_KV_ENCRYPTION_KEYS_JSON" "user-kv-encryption-keys.json" "User KV encryption"

echo ""
if [ "$dry_run" = "true" ]; then
    echo -e "${BLUE}[dry-run] Would upload ${uploaded} registries, skipped ${skipped}${NC}"
else
    echo -e "${GREEN}✅ Uploaded ${uploaded} registries to ${CONFIG_BUCKET_NAME}, skipped ${skipped}${NC}"
fi
