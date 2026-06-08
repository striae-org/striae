#!/bin/bash

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
    is_auto_generated_secret_var() {
        local var_name=$1
        case "$var_name" in
            IMAGE_SIGNED_URL_SECRET|LISTS_ADMIN_SECRET)
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    }

    is_secret_placeholder_value() {
        local var_name=$1
        local value=$2
        case "$var_name" in
            IMAGE_SIGNED_URL_SECRET)
                [ "$value" = "your_image_signed_url_secret_here" ]
                ;;
            LISTS_ADMIN_SECRET)
                [ "$value" = "your_lists_admin_secret_here" ]
                ;;
            *)
                return 1
                ;;
        esac
    }

    generate_secret_value() {
        local var_name=$1
        case "$var_name" in
            IMAGE_SIGNED_URL_SECRET)
                openssl rand -base64 48 2>/dev/null | tr '+/' '-_' | tr -d '='
                ;;
            *)
                openssl rand -hex 32 2>/dev/null
                ;;
        esac
    }

    prompt_for_var() {
        local var_name=$1
        local description=$2
        local current_value="${!var_name}"
        local new_value=""
        local allow_keep="false"

        current_value=$(strip_carriage_returns "$current_value")

        if [ "$var_name" = "PAGES_CUSTOM_DOMAIN" ]; then
            current_value=$(resolve_existing_domain_value "$var_name" "$current_value")
        fi

        # Auto-generate selected secrets - but allow keeping current.
        if is_auto_generated_secret_var "$var_name"; then
            echo -e "${BLUE}$var_name${NC}"
            echo -e "${YELLOW}$description${NC}"

            if [ "$update_env" != "true" ] && [ -n "$current_value" ] && ! is_placeholder "$current_value" && ! is_secret_placeholder_value "$var_name" "$current_value"; then
                # Current value exists and is not a placeholder
                echo -e "${GREEN}Current value: [HIDDEN]${NC}"
                read -p "Generate new secret? (press Enter to keep current, or type 'y' to generate): " gen_choice
                gen_choice=$(strip_carriage_returns "$gen_choice")

                if [ "$gen_choice" = "y" ] || [ "$gen_choice" = "Y" ]; then
                    new_value=$(generate_secret_value "$var_name" || echo "")
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
                new_value=$(generate_secret_value "$var_name" || echo "")
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

                if [[ "$var_name" == *_WORKER_NAME ]]; then
                    new_value=$(normalize_worker_label_value "$new_value")

                    if [ -z "$new_value" ] || ! is_valid_worker_label "$new_value"; then
                        echo -e "${RED}❌ $var_name must use only lowercase letters, numbers, and dashes.${NC}"
                        new_value=""
                        continue
                    fi
                fi

                break
            done
        fi

        if [ -n "$new_value" ]; then
            if [ "$var_name" = "PAGES_CUSTOM_DOMAIN" ]; then
                new_value=$(normalize_domain_value "$new_value")
            fi

            # Update the .env file
            write_env_var "$var_name" "$new_value"

            export "$var_name=$new_value"
            echo -e "${GREEN}✅ $var_name updated${NC}"
        elif [ -n "$current_value" ]; then
            if [[ "$var_name" == *_WORKER_NAME ]]; then
                current_value=$(normalize_worker_label_value "$current_value")
            fi

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

    echo -e "${BLUE} FIREBASE AUTH CONFIGURATION${NC}"
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

    echo -e "${BLUE}🔑 WORKER NAMES${NC}"
    echo "==============="
    echo -e "${YELLOW}Worker names are auto-generated and lowercased. Press Enter to keep the generated value or type a custom name.${NC}"

    # Auto-generate each worker name if not yet set or still a placeholder.
    _gen_worker_name() {
        local var_name=$1
        local current="${!var_name:-}"
        if is_placeholder "$current" || [ -z "$current" ]; then
            local suffix
            suffix=$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-z0-9' | head -c 10 || true)
            if [ -n "$suffix" ]; then
                printf '%s' "striae-dev-${suffix}"
            fi
        fi
    }

    _new=$(  _gen_worker_name "USER_WORKER_NAME")
    [ -n "$_new" ] && { USER_WORKER_NAME="$_new"; export USER_WORKER_NAME; }
    prompt_for_var "USER_WORKER_NAME" "User worker name (auto-generated; change only if using an existing worker)"

    _new=$(_gen_worker_name "DATA_WORKER_NAME")
    [ -n "$_new" ] && { DATA_WORKER_NAME="$_new"; export DATA_WORKER_NAME; }
    prompt_for_var "DATA_WORKER_NAME" "Data worker name (auto-generated; change only if using an existing worker)"

    _new=$(_gen_worker_name "AUDIT_WORKER_NAME")
    [ -n "$_new" ] && { AUDIT_WORKER_NAME="$_new"; export AUDIT_WORKER_NAME; }
    prompt_for_var "AUDIT_WORKER_NAME" "Audit worker name (auto-generated; change only if using an existing worker)"

    _new=$(_gen_worker_name "IMAGES_WORKER_NAME")
    [ -n "$_new" ] && { IMAGES_WORKER_NAME="$_new"; export IMAGES_WORKER_NAME; }
    prompt_for_var "IMAGES_WORKER_NAME" "Images worker name (auto-generated; change only if using an existing worker)"

    _new=$(_gen_worker_name "PDF_WORKER_NAME")
    [ -n "$_new" ] && { PDF_WORKER_NAME="$_new"; export PDF_WORKER_NAME; }
    prompt_for_var "PDF_WORKER_NAME" "PDF worker name (auto-generated; change only if using an existing worker)"

    _new=$(_gen_worker_name "LISTS_WORKER_NAME")
    [ -n "$_new" ] && { LISTS_WORKER_NAME="$_new"; export LISTS_WORKER_NAME; }
    prompt_for_var "LISTS_WORKER_NAME" "Lists worker name (auto-generated; change only if using an existing worker)"
    echo ""

    echo -e "${BLUE}🗄️ STORAGE CONFIGURATION${NC}"
    echo "========================="
    prompt_for_var "DATA_BUCKET_NAME" "Your R2 bucket name for case data storage"
    prompt_for_var "AUDIT_BUCKET_NAME" "Your R2 bucket name for audit logs (separate from data bucket)"
    prompt_for_var "FILES_BUCKET_NAME" "Your R2 bucket name for encrypted files storage"
    prompt_for_var "CONFIG_BUCKET_NAME" "Your R2 bucket name for config/key registries (shared across workers)"
    prompt_for_var "KV_STORE_ID" "Your KV namespace ID (UUID format)"
    prompt_for_var "STRIAE_LISTS_KV_ID" "KV namespace ID for the lists-worker (UUID format; backs registration and primershear allowlists)"

    echo -e "${BLUE}🔐 SERVICE-SPECIFIC SECRETS${NC}"
    echo "============================"
    prompt_for_var "IMAGE_SIGNED_URL_SECRET" "Image signed URL secret (generate with: openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')"

    # Auto-derive IMAGE_SIGNED_URL_BASE_URL from PAGES_CUSTOM_DOMAIN if not yet set or still
    # contains a placeholder-domain pattern (i.e. was expanded from .env.example at source time).
    _current_image_base_url="${IMAGE_SIGNED_URL_BASE_URL:-}"
    if [[ "$_current_image_base_url" =~ your_[a-z0-9_]+_here|your-[a-z0-9-]+-here ]] || [ -z "$_current_image_base_url" ]; then
        if [ -n "${PAGES_CUSTOM_DOMAIN:-}" ] && ! is_placeholder "${PAGES_CUSTOM_DOMAIN:-}"; then
            IMAGE_SIGNED_URL_BASE_URL="https://${PAGES_CUSTOM_DOMAIN}/api/image"
            export IMAGE_SIGNED_URL_BASE_URL
        fi
    fi
    prompt_for_var "IMAGE_SIGNED_URL_BASE_URL" "Signed URL delivery base URL — routes signed image delivery through the Pages proxy (leave as-is unless using a non-standard domain)"

    prompt_for_var "BROWSER_API_TOKEN" "Cloudflare Browser Rendering API token (for PDF Worker)"
    prompt_for_var "LISTS_ADMIN_SECRET" "Lists worker admin secret — guards write endpoints (auto-generated; guards POST/DELETE on the lists-worker)"

    configure_manifest_signing_credentials
    configure_export_encryption_credentials
    configure_user_kv_encryption_credentials
    configure_data_at_rest_encryption_credentials
    configure_registry_encryption_key

    # Reload the updated .env file
    source .env

    echo -e "${GREEN}🎉 Environment variables setup completed!${NC}"
    echo -e "${BLUE}📄 All values saved to .env file${NC}"
}
