#!/bin/bash

# ===================================
# STRIAE CONFIGURATION SETUP SCRIPT
# ===================================
# This script sets up all configuration files and replaces placeholders
# Run this BEFORE installing worker dependencies to avoid wrangler validation errors

set -e
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚙️  Striae Configuration Setup Script${NC}"
echo "====================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

trap 'echo -e "\n${RED}❌ deploy-config.sh failed near line ${LINENO}${NC}"' ERR

update_env=false
show_help=false
validate_only=false
for arg in "$@"; do
    case "$arg" in
        -h|--help)
            show_help=true
            ;;
        --update-env)
            update_env=true
            ;;
        --validate-only)
            validate_only=true
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo "Use --help to see supported options."
            exit 1
            ;;
    esac
done

if [ "$update_env" = "true" ] && [ "$validate_only" = "true" ]; then
    echo -e "${RED}❌ --update-env and --validate-only cannot be used together${NC}"
    exit 1
fi

if [ "$show_help" = "true" ]; then
    echo "Usage: bash ./scripts/deploy-config.sh [--update-env] [--validate-only]"
    echo ""
    echo "Options:"
    echo "  --update-env   Reset .env from .env.example and overwrite configs"
    echo "  --validate-only Validate current .env and generated config files without modifying them"
    echo "  -h, --help     Show this help message"
    exit 0
fi

if [ "$update_env" = "true" ]; then
    echo -e "${YELLOW}⚠️  Update-env mode: overwriting configs and regenerating .env values${NC}"
fi

require_command() {
    local cmd=$1
    if ! command -v "$cmd" > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: required command '$cmd' is not installed or not in PATH${NC}"
        exit 1
    fi
}

require_command node
require_command sed
require_command awk
require_command grep

is_placeholder() {
    local value="$1"
    local normalized=$(echo "$value" | tr '[:upper:]' '[:lower:]')

    if [ -z "$normalized" ]; then
        return 1
    fi

    [[ "$normalized" == your_*_here ]]
}

# Check if .env file exists
env_created_from_example=false
preserved_domain_env_file=""

if [ -f ".env" ]; then
    preserved_domain_env_file=".env"
fi

if [ "$update_env" = "true" ]; then
    if [ -f ".env" ]; then
        cp .env .env.backup
        preserved_domain_env_file=".env.backup"
        echo -e "${GREEN}📄 Existing .env backed up to .env.backup${NC}"
    fi

    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        echo -e "${GREEN}✅ .env file reset from .env.example${NC}"
        env_created_from_example=true
    else
        echo -e "${RED}❌ Error: .env.example file not found!${NC}"
        exit 1
    fi
elif [ ! -f ".env" ]; then
    if [ "$validate_only" = "true" ]; then
        echo -e "${RED}❌ Error: .env file not found. --validate-only does not create files.${NC}"
        echo -e "${YELLOW}Run deploy-config without --validate-only first to generate and populate .env.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}📄 .env file not found, copying from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        echo -e "${GREEN}✅ .env file created from .env.example${NC}"
        env_created_from_example=true
    else
        echo -e "${RED}❌ Error: Neither .env nor .env.example file found!${NC}"
        echo "Please create a .env.example file or provide a .env file."
        exit 1
    fi
fi

# Source the .env file
echo -e "${YELLOW}📖 Loading environment variables from .env...${NC}"
source .env

escape_for_sed_pattern() {
    printf '%s' "$1" | sed -e 's/[][\\.^$*+?{}|()]/\\&/g'
}

dedupe_env_var_entries() {
    local var_name=$1
    local expected_count=1
    local escaped_var_name

    escaped_var_name=$(escape_for_sed_pattern "$var_name")

    if [ -f ".env.example" ]; then
        expected_count=$(grep -c "^$escaped_var_name=" .env.example || true)

        if [ "$expected_count" -lt 1 ]; then
            expected_count=1
        fi
    fi

    awk -v key="$var_name" -v keep="$expected_count" '
        BEGIN { seen = 0 }
        {
            if (index($0, key "=") == 1) {
                seen++

                if (seen > keep) {
                    next
                }
            }
            print
        }
    ' .env > .env.tmp && mv .env.tmp .env
}

normalize_domain_value() {
    local domain="$1"

    domain=$(printf '%s' "$domain" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    domain="${domain#http://}"
    domain="${domain#https://}"
    domain="${domain%/}"

    printf '%s' "$domain"
}

strip_carriage_returns() {
    printf '%s' "$1" | tr -d '\r'
}

read_env_var_from_file() {
    local env_file=$1
    local var_name=$2

    if [ ! -f "$env_file" ]; then
        return 0
    fi

    awk -v key="$var_name" '
        index($0, key "=") == 1 {
            value = substr($0, length(key) + 2)
        }
        END {
            if (value != "") {
                gsub(/\r/, "", value)
                gsub(/^"/, "", value)
                gsub(/"$/, "", value)
                print value
            }
        }
    ' "$env_file"
}

worker_domain_wrangler_path() {
    case "$1" in
        KEYS_WORKER_DOMAIN)
            printf '%s' "workers/keys-worker/wrangler.jsonc"
            ;;
        USER_WORKER_DOMAIN)
            printf '%s' "workers/user-worker/wrangler.jsonc"
            ;;
        DATA_WORKER_DOMAIN)
            printf '%s' "workers/data-worker/wrangler.jsonc"
            ;;
        AUDIT_WORKER_DOMAIN)
            printf '%s' "workers/audit-worker/wrangler.jsonc"
            ;;
        IMAGES_WORKER_DOMAIN)
            printf '%s' "workers/image-worker/wrangler.jsonc"
            ;;
        PDF_WORKER_DOMAIN)
            printf '%s' "workers/pdf-worker/wrangler.jsonc"
            ;;
    esac
}

read_worker_domain_from_wrangler() {
    local wrangler_file=$1

    if [ ! -f "$wrangler_file" ]; then
        return 0
    fi

    sed -n 's/.*"pattern"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$wrangler_file" | head -n 1
}

resolve_existing_domain_value() {
    local var_name=$1
    local current_value=$2
    local preserved_value=""
    local wrangler_file=""

    current_value=$(normalize_domain_value "$current_value")

    if [ "$current_value" = "$var_name" ]; then
        current_value=""
    fi

    if [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
        printf '%s' "$current_value"
        return 0
    fi

    if [ -n "$preserved_domain_env_file" ] && [ -f "$preserved_domain_env_file" ]; then
        preserved_value=$(read_env_var_from_file "$preserved_domain_env_file" "$var_name")
        preserved_value=$(normalize_domain_value "$preserved_value")

        if [ "$preserved_value" = "$var_name" ]; then
            preserved_value=""
        fi

        if [ -n "$preserved_value" ] && ! is_placeholder "$preserved_value"; then
            printf '%s' "$preserved_value"
            return 0
        fi
    fi

    if [[ "$var_name" == *_WORKER_DOMAIN ]]; then
        wrangler_file=$(worker_domain_wrangler_path "$var_name")

        if [ -n "$wrangler_file" ] && [ -f "$wrangler_file" ]; then
            preserved_value=$(read_worker_domain_from_wrangler "$wrangler_file")
            preserved_value=$(normalize_domain_value "$preserved_value")

            if [ "$preserved_value" = "$var_name" ]; then
                preserved_value=""
            fi

            if [ -n "$preserved_value" ] && ! is_placeholder "$preserved_value"; then
                printf '%s' "$preserved_value"
                return 0
            fi
        fi
    fi

    printf '%s' "$current_value"
}

generate_worker_subdomain_label() {
    node -e "const { randomInt } = require('crypto'); const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'; let value = ''; for (let index = 0; index < 10; index += 1) { value += alphabet[randomInt(alphabet.length)]; } process.stdout.write(value);" 2>/dev/null
}

worker_name_var_for_domain_var() {
    case "$1" in
        KEYS_WORKER_DOMAIN)
            printf '%s' "KEYS_WORKER_NAME"
            ;;
        USER_WORKER_DOMAIN)
            printf '%s' "USER_WORKER_NAME"
            ;;
        DATA_WORKER_DOMAIN)
            printf '%s' "DATA_WORKER_NAME"
            ;;
        AUDIT_WORKER_DOMAIN)
            printf '%s' "AUDIT_WORKER_NAME"
            ;;
        IMAGES_WORKER_DOMAIN)
            printf '%s' "IMAGES_WORKER_NAME"
            ;;
        PDF_WORKER_DOMAIN)
            printf '%s' "PDF_WORKER_NAME"
            ;;
        *)
            printf '%s' ""
            ;;
    esac
}

compose_worker_domain() {
    local worker_name=$1
    local worker_subdomain=$2

    worker_name=$(normalize_domain_value "$worker_name")
    worker_subdomain=$(normalize_domain_value "$worker_subdomain")
    worker_name="${worker_name#.}"
    worker_name="${worker_name%.}"
    worker_subdomain="${worker_subdomain#.}"
    worker_subdomain="${worker_subdomain%.}"

    if [ -z "$worker_name" ] || [ -z "$worker_subdomain" ]; then
        return 1
    fi

    if [[ "$worker_name" == *.* ]] || [[ "$worker_name" == */* ]] || [[ "$worker_subdomain" == */* ]]; then
        return 1
    fi

    printf '%s.%s' "$worker_name" "$worker_subdomain"
}

write_env_var() {
    local var_name=$1
    local var_value=$2
    local env_file_value="$var_value"

    var_value=$(strip_carriage_returns "$var_value")
    env_file_value="$var_value"

    if [ "$var_name" = "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY" ] || [ "$var_name" = "MANIFEST_SIGNING_PRIVATE_KEY" ] || [ "$var_name" = "MANIFEST_SIGNING_PUBLIC_KEY" ]; then
        # Store as a quoted string so sourced .env preserves escaped newline markers (\n)
        env_file_value=${env_file_value//\"/\\\"}
        env_file_value="\"$env_file_value\""
    fi

    local escaped_var_name
    local replacement_line
    escaped_var_name=$(escape_for_sed_pattern "$var_name")
    replacement_line=$(escape_for_sed_replacement "$var_name=$env_file_value")

    if grep -q "^$escaped_var_name=" .env; then
        # Replace all occurrences so intentional duplicates in .env.example stay in sync.
        sed -i "s|^$escaped_var_name=.*|$replacement_line|g" .env
        dedupe_env_var_entries "$var_name"
    else
        echo "$var_name=$env_file_value" >> .env
    fi
}

escape_for_sed_replacement() {
    printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

is_admin_service_placeholder() {
    local value="$1"
    local normalized=$(echo "$value" | tr '[:upper:]' '[:lower:]')

    [[ -z "$normalized" || "$normalized" == your-* || "$normalized" == *"your_private_key"* ]]
}

load_admin_service_credentials() {
    local admin_service_path="app/config/admin-service.json"

    if [ ! -f "$admin_service_path" ]; then
        echo -e "${RED}❌ Error: Required Firebase admin service file not found: $admin_service_path${NC}"
        echo -e "${YELLOW}   Create app/config/admin-service.json with service account credentials.${NC}"
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
    export PROJECT_ID
    write_env_var "PROJECT_ID" "$PROJECT_ID"

    FIREBASE_SERVICE_ACCOUNT_EMAIL="$service_client_email"
    export FIREBASE_SERVICE_ACCOUNT_EMAIL
    write_env_var "FIREBASE_SERVICE_ACCOUNT_EMAIL" "$FIREBASE_SERVICE_ACCOUNT_EMAIL"

    FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="$normalized_private_key"
    export FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
    write_env_var "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY" "$FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY"

    echo -e "${GREEN}✅ Imported Firebase service account credentials from $admin_service_path${NC}"
}

generate_manifest_signing_key_pair() {
    local private_key_file
    local public_key_file
    private_key_file=$(mktemp)
    public_key_file=$(mktemp)

    if ! node -e "const { generateKeyPairSync } = require('crypto'); const fs = require('fs'); const pair = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } }); fs.writeFileSync(process.argv[1], pair.privateKey, 'utf8'); fs.writeFileSync(process.argv[2], pair.publicKey, 'utf8');" "$private_key_file" "$public_key_file"; then
        rm -f "$private_key_file" "$public_key_file"
        return 1
    fi

    local private_key_pem
    local public_key_pem
    private_key_pem=$(cat "$private_key_file")
    public_key_pem=$(cat "$public_key_file")
    rm -f "$private_key_file" "$public_key_file"

    private_key_pem="${private_key_pem//$'\r'/}"
    public_key_pem="${public_key_pem//$'\r'/}"

    MANIFEST_SIGNING_PRIVATE_KEY="${private_key_pem//$'\n'/\\n}"
    MANIFEST_SIGNING_PUBLIC_KEY="${public_key_pem//$'\n'/\\n}"

    export MANIFEST_SIGNING_PRIVATE_KEY
    export MANIFEST_SIGNING_PUBLIC_KEY

    write_env_var "MANIFEST_SIGNING_PRIVATE_KEY" "$MANIFEST_SIGNING_PRIVATE_KEY"
    write_env_var "MANIFEST_SIGNING_PUBLIC_KEY" "$MANIFEST_SIGNING_PUBLIC_KEY"

    return 0
}

configure_manifest_signing_credentials() {
    echo -e "${BLUE}🛡️ MANIFEST SIGNING CONFIGURATION${NC}"
    echo "================================="

    local should_generate="false"
    local regenerate_choice=""

    if [ "$update_env" = "true" ]; then
        should_generate="true"
    elif [ -z "$MANIFEST_SIGNING_PRIVATE_KEY" ] || is_placeholder "$MANIFEST_SIGNING_PRIVATE_KEY" || [ -z "$MANIFEST_SIGNING_PUBLIC_KEY" ] || is_placeholder "$MANIFEST_SIGNING_PUBLIC_KEY"; then
        should_generate="true"
    else
        echo -e "${GREEN}Current manifest signing key pair: [HIDDEN]${NC}"
        read -p "Generate new manifest signing key pair? (press Enter to keep current, or type 'y' to regenerate): " regenerate_choice
        regenerate_choice=$(strip_carriage_returns "$regenerate_choice")
        if [ "$regenerate_choice" = "y" ] || [ "$regenerate_choice" = "Y" ]; then
            should_generate="true"
        fi
    fi

    if [ "$should_generate" = "true" ]; then
        echo -e "${YELLOW}Generating manifest signing RSA key pair...${NC}"
        if generate_manifest_signing_key_pair; then
            echo -e "${GREEN}✅ Manifest signing key pair generated${NC}"
        else
            echo -e "${RED}❌ Error: Failed to generate manifest signing key pair${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Keeping current manifest signing key pair${NC}"
    fi

    if [ -z "$MANIFEST_SIGNING_KEY_ID" ] || is_placeholder "$MANIFEST_SIGNING_KEY_ID" || [ "$should_generate" = "true" ]; then
        local generated_key_id
        generated_key_id=$(generate_worker_subdomain_label)
        if [ -z "$generated_key_id" ] || [ ${#generated_key_id} -ne 10 ]; then
            echo -e "${RED}❌ Error: Failed to generate MANIFEST_SIGNING_KEY_ID${NC}"
            exit 1
        fi
        MANIFEST_SIGNING_KEY_ID="$generated_key_id"
        export MANIFEST_SIGNING_KEY_ID
        write_env_var "MANIFEST_SIGNING_KEY_ID" "$MANIFEST_SIGNING_KEY_ID"
        echo -e "${GREEN}✅ MANIFEST_SIGNING_KEY_ID generated: $MANIFEST_SIGNING_KEY_ID${NC}"
    else
        echo -e "${GREEN}✅ MANIFEST_SIGNING_KEY_ID: $MANIFEST_SIGNING_KEY_ID${NC}"
    fi

    echo ""
}

# Validate required variables
required_vars=(
    # Core Cloudflare Configuration
    "ACCOUNT_ID"
    
    # Shared Authentication & Storage
    "USER_DB_AUTH"
    "R2_KEY_SECRET"
    "IMAGES_API_TOKEN"
    
    # Firebase Auth Configuration
    "API_KEY"
    "AUTH_DOMAIN"
    "PROJECT_ID"
    "STORAGE_BUCKET"
    "MESSAGING_SENDER_ID"
    "APP_ID"
    "MEASUREMENT_ID"
    "FIREBASE_SERVICE_ACCOUNT_EMAIL"
    "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY"
    
    # Pages Configuration
    "PAGES_PROJECT_NAME"
    "PAGES_CUSTOM_DOMAIN"

    # Cloudflare Access Worker Security
    "CF_ACCESS_JWKS_URL"
    "KEYS_CF_ACCESS_AUD"
    "USER_CF_ACCESS_AUD"
    "DATA_CF_ACCESS_AUD"
    "AUDIT_CF_ACCESS_AUD"
    "IMAGES_CF_ACCESS_AUD"
    "PDF_CF_ACCESS_AUD"
    
    # Worker Names (required for config replacement)
    "KEYS_WORKER_NAME"
    "USER_WORKER_NAME"
    "DATA_WORKER_NAME"
    "AUDIT_WORKER_NAME"
    "IMAGES_WORKER_NAME"
    "PDF_WORKER_NAME"
    
    # Worker Domains (required for config replacement)
    "KEYS_WORKER_DOMAIN"
    "USER_WORKER_DOMAIN"
    "DATA_WORKER_DOMAIN"
    "AUDIT_WORKER_DOMAIN"
    "IMAGES_WORKER_DOMAIN"
    "PDF_WORKER_DOMAIN"
    
    # Storage Configuration (required for config replacement)
    "DATA_BUCKET_NAME"
    "AUDIT_BUCKET_NAME"
    "KV_STORE_ID"
    
    # Worker-Specific Secrets (required for deployment)
    "KEYS_AUTH"
    "PDF_WORKER_AUTH"
    "ACCOUNT_HASH"
    "API_TOKEN"
    "HMAC_KEY"
    "MANIFEST_SIGNING_PRIVATE_KEY"
    "MANIFEST_SIGNING_KEY_ID"
    "MANIFEST_SIGNING_PUBLIC_KEY"
)

validate_required_vars() {
    echo -e "${YELLOW}🔍 Validating required environment variables...${NC}"
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || is_placeholder "${!var}"; then
            echo -e "${RED}❌ Error: $var is not set in .env file or is a placeholder${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✅ All required variables found${NC}"
}

assert_file_exists() {
    local file_path=$1

    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ Error: required file is missing: $file_path${NC}"
        exit 1
    fi
}

assert_contains_literal() {
    local file_path=$1
    local literal=$2
    local description=$3

    if ! grep -Fq "$literal" "$file_path"; then
        echo -e "${RED}❌ Error: ${description}${NC}"
        echo -e "${YELLOW}   Expected to find '$literal' in $file_path${NC}"
        exit 1
    fi
}

assert_no_match_in_file() {
    local file_path=$1
    local pattern=$2
    local description=$3
    local matches

    matches=$(grep -En "$pattern" "$file_path" | head -n 3 || true)
    if [ -n "$matches" ]; then
        echo -e "${RED}❌ Error: ${description}${NC}"
        echo -e "${YELLOW}   First matching lines in $file_path:${NC}"
        echo "$matches"
        exit 1
    fi
}

validate_json_file() {
    local file_path=$1

    if ! node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));" "$file_path" > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: invalid JSON in $file_path${NC}"
        exit 1
    fi
}

validate_domain_var() {
    local var_name=$1
    local value="${!var_name}"
    local normalized

    value=$(strip_carriage_returns "$value")
    normalized=$(normalize_domain_value "$value")

    if [ -z "$value" ] || is_placeholder "$value"; then
        echo -e "${RED}❌ Error: $var_name is missing or placeholder${NC}"
        exit 1
    fi

    if [ "$value" != "$normalized" ]; then
        echo -e "${RED}❌ Error: $var_name must not include protocol, trailing slash, or surrounding whitespace${NC}"
        echo -e "${YELLOW}   Use '$normalized' instead${NC}"
        exit 1
    fi

    if [[ "$value" == */* ]]; then
        echo -e "${RED}❌ Error: $var_name must be a bare domain (no path segments)${NC}"
        exit 1
    fi
}

validate_env_value_formats() {
    echo -e "${YELLOW}🔍 Validating environment value formats...${NC}"

    validate_domain_var "PAGES_CUSTOM_DOMAIN"
    validate_domain_var "KEYS_WORKER_DOMAIN"
    validate_domain_var "USER_WORKER_DOMAIN"
    validate_domain_var "DATA_WORKER_DOMAIN"
    validate_domain_var "AUDIT_WORKER_DOMAIN"
    validate_domain_var "IMAGES_WORKER_DOMAIN"
    validate_domain_var "PDF_WORKER_DOMAIN"

    if ! [[ "$KV_STORE_ID" =~ ^([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$ ]]; then
        echo -e "${RED}❌ Error: KV_STORE_ID must be a 32-character hex namespace ID (or UUID format)${NC}"
        exit 1
    fi

    if [[ "$ACCOUNT_ID" =~ [[:space:]] ]]; then
        echo -e "${RED}❌ Error: ACCOUNT_ID must not contain whitespace${NC}"
        exit 1
    fi

    if ! [[ "$CF_ACCESS_JWKS_URL" =~ ^https://[^[:space:]]+$ ]]; then
        echo -e "${RED}❌ Error: CF_ACCESS_JWKS_URL must be a valid https URL${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Environment value formats look valid${NC}"
}

validate_env_file_entries() {
    local var_name
    local escaped_var_name
    local count

    echo -e "${YELLOW}🔍 Verifying required .env entries...${NC}"
    for var_name in "${required_vars[@]}"; do
        escaped_var_name=$(escape_for_sed_pattern "$var_name")
        count=$(grep -c "^$escaped_var_name=" .env || true)

        if [ "$count" -lt 1 ]; then
            echo -e "${RED}❌ Error: missing .env entry for $var_name${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✅ Required .env entries found${NC}"
}

validate_generated_configs() {
    echo -e "${YELLOW}🔍 Running generated configuration checkpoint validations...${NC}"

    local required_files=(
        "wrangler.toml"
        "app/config/config.json"
        "app/config/firebase.ts"
        "app/config/admin-service.json"
        "workers/audit-worker/wrangler.jsonc"
        "workers/data-worker/wrangler.jsonc"
        "workers/image-worker/wrangler.jsonc"
        "workers/keys-worker/wrangler.jsonc"
        "workers/pdf-worker/wrangler.jsonc"
        "workers/user-worker/wrangler.jsonc"
        "workers/audit-worker/src/audit-worker.ts"
        "workers/data-worker/src/data-worker.ts"
        "workers/image-worker/src/image-worker.ts"
        "workers/keys-worker/src/keys.ts"
        "workers/pdf-worker/src/pdf-worker.ts"
        "workers/user-worker/src/user-worker.ts"
    )

    local file_path
    for file_path in "${required_files[@]}"; do
        assert_file_exists "$file_path"
    done

    validate_json_file "app/config/config.json"
    validate_json_file "app/config/admin-service.json"

    assert_contains_literal "wrangler.toml" "\"$PAGES_PROJECT_NAME\"" "PAGES_PROJECT_NAME was not applied to wrangler.toml"

    assert_contains_literal "workers/keys-worker/wrangler.jsonc" "$KEYS_WORKER_NAME" "KEYS_WORKER_NAME was not applied"
    assert_contains_literal "workers/user-worker/wrangler.jsonc" "$USER_WORKER_NAME" "USER_WORKER_NAME was not applied"
    assert_contains_literal "workers/data-worker/wrangler.jsonc" "$DATA_WORKER_NAME" "DATA_WORKER_NAME was not applied"
    assert_contains_literal "workers/audit-worker/wrangler.jsonc" "$AUDIT_WORKER_NAME" "AUDIT_WORKER_NAME was not applied"
    assert_contains_literal "workers/image-worker/wrangler.jsonc" "$IMAGES_WORKER_NAME" "IMAGES_WORKER_NAME was not applied"
    assert_contains_literal "workers/pdf-worker/wrangler.jsonc" "$PDF_WORKER_NAME" "PDF_WORKER_NAME was not applied"

    assert_contains_literal "workers/keys-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in keys worker config"
    assert_contains_literal "workers/user-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in user worker config"
    assert_contains_literal "workers/data-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in data worker config"
    assert_contains_literal "workers/audit-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in audit worker config"
    assert_contains_literal "workers/image-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in image worker config"
    assert_contains_literal "workers/pdf-worker/wrangler.jsonc" "$ACCOUNT_ID" "ACCOUNT_ID missing in pdf worker config"

    assert_contains_literal "workers/keys-worker/wrangler.jsonc" "$KEYS_WORKER_DOMAIN" "KEYS_WORKER_DOMAIN missing in keys worker config"
    assert_contains_literal "workers/user-worker/wrangler.jsonc" "$USER_WORKER_DOMAIN" "USER_WORKER_DOMAIN missing in user worker config"
    assert_contains_literal "workers/data-worker/wrangler.jsonc" "$DATA_WORKER_DOMAIN" "DATA_WORKER_DOMAIN missing in data worker config"
    assert_contains_literal "workers/audit-worker/wrangler.jsonc" "$AUDIT_WORKER_DOMAIN" "AUDIT_WORKER_DOMAIN missing in audit worker config"
    assert_contains_literal "workers/image-worker/wrangler.jsonc" "$IMAGES_WORKER_DOMAIN" "IMAGES_WORKER_DOMAIN missing in image worker config"
    assert_contains_literal "workers/pdf-worker/wrangler.jsonc" "$PDF_WORKER_DOMAIN" "PDF_WORKER_DOMAIN missing in pdf worker config"

    assert_contains_literal "workers/data-worker/wrangler.jsonc" "$DATA_BUCKET_NAME" "DATA_BUCKET_NAME missing in data worker config"
    assert_contains_literal "workers/audit-worker/wrangler.jsonc" "$AUDIT_BUCKET_NAME" "AUDIT_BUCKET_NAME missing in audit worker config"
    assert_contains_literal "workers/user-worker/wrangler.jsonc" "$KV_STORE_ID" "KV_STORE_ID missing in user worker config"

    assert_contains_literal "app/config/config.json" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in app/config/config.json"
    assert_contains_literal "app/config/config.json" "$ACCOUNT_HASH" "ACCOUNT_HASH missing in app/config/config.json"

    assert_contains_literal "app/config/firebase.ts" "$API_KEY" "API_KEY missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$AUTH_DOMAIN" "AUTH_DOMAIN missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$PROJECT_ID" "PROJECT_ID missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$STORAGE_BUCKET" "STORAGE_BUCKET missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$MESSAGING_SENDER_ID" "MESSAGING_SENDER_ID missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$APP_ID" "APP_ID missing in app/config/firebase.ts"
    assert_contains_literal "app/config/firebase.ts" "$MEASUREMENT_ID" "MEASUREMENT_ID missing in app/config/firebase.ts"

    assert_contains_literal "workers/audit-worker/src/audit-worker.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in audit-worker source"
    assert_contains_literal "workers/data-worker/src/data-worker.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in data-worker source"
    assert_contains_literal "workers/image-worker/src/image-worker.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in image-worker source"
    assert_contains_literal "workers/keys-worker/src/keys.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in keys-worker source"
    assert_contains_literal "workers/pdf-worker/src/pdf-worker.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in pdf-worker source"
    assert_contains_literal "workers/user-worker/src/user-worker.ts" "https://$PAGES_CUSTOM_DOMAIN" "PAGES_CUSTOM_DOMAIN missing in user-worker source"

    local placeholder_pattern
    placeholder_pattern="(\"(ACCOUNT_ID|PAGES_PROJECT_NAME|PAGES_CUSTOM_DOMAIN|KEYS_WORKER_NAME|USER_WORKER_NAME|DATA_WORKER_NAME|AUDIT_WORKER_NAME|IMAGES_WORKER_NAME|PDF_WORKER_NAME|KEYS_WORKER_DOMAIN|USER_WORKER_DOMAIN|DATA_WORKER_DOMAIN|AUDIT_WORKER_DOMAIN|IMAGES_WORKER_DOMAIN|PDF_WORKER_DOMAIN|DATA_BUCKET_NAME|AUDIT_BUCKET_NAME|KV_STORE_ID|ACCOUNT_HASH|MANIFEST_SIGNING_KEY_ID|MANIFEST_SIGNING_PUBLIC_KEY|YOUR_FIREBASE_API_KEY|YOUR_FIREBASE_AUTH_DOMAIN|YOUR_FIREBASE_PROJECT_ID|YOUR_FIREBASE_STORAGE_BUCKET|YOUR_FIREBASE_MESSAGING_SENDER_ID|YOUR_FIREBASE_APP_ID|YOUR_FIREBASE_MEASUREMENT_ID)\"|'(PAGES_CUSTOM_DOMAIN|DATA_WORKER_DOMAIN|IMAGES_WORKER_DOMAIN)')"

    local files_to_scan=(
        "wrangler.toml"
        "workers/audit-worker/wrangler.jsonc"
        "workers/data-worker/wrangler.jsonc"
        "workers/image-worker/wrangler.jsonc"
        "workers/keys-worker/wrangler.jsonc"
        "workers/pdf-worker/wrangler.jsonc"
        "workers/user-worker/wrangler.jsonc"
        "workers/audit-worker/src/audit-worker.ts"
        "workers/data-worker/src/data-worker.ts"
        "workers/image-worker/src/image-worker.ts"
        "workers/keys-worker/src/keys.ts"
        "workers/pdf-worker/src/pdf-worker.ts"
        "workers/user-worker/src/user-worker.ts"
        "app/config/config.json"
        "app/config/firebase.ts"
    )

    for file_path in "${files_to_scan[@]}"; do
        assert_no_match_in_file "$file_path" "$placeholder_pattern" "Unresolved placeholder token found after config update"
    done

    echo -e "${GREEN}✅ Generated configuration checkpoint validation passed${NC}"
}

run_validation_checkpoint() {
    validate_required_vars
    validate_env_value_formats
    validate_env_file_entries
    validate_generated_configs
}

if [ "$validate_only" = "true" ]; then
    echo -e "\n${BLUE}🧪 Validate-only mode enabled${NC}"
    run_validation_checkpoint
    echo -e "\n${GREEN}🎉 Configuration validation completed successfully!${NC}"
    exit 0
fi

# Function to copy example configuration files
copy_example_configs() {
    echo -e "\n${BLUE}📋 Copying example configuration files...${NC}"
    
    # Copy app configuration files
    echo -e "${YELLOW}  Copying app configuration files...${NC}"
    
    # Copy app config-example directory to config (always sync non-admin files)
    if [ -d "app/config-example" ]; then
        local admin_service_backup=""
        local copied_config_files=0
        local skipped_existing_files=0

        if [ -f "app/config/admin-service.json" ]; then
            admin_service_backup=$(mktemp)
            cp "app/config/admin-service.json" "$admin_service_backup"
        fi

        if [ "$update_env" = "true" ]; then
            rm -rf app/config
        fi

        mkdir -p app/config

        while IFS= read -r source_file; do
            local relative_path
            local destination_file
            relative_path="${source_file#app/config-example/}"
            destination_file="app/config/$relative_path"

            mkdir -p "$(dirname "$destination_file")"

            if [ "$update_env" = "true" ] || [ ! -f "$destination_file" ]; then
                cp "$source_file" "$destination_file"
                copied_config_files=$((copied_config_files + 1))
            else
                skipped_existing_files=$((skipped_existing_files + 1))
            fi
        done < <(find app/config-example -type f ! -name "admin-service.json")

        # Ensure example credentials are never copied from config-example.
        rm -f app/config/admin-service.json

        if [ -n "$admin_service_backup" ] && [ -f "$admin_service_backup" ]; then
            cp "$admin_service_backup" "app/config/admin-service.json"
            rm -f "$admin_service_backup"
            echo -e "${GREEN}    ✅ app: preserved existing admin-service.json${NC}"
        else
            echo -e "${YELLOW}    ⚠️  app: skipped copying admin-service.json (provide your own credentials file)${NC}"
        fi

        if [ "$update_env" = "true" ]; then
            echo -e "${GREEN}    ✅ app: config directory reset from config-example (excluding admin-service.json)${NC}"
        else
            echo -e "${GREEN}    ✅ app: synced missing files from config-example (excluding admin-service.json)${NC}"
        fi

        if [ "$skipped_existing_files" -gt 0 ]; then
            echo -e "${YELLOW}    ℹ️  app: kept $skipped_existing_files existing config file(s)${NC}"
        fi

        echo -e "${GREEN}    ✅ app: copied $copied_config_files config file(s) from config-example${NC}"
    fi
    
    # Navigate to each worker directory and copy the example file
    echo -e "${YELLOW}  Copying worker configuration files...${NC}"
    
    cd workers/keys-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ keys-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  keys-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    cd ../user-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ user-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  user-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    cd ../data-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ data-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  data-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    cd ../audit-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ audit-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  audit-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    cd ../image-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ image-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  image-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    cd ../pdf-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ pdf-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  pdf-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    # Return to project root
    cd ../..

    # Copy worker source template files
    echo -e "${YELLOW}  Copying worker source template files...${NC}"

    if [ -f "workers/keys-worker/src/keys.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/keys-worker/src/keys.ts" ]; }; then
        cp workers/keys-worker/src/keys.example.ts workers/keys-worker/src/keys.ts
        echo -e "${GREEN}    ✅ keys-worker: keys.ts created from example${NC}"
    elif [ -f "workers/keys-worker/src/keys.ts" ]; then
        echo -e "${YELLOW}    ⚠️  keys-worker: keys.ts already exists, skipping copy${NC}"
    fi

    if [ -f "workers/user-worker/src/user-worker.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/user-worker/src/user-worker.ts" ]; }; then
        cp workers/user-worker/src/user-worker.example.ts workers/user-worker/src/user-worker.ts
        echo -e "${GREEN}    ✅ user-worker: user-worker.ts created from example${NC}"
    elif [ -f "workers/user-worker/src/user-worker.ts" ]; then
        echo -e "${YELLOW}    ⚠️  user-worker: user-worker.ts already exists, skipping copy${NC}"
    fi

    if [ -f "workers/data-worker/src/data-worker.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/data-worker/src/data-worker.ts" ]; }; then
        cp workers/data-worker/src/data-worker.example.ts workers/data-worker/src/data-worker.ts
        echo -e "${GREEN}    ✅ data-worker: data-worker.ts created from example${NC}"
    elif [ -f "workers/data-worker/src/data-worker.ts" ]; then
        echo -e "${YELLOW}    ⚠️  data-worker: data-worker.ts already exists, skipping copy${NC}"
    fi

    if [ -f "workers/audit-worker/src/audit-worker.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/audit-worker/src/audit-worker.ts" ]; }; then
        cp workers/audit-worker/src/audit-worker.example.ts workers/audit-worker/src/audit-worker.ts
        echo -e "${GREEN}    ✅ audit-worker: audit-worker.ts created from example${NC}"
    elif [ -f "workers/audit-worker/src/audit-worker.ts" ]; then
        echo -e "${YELLOW}    ⚠️  audit-worker: audit-worker.ts already exists, skipping copy${NC}"
    fi

    if [ -f "workers/image-worker/src/image-worker.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/image-worker/src/image-worker.ts" ]; }; then
        cp workers/image-worker/src/image-worker.example.ts workers/image-worker/src/image-worker.ts
        echo -e "${GREEN}    ✅ image-worker: image-worker.ts created from example${NC}"
    elif [ -f "workers/image-worker/src/image-worker.ts" ]; then
        echo -e "${YELLOW}    ⚠️  image-worker: image-worker.ts already exists, skipping copy${NC}"
    fi

    if [ -f "workers/pdf-worker/src/pdf-worker.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/pdf-worker/src/pdf-worker.ts" ]; }; then
        cp workers/pdf-worker/src/pdf-worker.example.ts workers/pdf-worker/src/pdf-worker.ts
        echo -e "${GREEN}    ✅ pdf-worker: pdf-worker.ts created from example${NC}"
    elif [ -f "workers/pdf-worker/src/pdf-worker.ts" ]; then
        echo -e "${YELLOW}    ⚠️  pdf-worker: pdf-worker.ts already exists, skipping copy${NC}"
    fi
    
    # Copy main wrangler.toml from example
    if [ -f "wrangler.toml.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.toml" ]; }; then
        cp wrangler.toml.example wrangler.toml
        echo -e "${GREEN}    ✅ root: wrangler.toml created from example${NC}"
    elif [ -f "wrangler.toml" ]; then
        echo -e "${YELLOW}    ⚠️  root: wrangler.toml already exists, skipping copy${NC}"
    fi
    
    echo -e "${GREEN}✅ Configuration file copying completed${NC}"
}

# Copy example configuration files
copy_example_configs

# Load required Firebase admin service credentials from app/config/admin-service.json
load_admin_service_credentials

# Function to prompt for environment variables and update .env file
prompt_for_secrets() {
    echo -e "\n${BLUE}🔐 Environment Variables Setup${NC}"
    echo "=============================="
    echo -e "${YELLOW}Please provide values for the following environment variables.${NC}"
    echo -e "${YELLOW}Press Enter to keep existing values (if any).${NC}"
    echo ""
    
    # Create or backup existing .env
    if [ -f ".env" ] && [ "$update_env" != "true" ]; then
        cp .env .env.backup
        echo -e "${GREEN}📄 Existing .env backed up to .env.backup${NC}"
    fi
    
    # Copy .env.example to .env if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${GREEN}📄 Created .env from .env.example${NC}"
    fi
    
    # Function to prompt for a variable
    prompt_for_var() {
        local var_name=$1
        local description=$2
        local current_value="${!var_name}"
        local new_value=""
        local allow_keep="false"

        current_value=$(strip_carriage_returns "$current_value")

        # Allow one-time migration from legacy shared CF_ACCESS_AUD to per-worker AUD values.
        if [[ "$var_name" == *_CF_ACCESS_AUD ]] && { [ -z "$current_value" ] || is_placeholder "$current_value"; } && [ -n "$CF_ACCESS_AUD" ] && ! is_placeholder "$CF_ACCESS_AUD"; then
            current_value=$(strip_carriage_returns "$CF_ACCESS_AUD")
        fi

        if [ "$var_name" = "PAGES_CUSTOM_DOMAIN" ] || [[ "$var_name" == *_WORKER_DOMAIN ]]; then
            current_value=$(resolve_existing_domain_value "$var_name" "$current_value")
        fi
        
        # Auto-generate specific authentication secrets - but allow keeping current
        if [ "$var_name" = "USER_DB_AUTH" ] || [ "$var_name" = "R2_KEY_SECRET" ] || [ "$var_name" = "KEYS_AUTH" ] || [ "$var_name" = "PDF_WORKER_AUTH" ]; then
            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"
            
            if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value" && [ "$current_value" != "your_custom_user_db_auth_token_here" ] && [ "$current_value" != "your_custom_r2_secret_here" ] && [ "$current_value" != "your_custom_keys_auth_token_here" ] && [ "$current_value" != "your_custom_pdf_worker_auth_token_here" ]; then
                # Current value exists and is not a placeholder
                echo -e "${GREEN}Current value: [HIDDEN]${NC}"
                read -p "Generate new secret? (press Enter to keep current, or type 'y' to generate): " gen_choice
                gen_choice=$(strip_carriage_returns "$gen_choice")
                
                if [ "$gen_choice" = "y" ] || [ "$gen_choice" = "Y" ]; then
                    new_value=$(openssl rand -hex 32 2>/dev/null || echo "")
                    if [ -n "$new_value" ]; then
                        echo -e "${GREEN}✅ $var_name auto-generated${NC}"
                    else
                        while true; do
                            echo -e "${RED}❌ Failed to auto-generate, please enter manually:${NC}"
                            read -p "Enter value: " new_value
                            new_value=$(strip_carriage_returns "$new_value")
                            if [ -z "$new_value" ]; then
                                echo -e "${RED}❌ A value is required.${NC}"
                                continue
                            fi
                            if is_placeholder "$new_value"; then
                                echo -e "${RED}❌ Placeholder values are not allowed.${NC}"
                                new_value=""
                                continue
                            fi
                            break
                        done
                    fi
                else
                    # User wants to keep current value
                    new_value=""
                fi
            else
                # No current value or placeholder value - auto-generate
                echo -e "${YELLOW}Auto-generating secret...${NC}"
                new_value=$(openssl rand -hex 32 2>/dev/null || echo "")
                if [ -n "$new_value" ]; then
                    echo -e "${GREEN}✅ $var_name auto-generated${NC}"
                else
                    while true; do
                        echo -e "${RED}❌ Failed to auto-generate, please enter manually:${NC}"
                        read -p "Enter value: " new_value
                        new_value=$(strip_carriage_returns "$new_value")
                        if [ -z "$new_value" ]; then
                            echo -e "${RED}❌ A value is required.${NC}"
                            continue
                        fi
                        if is_placeholder "$new_value"; then
                            echo -e "${RED}❌ Placeholder values are not allowed.${NC}"
                            new_value=""
                            continue
                        fi
                        break
                    done
                fi
            fi
        elif [[ "$var_name" == *_WORKER_DOMAIN ]]; then
            local worker_name_var
            local worker_name_current=""
            local worker_name_input=""
            local worker_subdomain_input=""
            local inferred_subdomain=""
            local domain_choice=""
            local composed_domain=""

            worker_name_var=$(worker_name_var_for_domain_var "$var_name")
            worker_name_current=$(strip_carriage_returns "${!worker_name_var}")

            if [ -n "$worker_name_current" ] && ! is_placeholder "$worker_name_current" && [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
                case "$current_value" in
                    "$worker_name_current".*)
                        inferred_subdomain="${current_value#${worker_name_current}.}"
                        ;;
                esac
            fi

            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"

            while true; do
                if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
                    echo -e "${GREEN}Current value: $current_value${NC}"
                    read -p "Press Enter to keep current, or type 'y' to rebuild from worker-name and worker-subdomain: " domain_choice
                    domain_choice=$(strip_carriage_returns "$domain_choice")

                    if [ -z "$domain_choice" ]; then
                        new_value=""
                        break
                    fi

                    if [ "$domain_choice" != "y" ] && [ "$domain_choice" != "Y" ]; then
                        echo -e "${RED}❌ Please press Enter to keep current or type 'y' to rebuild.${NC}"
                        continue
                    fi
                fi

                if [ -n "$worker_name_current" ] && ! is_placeholder "$worker_name_current"; then
                    read -p "Prompt: worker-name [$worker_name_current]: " worker_name_input
                    worker_name_input=$(strip_carriage_returns "$worker_name_input")
                    if [ -z "$worker_name_input" ]; then
                        worker_name_input="$worker_name_current"
                    fi
                else
                    read -p "Prompt: worker-name: " worker_name_input
                    worker_name_input=$(strip_carriage_returns "$worker_name_input")
                fi

                if [ -z "$worker_name_input" ] || is_placeholder "$worker_name_input"; then
                    echo -e "${RED}❌ worker-name is required and cannot be a placeholder.${NC}"
                    continue
                fi

                worker_name_input=$(normalize_domain_value "$worker_name_input")
                worker_name_input="${worker_name_input#.}"
                worker_name_input="${worker_name_input%.}"

                if [[ "$worker_name_input" == *.* ]] || [[ "$worker_name_input" == */* ]]; then
                    echo -e "${RED}❌ worker-name must be a single hostname label (for example: striae-dev-data).${NC}"
                    continue
                fi

                if [ -n "$inferred_subdomain" ]; then
                    read -p "Prompt: worker-subdomain [$inferred_subdomain]: " worker_subdomain_input
                    worker_subdomain_input=$(strip_carriage_returns "$worker_subdomain_input")
                    if [ -z "$worker_subdomain_input" ]; then
                        worker_subdomain_input="$inferred_subdomain"
                    fi
                else
                    read -p "Prompt: worker-subdomain: " worker_subdomain_input
                    worker_subdomain_input=$(strip_carriage_returns "$worker_subdomain_input")
                fi

                if [ -z "$worker_subdomain_input" ] || is_placeholder "$worker_subdomain_input"; then
                    echo -e "${RED}❌ worker-subdomain is required and cannot be a placeholder.${NC}"
                    continue
                fi

                worker_subdomain_input=$(normalize_domain_value "$worker_subdomain_input")
                worker_subdomain_input="${worker_subdomain_input#.}"
                worker_subdomain_input="${worker_subdomain_input%.}"

                composed_domain=$(compose_worker_domain "$worker_name_input" "$worker_subdomain_input" || echo "")
                if [ -z "$composed_domain" ]; then
                    echo -e "${RED}❌ Invalid worker-name/worker-subdomain combination.${NC}"
                    continue
                fi

                if [ -n "$worker_name_var" ]; then
                    write_env_var "$worker_name_var" "$worker_name_input"
                    export "$worker_name_var=$worker_name_input"
                    worker_name_current="$worker_name_input"
                fi

                new_value="$composed_domain"
                echo -e "${GREEN}Resulting worker domain: $new_value${NC}"
                break
            done
        else
            # Normal prompt for other variables
            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"
            if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
                allow_keep="true"
                if [ "$var_name" = "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY" ]; then
                    echo -e "${GREEN}Current value: [HIDDEN]${NC}"
                else
                    echo -e "${GREEN}Current value: $current_value${NC}"
                fi
            fi

            while true; do
                if [ "$allow_keep" = "true" ]; then
                    read -p "New value (or press Enter to keep current): " new_value
                    new_value=$(strip_carriage_returns "$new_value")
                    if [ -z "$new_value" ]; then
                        break
                    fi
                else
                    read -p "Enter value: " new_value
                    new_value=$(strip_carriage_returns "$new_value")
                    if [ -z "$new_value" ]; then
                        echo -e "${RED}❌ A value is required.${NC}"
                        continue
                    fi
                fi

                if is_placeholder "$new_value"; then
                    echo -e "${RED}❌ Placeholder values are not allowed.${NC}"
                    new_value=""
                    continue
                fi

                break
            done
        fi
        
        if [ -n "$new_value" ]; then
            if [ "$var_name" = "PAGES_CUSTOM_DOMAIN" ] || [[ "$var_name" == *_WORKER_DOMAIN ]]; then
                new_value=$(normalize_domain_value "$new_value")
            fi

            # Update the .env file
            write_env_var "$var_name" "$new_value"

            export "$var_name=$new_value"
            echo -e "${GREEN}✅ $var_name updated${NC}"
        elif [ -n "$current_value" ]; then
            # Keep values aligned with .env.example ordering and remove stale duplicates.
            write_env_var "$var_name" "$current_value"
            export "$var_name=$current_value"
            echo -e "${GREEN}✅ Keeping current value for $var_name${NC}"
        fi
        echo ""
    }
    
    echo -e "${BLUE}📊 CLOUDFLARE CORE CONFIGURATION${NC}"
    echo "=================================="
    prompt_for_var "ACCOUNT_ID" "Your Cloudflare Account ID"
    
    echo -e "${BLUE}🔐 SHARED AUTHENTICATION & STORAGE${NC}"
    echo "==================================="
    prompt_for_var "USER_DB_AUTH" "Custom user database authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "R2_KEY_SECRET" "Custom R2 storage authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "IMAGES_API_TOKEN" "Cloudflare Images API token (shared between workers)"
    
    echo -e "${BLUE}🔥 FIREBASE AUTH CONFIGURATION${NC}"
    echo "==============================="
    prompt_for_var "API_KEY" "Firebase API key"
    prompt_for_var "AUTH_DOMAIN" "Firebase auth domain (project-id.firebaseapp.com)"
    prompt_for_var "STORAGE_BUCKET" "Firebase storage bucket"
    prompt_for_var "MESSAGING_SENDER_ID" "Firebase messaging sender ID"
    prompt_for_var "APP_ID" "Firebase app ID"
    prompt_for_var "MEASUREMENT_ID" "Firebase measurement ID (optional)"
    echo -e "${GREEN}Using PROJECT_ID and service account values from app/config/admin-service.json${NC}"
    
    echo -e "${BLUE}📄 PAGES CONFIGURATION${NC}"
    echo "======================"
    prompt_for_var "PAGES_PROJECT_NAME" "Your Cloudflare Pages project name"
    prompt_for_var "PAGES_CUSTOM_DOMAIN" "Your custom domain (e.g., striae.org) - DO NOT include https://"

    echo -e "${BLUE}🛡️ CLOUDFLARE ACCESS (WORKER PROTECTION)${NC}"
    echo "========================================="
    prompt_for_var "CF_ACCESS_JWKS_URL" "Cloudflare Access JWKS URL (e.g., https://<team>.cloudflareaccess.com/cdn-cgi/access/certs)"
    prompt_for_var "KEYS_CF_ACCESS_AUD" "Cloudflare Access AUD claim for Keys Worker"
    prompt_for_var "USER_CF_ACCESS_AUD" "Cloudflare Access AUD claim for User Worker"
    prompt_for_var "DATA_CF_ACCESS_AUD" "Cloudflare Access AUD claim for Data Worker"
    prompt_for_var "AUDIT_CF_ACCESS_AUD" "Cloudflare Access AUD claim for Audit Worker"
    prompt_for_var "IMAGES_CF_ACCESS_AUD" "Cloudflare Access AUD claim for Images Worker"
    prompt_for_var "PDF_CF_ACCESS_AUD" "Cloudflare Access AUD claim for PDF Worker"
    
    echo -e "${BLUE}🔑 WORKER NAMES & DOMAINS${NC}"
    echo "========================="
    prompt_for_var "KEYS_WORKER_NAME" "Keys worker name"
    prompt_for_var "KEYS_WORKER_DOMAIN" "Keys worker domain (format: {worker-name}.{worker-subdomain})"
    prompt_for_var "USER_WORKER_NAME" "User worker name"
    prompt_for_var "USER_WORKER_DOMAIN" "User worker domain (format: {worker-name}.{worker-subdomain})"
    prompt_for_var "DATA_WORKER_NAME" "Data worker name"
    prompt_for_var "DATA_WORKER_DOMAIN" "Data worker domain (format: {worker-name}.{worker-subdomain})"
    prompt_for_var "AUDIT_WORKER_NAME" "Audit worker name"
    prompt_for_var "AUDIT_WORKER_DOMAIN" "Audit worker domain (format: {worker-name}.{worker-subdomain})"
    prompt_for_var "IMAGES_WORKER_NAME" "Images worker name"
    prompt_for_var "IMAGES_WORKER_DOMAIN" "Images worker domain (format: {worker-name}.{worker-subdomain})"
    prompt_for_var "PDF_WORKER_NAME" "PDF worker name"
    prompt_for_var "PDF_WORKER_DOMAIN" "PDF worker domain (format: {worker-name}.{worker-subdomain})"
    
    echo -e "${BLUE}🗄️ STORAGE CONFIGURATION${NC}"
    echo "========================="
    prompt_for_var "DATA_BUCKET_NAME" "Your R2 bucket name for case data storage"
    prompt_for_var "AUDIT_BUCKET_NAME" "Your R2 bucket name for audit logs (separate from data bucket)"
    prompt_for_var "KV_STORE_ID" "Your KV namespace ID (UUID format)"
    
    echo -e "${BLUE}🔐 SERVICE-SPECIFIC SECRETS${NC}"
    echo "============================"
    prompt_for_var "KEYS_AUTH" "Keys worker authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "PDF_WORKER_AUTH" "PDF worker authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "ACCOUNT_HASH" "Cloudflare Images Account Hash"
    prompt_for_var "API_TOKEN" "Cloudflare Images API token (for Images Worker)"
    prompt_for_var "HMAC_KEY" "Cloudflare Images HMAC signing key"

    configure_manifest_signing_credentials
    
    # Reload the updated .env file
    source .env
    
    echo -e "${GREEN}🎉 Environment variables setup completed!${NC}"
    echo -e "${BLUE}📄 All values saved to .env file${NC}"
}

# Always prompt for secrets to ensure configuration
prompt_for_secrets

# Validate after secrets have been configured
validate_required_vars

# Function to replace variables in wrangler configuration files
update_wrangler_configs() {
    echo -e "\n${BLUE}🔧 Updating wrangler configuration files...${NC}"

    local normalized_pages_custom_domain
    local escaped_pages_custom_domain

    normalized_pages_custom_domain=$(normalize_domain_value "$PAGES_CUSTOM_DOMAIN")
    PAGES_CUSTOM_DOMAIN="$normalized_pages_custom_domain"
    export PAGES_CUSTOM_DOMAIN
    write_env_var "PAGES_CUSTOM_DOMAIN" "$PAGES_CUSTOM_DOMAIN"
    escaped_pages_custom_domain=$(escape_for_sed_replacement "$PAGES_CUSTOM_DOMAIN")
    
    # Audit Worker
    if [ -f "workers/audit-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating audit-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"AUDIT_WORKER_NAME\"/\"$AUDIT_WORKER_NAME\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"AUDIT_WORKER_DOMAIN\"/\"$AUDIT_WORKER_DOMAIN\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"AUDIT_BUCKET_NAME\"/\"$AUDIT_BUCKET_NAME\"/g" workers/audit-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ audit-worker configuration updated${NC}"
    fi
    
    # Update audit-worker source file domain placeholders
    if [ -f "workers/audit-worker/src/audit-worker.ts" ]; then
        echo -e "${YELLOW}  Updating audit-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/audit-worker/src/audit-worker.ts
        echo -e "${GREEN}    ✅ audit-worker source placeholders updated${NC}"
    fi
    
    # Data Worker
    if [ -f "workers/data-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating data-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"DATA_WORKER_NAME\"/\"$DATA_WORKER_NAME\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"DATA_WORKER_DOMAIN\"/\"$DATA_WORKER_DOMAIN\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"DATA_BUCKET_NAME\"/\"$DATA_BUCKET_NAME\"/g" workers/data-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ data-worker configuration updated${NC}"
    fi
    
    # Update data-worker source file domain placeholders
    if [ -f "workers/data-worker/src/data-worker.ts" ]; then
        echo -e "${YELLOW}  Updating data-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/data-worker/src/data-worker.ts
        echo -e "${GREEN}    ✅ data-worker source placeholders updated${NC}"
    fi
    
    # Image Worker
    if [ -f "workers/image-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating image-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"IMAGES_WORKER_NAME\"/\"$IMAGES_WORKER_NAME\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"IMAGES_WORKER_DOMAIN\"/\"$IMAGES_WORKER_DOMAIN\"/g" workers/image-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ image-worker configuration updated${NC}"
    fi
    
    # Update image-worker source file domain placeholders
    if [ -f "workers/image-worker/src/image-worker.ts" ]; then
        echo -e "${YELLOW}  Updating image-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/image-worker/src/image-worker.ts
        echo -e "${GREEN}    ✅ image-worker source placeholders updated${NC}"
    fi
    
    # Keys Worker
    if [ -f "workers/keys-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating keys-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"KEYS_WORKER_NAME\"/\"$KEYS_WORKER_NAME\"/g" workers/keys-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/keys-worker/wrangler.jsonc
        sed -i "s/\"KEYS_WORKER_DOMAIN\"/\"$KEYS_WORKER_DOMAIN\"/g" workers/keys-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ keys-worker configuration updated${NC}"
    fi
    
    # Update keys-worker source file domain placeholders
    if [ -f "workers/keys-worker/src/keys.ts" ]; then
        echo -e "${YELLOW}  Updating keys-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/keys-worker/src/keys.ts
        echo -e "${GREEN}    ✅ keys-worker source placeholders updated${NC}"
    fi
    
    # PDF Worker
    if [ -f "workers/pdf-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating pdf-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"PDF_WORKER_NAME\"/\"$PDF_WORKER_NAME\"/g" workers/pdf-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/pdf-worker/wrangler.jsonc
        sed -i "s/\"PDF_WORKER_DOMAIN\"/\"$PDF_WORKER_DOMAIN\"/g" workers/pdf-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ pdf-worker configuration updated${NC}"
    fi
    
    # Update pdf-worker source file domain placeholders
    if [ -f "workers/pdf-worker/src/pdf-worker.ts" ]; then
        echo -e "${YELLOW}  Updating pdf-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/pdf-worker/src/pdf-worker.ts
        echo -e "${GREEN}    ✅ pdf-worker source placeholders updated${NC}"
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
    
    # Update user-worker source file domain placeholders
    if [ -f "workers/user-worker/src/user-worker.ts" ]; then
        echo -e "${YELLOW}  Updating user-worker source placeholders...${NC}"
        sed -i "s|'Access-Control-Allow-Origin': '[^']*'|'Access-Control-Allow-Origin': 'https://$escaped_pages_custom_domain'|g" workers/user-worker/src/user-worker.ts
        sed -i "s|'DATA_WORKER_DOMAIN'|'https://$DATA_WORKER_DOMAIN'|g" workers/user-worker/src/user-worker.ts
        sed -i "s|'IMAGES_WORKER_DOMAIN'|'https://$IMAGES_WORKER_DOMAIN'|g" workers/user-worker/src/user-worker.ts
        echo -e "${GREEN}    ✅ user-worker source placeholders updated${NC}"
    fi
    
    # Main wrangler.toml
    if [ -f "wrangler.toml" ]; then
        echo -e "${YELLOW}  Updating wrangler.toml...${NC}"
        sed -i "s/\"PAGES_PROJECT_NAME\"/\"$PAGES_PROJECT_NAME\"/g" wrangler.toml
        echo -e "${GREEN}    ✅ main wrangler.toml configuration updated${NC}"
    fi
    
    # Update app configuration files
    echo -e "${YELLOW}  Updating app configuration files...${NC}"
    
    # Update app/config/config.json
    if [ -f "app/config/config.json" ]; then
        echo -e "${YELLOW}    Updating app/config/config.json...${NC}"
        local escaped_manifest_signing_key_id
        local escaped_manifest_signing_public_key
        local escaped_account_hash
        escaped_manifest_signing_key_id=$(escape_for_sed_replacement "$MANIFEST_SIGNING_KEY_ID")
        escaped_manifest_signing_public_key=$(escape_for_sed_replacement "$MANIFEST_SIGNING_PUBLIC_KEY")
        escaped_account_hash=$(escape_for_sed_replacement "$ACCOUNT_HASH")

        sed -i "s|\"url\": \"[^\"]*\"|\"url\": \"https://$escaped_pages_custom_domain\"|g" app/config/config.json
        sed -i "s|\"account_hash\": \"[^\"]*\"|\"account_hash\": \"$escaped_account_hash\"|g" app/config/config.json
        sed -i "s|\"MANIFEST_SIGNING_KEY_ID\"|\"$escaped_manifest_signing_key_id\"|g" app/config/config.json
        sed -i "s|\"MANIFEST_SIGNING_PUBLIC_KEY\"|\"$escaped_manifest_signing_public_key\"|g" app/config/config.json
        echo -e "${GREEN}      ✅ app config.json updated${NC}"
    fi
    
    # Update app/config/firebase.ts
    if [ -f "app/config/firebase.ts" ]; then
        echo -e "${YELLOW}    Updating app/config/firebase.ts...${NC}"
        sed -i "s|\"YOUR_FIREBASE_API_KEY\"|\"$API_KEY\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_AUTH_DOMAIN\"|\"$AUTH_DOMAIN\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_PROJECT_ID\"|\"$PROJECT_ID\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_STORAGE_BUCKET\"|\"$STORAGE_BUCKET\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_MESSAGING_SENDER_ID\"|\"$MESSAGING_SENDER_ID\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_APP_ID\"|\"$APP_ID\"|g" app/config/firebase.ts
        sed -i "s|\"YOUR_FIREBASE_MEASUREMENT_ID\"|\"$MEASUREMENT_ID\"|g" app/config/firebase.ts
        echo -e "${GREEN}      ✅ app firebase.ts updated${NC}"
    fi
    
    echo -e "${GREEN}✅ All configuration files updated${NC}"
}

# Update wrangler configurations
update_wrangler_configs

# Validate generated files and values after replacements
run_validation_checkpoint

echo -e "\n${GREEN}🎉 Configuration setup completed!${NC}"
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Install worker dependencies"
echo "   2. Deploy workers"
echo "   3. Deploy worker secrets"
echo "   4. Deploy pages"
echo -e "\n${GREEN}✨ Ready for deployment!${NC}"