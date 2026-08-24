#!/bin/bash

# Copyright (c) 2025 Stephen J. Lu
# SPDX-License-Identifier: Apache-2.0

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
force_rotate_keys=false
refresh_templates=false
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
        --force-rotate-keys)
            force_rotate_keys=true
            ;;
        --refresh-templates)
            refresh_templates=true
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

if [ "$force_rotate_keys" = "true" ] && [ "$validate_only" = "true" ]; then
    echo -e "${RED}❌ --force-rotate-keys and --validate-only cannot be used together${NC}"
    exit 1
fi

if [ "$refresh_templates" = "true" ] && [ "$validate_only" = "true" ]; then
    echo -e "${RED}❌ --refresh-templates and --validate-only cannot be used together${NC}"
    exit 1
fi

if [ "$show_help" = "true" ]; then
    echo "Usage: bash ./scripts/deploy-config.sh [--update-env] [--refresh-templates] [--validate-only] [--force-rotate-keys]"
    echo ""
    echo "Options:"
    echo "  --update-env        Reset .env from .env.example and overwrite configs"
    echo "  --refresh-templates Regenerate worker wrangler.jsonc/toml, app/config/firebase.ts, and"
    echo "                      app/config/config.json from the current *.example templates (picks"
    echo "                      up new template fields), then reapply values from the existing .env."
    echo "                      Does not reset .env. config.json's key-rotation history is rebuilt"
    echo "                      from the *_PUBLIC_KEYS_JSON registries in .env, so no history is lost."
    echo "                      Does not touch app/config/inactivity.ts (a user-owned preference file)"
    echo "  --validate-only     Validate current .env and generated config files without modifying them"
    echo "  --force-rotate-keys Force regeneration of all encryption/signing key pairs without prompts"
    echo "  -h, --help          Show this help message"
    exit 0
fi

if [ "$update_env" = "true" ]; then
    echo -e "${YELLOW}⚠️  Update-env mode: overwriting configs and resetting .env values from template${NC}"
fi

if [ "$refresh_templates" = "true" ]; then
    echo -e "${YELLOW}⚠️  Refresh-templates mode: worker wrangler configs, wrangler.toml, firebase.ts, and config.json will be regenerated from templates and reapplied from the existing .env${NC}"
fi

if [ "$force_rotate_keys" = "true" ]; then
    echo -e "${YELLOW}⚠️  Force-rotate-keys mode: all encryption/signing key pairs will be regenerated without prompts${NC}"
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
    local normalized

    normalized=$(printf '%s' "$value" | tr -d '\r' | tr '[:upper:]' '[:lower:]')
    normalized=$(printf '%s' "$normalized" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    normalized=${normalized#\"}
    normalized=${normalized%\"}

    if [ -z "$normalized" ]; then
        return 1
    fi

    [[ "$normalized" =~ ^your_[a-z0-9_]+_here$ || \
       "$normalized" =~ ^your-[a-z0-9-]+-here$ || \
       "$normalized" == "placeholder" || \
       "$normalized" == "changeme" || \
       "$normalized" == "replace_me" || \
       "$normalized" == "replace-me" ]]
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
set -a
source .env
set +a

DEPLOY_CONFIG_MODULES_DIR="$SCRIPT_DIR/deploy-config/modules"
DEPLOY_CONFIG_ENV_UTILS_MODULE="$DEPLOY_CONFIG_MODULES_DIR/env-utils.sh"

if [ ! -f "$DEPLOY_CONFIG_ENV_UTILS_MODULE" ]; then
    echo -e "${RED}❌ Error: Required deploy-config module not found: $DEPLOY_CONFIG_ENV_UTILS_MODULE${NC}"
    exit 1
fi

source "$DEPLOY_CONFIG_ENV_UTILS_MODULE"

DEPLOY_CONFIG_KEYS_MODULE="$DEPLOY_CONFIG_MODULES_DIR/keys.sh"
DEPLOY_CONFIG_VALIDATION_MODULE="$DEPLOY_CONFIG_MODULES_DIR/validation.sh"
DEPLOY_CONFIG_SCAFFOLDING_MODULE="$DEPLOY_CONFIG_MODULES_DIR/scaffolding.sh"
DEPLOY_CONFIG_PROMPT_MODULE="$DEPLOY_CONFIG_MODULES_DIR/prompt.sh"

if [ ! -f "$DEPLOY_CONFIG_KEYS_MODULE" ]; then
    echo -e "${RED}❌ Error: Required deploy-config module not found: $DEPLOY_CONFIG_KEYS_MODULE${NC}"
    exit 1
fi

if [ ! -f "$DEPLOY_CONFIG_VALIDATION_MODULE" ]; then
    echo -e "${RED}❌ Error: Required deploy-config module not found: $DEPLOY_CONFIG_VALIDATION_MODULE${NC}"
    exit 1
fi

if [ ! -f "$DEPLOY_CONFIG_SCAFFOLDING_MODULE" ]; then
    echo -e "${RED}❌ Error: Required deploy-config module not found: $DEPLOY_CONFIG_SCAFFOLDING_MODULE${NC}"
    exit 1
fi

if [ ! -f "$DEPLOY_CONFIG_PROMPT_MODULE" ]; then
    echo -e "${RED}❌ Error: Required deploy-config module not found: $DEPLOY_CONFIG_PROMPT_MODULE${NC}"
    exit 1
fi

source "$DEPLOY_CONFIG_KEYS_MODULE"
source "$DEPLOY_CONFIG_VALIDATION_MODULE"
source "$DEPLOY_CONFIG_SCAFFOLDING_MODULE"
source "$DEPLOY_CONFIG_PROMPT_MODULE"

if [ "$validate_only" = "true" ]; then
    echo -e "\n${BLUE}🧪 Validate-only mode enabled${NC}"
    run_validation_checkpoint
    echo -e "\n${GREEN}🎉 Configuration validation completed successfully!${NC}"
    exit 0
fi

# Backfill any public key history from an existing app/config/config.json into the
# .env registries before copy_example_configs can overwrite that file.
migrate_public_key_registries_from_config_json

# Copy example configuration files
copy_example_configs

# Load required Firebase admin service credentials from app/config/admin-service.json
load_admin_service_credentials

# Always prompt for secrets to ensure configuration
prompt_for_secrets

# Validate after secrets have been configured
validate_required_vars


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