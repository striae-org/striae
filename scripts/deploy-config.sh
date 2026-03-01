#!/bin/bash

# ===================================
# STRIAE CONFIGURATION SETUP SCRIPT
# ===================================
# This script sets up all configuration files and replaces placeholders
# Run this BEFORE installing worker dependencies to avoid wrangler validation errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}⚙️  Striae Configuration Setup Script${NC}"
echo "====================================="

update_env=false
show_help=false
for arg in "$@"; do
    case "$arg" in
        -h|--help)
            show_help=true
            ;;
        --update-env)
            update_env=true
            ;;
    esac
done

if [ "$show_help" = "true" ]; then
    echo "Usage: bash ./scripts/deploy-config.sh [--update-env]"
    echo ""
    echo "Options:"
    echo "  --update-env   Reset .env from .env.example and overwrite configs"
    echo "  -h, --help     Show this help message"
    exit 0
fi

if [ "$update_env" = "true" ]; then
    echo -e "${YELLOW}⚠️  Update-env mode: overwriting configs and regenerating .env values${NC}"
fi

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
if [ "$update_env" = "true" ]; then
    if [ -f ".env" ]; then
        cp .env .env.backup
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

# Validate required variables
required_vars=(
    # Core Cloudflare Configuration
    "ACCOUNT_ID"
    
    # Shared Authentication & Storage
    "SL_API_KEY"
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
    
    # Pages Configuration
    "PAGES_PROJECT_NAME"
    "PAGES_CUSTOM_DOMAIN"
    
    # Worker Names (required for config replacement)
    "KEYS_WORKER_NAME"
    "USER_WORKER_NAME"
    "DATA_WORKER_NAME"
    "AUDIT_WORKER_NAME"
    "IMAGES_WORKER_NAME"
    "TURNSTILE_WORKER_NAME" 
    "PDF_WORKER_NAME"
    
    # Worker Domains (required for config replacement)
    "KEYS_WORKER_DOMAIN"
    "USER_WORKER_DOMAIN"
    "DATA_WORKER_DOMAIN"
    "AUDIT_WORKER_DOMAIN"
    "IMAGES_WORKER_DOMAIN"
    "TURNSTILE_WORKER_DOMAIN"
    "PDF_WORKER_DOMAIN"
    
    # Storage Configuration (required for config replacement)
    "DATA_BUCKET_NAME"
    "AUDIT_BUCKET_NAME"
    "KV_STORE_ID"
    
    # Worker-Specific Secrets (required for deployment)
    "KEYS_AUTH"
    "ACCOUNT_HASH"
    "API_TOKEN"
    "HMAC_KEY"
    "CFT_PUBLIC_KEY"
    "CFT_SECRET_KEY"
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

# Function to copy example configuration files
copy_example_configs() {
    echo -e "\n${BLUE}📋 Copying example configuration files...${NC}"
    
    # Copy app configuration files
    echo -e "${YELLOW}  Copying app configuration files...${NC}"
    
    # Copy app config-example directory to config
    if [ -d "app/config-example" ]; then
        if [ "$update_env" = "true" ] || [ ! -d "app/config" ]; then
            rm -rf app/config
            cp -r app/config-example app/config
            echo -e "${GREEN}    ✅ app: config directory created from config-example${NC}"
        else
            echo -e "${YELLOW}    ⚠️  app: config directory already exists, skipping copy${NC}"
        fi
    fi
    
    # Copy turnstile keys.json.example to keys.json
    if [ -f "app/components/turnstile/keys.json.example" ]; then
        if [ "$update_env" = "true" ] || [ ! -f "app/components/turnstile/keys.json" ]; then
            cp app/components/turnstile/keys.json.example app/components/turnstile/keys.json
            echo -e "${GREEN}    ✅ turnstile: keys.json created from example${NC}"
        elif [ -f "app/components/turnstile/keys.json" ]; then
            echo -e "${YELLOW}    ⚠️  turnstile: keys.json already exists, skipping copy${NC}"
        fi
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

    cd ../turnstile-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ turnstile-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  turnstile-worker: wrangler.jsonc already exists, skipping copy${NC}"
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

    if [ -f "workers/turnstile-worker/src/turnstile.example.ts" ] && { [ "$update_env" = "true" ] || [ ! -f "workers/turnstile-worker/src/turnstile.ts" ]; }; then
        cp workers/turnstile-worker/src/turnstile.example.ts workers/turnstile-worker/src/turnstile.ts
        echo -e "${GREEN}    ✅ turnstile-worker: turnstile.ts created from example${NC}"
    elif [ -f "workers/turnstile-worker/src/turnstile.ts" ]; then
        echo -e "${YELLOW}    ⚠️  turnstile-worker: turnstile.ts already exists, skipping copy${NC}"
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
        
        # Auto-generate specific authentication secrets - but allow keeping current
        if [ "$var_name" = "USER_DB_AUTH" ] || [ "$var_name" = "R2_KEY_SECRET" ] || [ "$var_name" = "KEYS_AUTH" ]; then
            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"
            
            if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value" && [ "$current_value" != "your_custom_user_db_auth_token_here" ] && [ "$current_value" != "your_custom_r2_secret_here" ] && [ "$current_value" != "your_custom_keys_auth_token_here" ]; then
                # Current value exists and is not a placeholder
                echo -e "${GREEN}Current value: [HIDDEN]${NC}"
                read -p "Generate new secret? (press Enter to keep current, or type 'y' to generate): " gen_choice
                
                if [ "$gen_choice" = "y" ] || [ "$gen_choice" = "Y" ]; then
                    new_value=$(openssl rand -hex 32 2>/dev/null || echo "")
                    if [ -n "$new_value" ]; then
                        echo -e "${GREEN}✅ $var_name auto-generated${NC}"
                    else
                        while true; do
                            echo -e "${RED}❌ Failed to auto-generate, please enter manually:${NC}"
                            read -p "Enter value: " new_value
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
        else
            # Normal prompt for other variables
            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"
            if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
                allow_keep="true"
                echo -e "${GREEN}Current value: $current_value${NC}"
            fi

            while true; do
                if [ "$allow_keep" = "true" ]; then
                    read -p "New value (or press Enter to keep current): " new_value
                    if [ -z "$new_value" ]; then
                        break
                    fi
                else
                    read -p "Enter value: " new_value
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
            # Update the .env file
            if grep -q "^$var_name=" .env; then
                sed -i "s|^$var_name=.*|$var_name=$new_value|" .env
            else
                echo "$var_name=$new_value" >> .env
            fi
            export "$var_name=$new_value"
            echo -e "${GREEN}✅ $var_name updated${NC}"
        elif [ -n "$current_value" ]; then
            echo -e "${GREEN}✅ Keeping current value for $var_name${NC}"
        fi
        echo ""
    }
    
    echo -e "${BLUE}📊 CLOUDFLARE CORE CONFIGURATION${NC}"
    echo "=================================="
    prompt_for_var "ACCOUNT_ID" "Your Cloudflare Account ID"
    
    echo -e "${BLUE}🔐 SHARED AUTHENTICATION & STORAGE${NC}"
    echo "==================================="
    prompt_for_var "SL_API_KEY" "SendLayer API key for email services"
    prompt_for_var "USER_DB_AUTH" "Custom user database authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "R2_KEY_SECRET" "Custom R2 storage authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "IMAGES_API_TOKEN" "Cloudflare Images API token (shared between workers)"
    
    echo -e "${BLUE}🔥 FIREBASE AUTH CONFIGURATION${NC}"
    echo "==============================="
    prompt_for_var "API_KEY" "Firebase API key"
    prompt_for_var "AUTH_DOMAIN" "Firebase auth domain (project-id.firebaseapp.com)"
    prompt_for_var "PROJECT_ID" "Firebase project ID"
    prompt_for_var "STORAGE_BUCKET" "Firebase storage bucket"
    prompt_for_var "MESSAGING_SENDER_ID" "Firebase messaging sender ID"
    prompt_for_var "APP_ID" "Firebase app ID"
    prompt_for_var "MEASUREMENT_ID" "Firebase measurement ID (optional)"
    
    echo -e "${BLUE}📄 PAGES CONFIGURATION${NC}"
    echo "======================"
    prompt_for_var "PAGES_PROJECT_NAME" "Your Cloudflare Pages project name"
    prompt_for_var "PAGES_CUSTOM_DOMAIN" "Your custom domain (e.g., striae.org) - DO NOT include https://"
    
    echo -e "${BLUE}🔑 WORKER NAMES & DOMAINS${NC}"
    echo "========================="
    prompt_for_var "KEYS_WORKER_NAME" "Keys worker name"
    prompt_for_var "KEYS_WORKER_DOMAIN" "Keys worker domain (e.g., keys.striae.org) - DO NOT include https://"
    prompt_for_var "USER_WORKER_NAME" "User worker name"
    prompt_for_var "USER_WORKER_DOMAIN" "User worker domain (e.g., users.striae.org) - DO NOT include https://"
    prompt_for_var "DATA_WORKER_NAME" "Data worker name"
    prompt_for_var "DATA_WORKER_DOMAIN" "Data worker domain (e.g., data.striae.org) - DO NOT include https://"
    prompt_for_var "AUDIT_WORKER_NAME" "Audit worker name"
    prompt_for_var "AUDIT_WORKER_DOMAIN" "Audit worker domain (e.g., audit.striae.org) - DO NOT include https://"
    prompt_for_var "IMAGES_WORKER_NAME" "Images worker name"
    prompt_for_var "IMAGES_WORKER_DOMAIN" "Images worker domain (e.g., images.striae.org) - DO NOT include https://"
    prompt_for_var "TURNSTILE_WORKER_NAME" "Turnstile worker name"
    prompt_for_var "TURNSTILE_WORKER_DOMAIN" "Turnstile worker domain (e.g., turnstile.striae.org) - DO NOT include https://"
    prompt_for_var "PDF_WORKER_NAME" "PDF worker name"
    prompt_for_var "PDF_WORKER_DOMAIN" "PDF worker domain (e.g., pdf.striae.org) - DO NOT include https://"
    
    echo -e "${BLUE}🗄️ STORAGE CONFIGURATION${NC}"
    echo "========================="
    prompt_for_var "DATA_BUCKET_NAME" "Your R2 bucket name for case data storage"
    prompt_for_var "AUDIT_BUCKET_NAME" "Your R2 bucket name for audit logs (separate from data bucket)"
    prompt_for_var "KV_STORE_ID" "Your KV namespace ID (UUID format)"
    
    echo -e "${BLUE}🔐 SERVICE-SPECIFIC SECRETS${NC}"
    echo "============================"
    prompt_for_var "KEYS_AUTH" "Keys worker authentication token (generate with: openssl rand -hex 16)"
    prompt_for_var "ACCOUNT_HASH" "Cloudflare Images Account Hash"
    prompt_for_var "API_TOKEN" "Cloudflare Images API token (for Images Worker)"
    prompt_for_var "HMAC_KEY" "Cloudflare Images HMAC signing key"
    prompt_for_var "CFT_PUBLIC_KEY" "Cloudflare Turnstile public key"
    prompt_for_var "CFT_SECRET_KEY" "Cloudflare Turnstile secret key"
    
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/audit-worker/src/audit-worker.ts
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/data-worker/src/data-worker.ts
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/image-worker/src/image-worker.ts
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/keys-worker/src/keys.ts
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/pdf-worker/src/pdf-worker.ts
        echo -e "${GREEN}    ✅ pdf-worker source placeholders updated${NC}"
    fi
    
    # Turnstile Worker
    if [ -f "workers/turnstile-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating turnstile-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"TURNSTILE_WORKER_NAME\"/\"$TURNSTILE_WORKER_NAME\"/g" workers/turnstile-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$ACCOUNT_ID\"/g" workers/turnstile-worker/wrangler.jsonc
        sed -i "s/\"TURNSTILE_WORKER_DOMAIN\"/\"$TURNSTILE_WORKER_DOMAIN\"/g" workers/turnstile-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ turnstile-worker configuration updated${NC}"
    fi
    
    # Update turnstile-worker source file domain placeholders
    if [ -f "workers/turnstile-worker/src/turnstile.ts" ]; then
        echo -e "${YELLOW}  Updating turnstile-worker source placeholders...${NC}"
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/turnstile-worker/src/turnstile.ts
        echo -e "${GREEN}    ✅ turnstile-worker source placeholders updated${NC}"
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
        sed -i "s|'PAGES_CUSTOM_DOMAIN'|'https://$PAGES_CUSTOM_DOMAIN'|g" workers/user-worker/src/user-worker.ts
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
        sed -i "s|\"PAGES_CUSTOM_DOMAIN\"|\"https://$PAGES_CUSTOM_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"DATA_WORKER_CUSTOM_DOMAIN\"|\"https://$DATA_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"AUDIT_WORKER_CUSTOM_DOMAIN\"|\"https://$AUDIT_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"KEYS_WORKER_CUSTOM_DOMAIN\"|\"https://$KEYS_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"IMAGE_WORKER_CUSTOM_DOMAIN\"|\"https://$IMAGES_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"USER_WORKER_CUSTOM_DOMAIN\"|\"https://$USER_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"PDF_WORKER_CUSTOM_DOMAIN\"|\"https://$PDF_WORKER_DOMAIN\"|g" app/config/config.json
        sed -i "s|\"YOUR_KEYS_AUTH_TOKEN\"|\"$KEYS_AUTH\"|g" app/config/config.json
        echo -e "${GREEN}      ✅ app config.json updated${NC}"
    fi
    
    # Update app/config/meta-config.json
    if [ -f "app/config/meta-config.json" ]; then
        echo -e "${YELLOW}    Updating app/config/meta-config.json...${NC}"
        sed -i "s|\"PAGES_CUSTOM_DOMAIN\"|\"https://$PAGES_CUSTOM_DOMAIN\"|g" app/config/meta-config.json
        echo -e "${GREEN}      ✅ app meta-config.json updated${NC}"
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
    
    # Update app/components/turnstile/keys.json
    if [ -f "app/components/turnstile/keys.json" ]; then
        echo -e "${YELLOW}    Updating app/components/turnstile/keys.json...${NC}"
        sed -i -E "s|\"CFT_PUBLIC_KEY\"[[:space:]]*:[[:space:]]*\"[^\"]*\"|\"CFT_PUBLIC_KEY\": \"$CFT_PUBLIC_KEY\"|g" app/components/turnstile/keys.json
        sed -i -E "s|\"worker_url\"[[:space:]]*:[[:space:]]*\"[^\"]*\"|\"worker_url\": \"https://$TURNSTILE_WORKER_DOMAIN\"|g" app/components/turnstile/keys.json
        echo -e "${GREEN}      ✅ turnstile keys.json updated${NC}"
    fi
    
    echo -e "${GREEN}✅ All configuration files updated${NC}"
}

# Update wrangler configurations
update_wrangler_configs

echo -e "\n${GREEN}🎉 Configuration setup completed!${NC}"
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Install worker dependencies"
echo "   2. Deploy workers"
echo "   3. Deploy worker secrets"
echo "   4. Deploy pages"
echo "   5. Deploy pages secrets"
echo -e "\n${GREEN}✨ Ready for deployment!${NC}"