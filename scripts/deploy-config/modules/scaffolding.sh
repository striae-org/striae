#!/bin/bash

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

    cd workers/user-worker
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

    cd ../lists-worker
    if [ -f "wrangler.jsonc.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.jsonc" ]; }; then
        cp wrangler.jsonc.example wrangler.jsonc
        echo -e "${GREEN}    ✅ lists-worker: wrangler.jsonc created from example${NC}"
    elif [ -f "wrangler.jsonc" ]; then
        echo -e "${YELLOW}    ⚠️  lists-worker: wrangler.jsonc already exists, skipping copy${NC}"
    fi

    # Return to project root
    cd ../..

    # Copy main wrangler.toml from example
    if [ -f "wrangler.toml.example" ] && { [ "$update_env" = "true" ] || [ ! -f "wrangler.toml" ]; }; then
        cp wrangler.toml.example wrangler.toml
        echo -e "${GREEN}    ✅ root: wrangler.toml created from example${NC}"
    elif [ -f "wrangler.toml" ]; then
        echo -e "${YELLOW}    ⚠️  root: wrangler.toml already exists, skipping copy${NC}"
    fi

    echo -e "${GREEN}✅ Configuration file copying completed${NC}"
}

update_wrangler_configs() {
    echo -e "\n${BLUE}🔧 Updating wrangler configuration files...${NC}"

    local normalized_account_id
    local escaped_account_id
    local normalized_pages_custom_domain
    local escaped_pages_custom_domain

    normalized_account_id=$(printf '%s' "$ACCOUNT_ID" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    ACCOUNT_ID="$normalized_account_id"
    export ACCOUNT_ID
    write_env_var "ACCOUNT_ID" "$ACCOUNT_ID"
    escaped_account_id=$(escape_for_sed_replacement "$ACCOUNT_ID")

    normalized_pages_custom_domain=$(normalize_domain_value "$PAGES_CUSTOM_DOMAIN")
    PAGES_CUSTOM_DOMAIN="$normalized_pages_custom_domain"
    export PAGES_CUSTOM_DOMAIN
    write_env_var "PAGES_CUSTOM_DOMAIN" "$PAGES_CUSTOM_DOMAIN"
    escaped_pages_custom_domain=$(escape_for_sed_replacement "$PAGES_CUSTOM_DOMAIN")

    # Audit Worker
    if [ -f "workers/audit-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating audit-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"AUDIT_WORKER_NAME\"/\"$AUDIT_WORKER_NAME\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"AUDIT_BUCKET_NAME\"/\"$AUDIT_BUCKET_NAME\"/g" workers/audit-worker/wrangler.jsonc
        sed -i "s/\"CONFIG_BUCKET_NAME\"/\"$CONFIG_BUCKET_NAME\"/g" workers/audit-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ audit-worker configuration updated${NC}"
    fi

    if [ -f "workers/data-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating data-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"DATA_WORKER_NAME\"/\"$DATA_WORKER_NAME\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"DATA_BUCKET_NAME\"/\"$DATA_BUCKET_NAME\"/g" workers/data-worker/wrangler.jsonc
        sed -i "s/\"CONFIG_BUCKET_NAME\"/\"$CONFIG_BUCKET_NAME\"/g" workers/data-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ data-worker configuration updated${NC}"
    fi

    if [ -f "workers/image-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating image-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"IMAGES_WORKER_NAME\"/\"$IMAGES_WORKER_NAME\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"FILES_BUCKET_NAME\"/\"$FILES_BUCKET_NAME\"/g" workers/image-worker/wrangler.jsonc
        sed -i "s/\"CONFIG_BUCKET_NAME\"/\"$CONFIG_BUCKET_NAME\"/g" workers/image-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ image-worker configuration updated${NC}"
    fi

    if [ -f "workers/pdf-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating pdf-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"PDF_WORKER_NAME\"/\"$PDF_WORKER_NAME\"/g" workers/pdf-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/pdf-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ pdf-worker configuration updated${NC}"
    fi

    if [ -f "workers/lists-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating lists-worker/wrangler.jsonc...${NC}"
        local escaped_striae_lists_kv_id
        escaped_striae_lists_kv_id=$(escape_for_sed_replacement "$STRIAE_LISTS_KV_ID")
        sed -i "s/\"LISTS_WORKER_NAME\"/\"$LISTS_WORKER_NAME\"/g" workers/lists-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/lists-worker/wrangler.jsonc
        sed -i "s/\"STRIAE_LISTS_KV_ID\"/\"$escaped_striae_lists_kv_id\"/g" workers/lists-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ lists-worker configuration updated${NC}"
    fi

    if [ -f "workers/user-worker/wrangler.jsonc" ]; then
        echo -e "${YELLOW}  Updating user-worker/wrangler.jsonc...${NC}"
        sed -i "s/\"USER_WORKER_NAME\"/\"$USER_WORKER_NAME\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"ACCOUNT_ID\"/\"$escaped_account_id\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"KV_STORE_ID\"/\"$KV_STORE_ID\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"DATA_BUCKET_NAME\"/\"$DATA_BUCKET_NAME\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"FILES_BUCKET_NAME\"/\"$FILES_BUCKET_NAME\"/g" workers/user-worker/wrangler.jsonc
        sed -i "s/\"CONFIG_BUCKET_NAME\"/\"$CONFIG_BUCKET_NAME\"/g" workers/user-worker/wrangler.jsonc
        echo -e "${GREEN}    ✅ user-worker configuration updated${NC}"
    fi

    if [ -f "wrangler.toml" ]; then
        echo -e "${YELLOW}  Updating wrangler.toml...${NC}"
        sed -i "s/\"PAGES_PROJECT_NAME\"/\"$PAGES_PROJECT_NAME\"/g" wrangler.toml
        sed -i "s/USER_WORKER_NAME/$USER_WORKER_NAME/g" wrangler.toml
        sed -i "s/DATA_WORKER_NAME/$DATA_WORKER_NAME/g" wrangler.toml
        sed -i "s/AUDIT_WORKER_NAME/$AUDIT_WORKER_NAME/g" wrangler.toml
        sed -i "s/IMAGES_WORKER_NAME/$IMAGES_WORKER_NAME/g" wrangler.toml
        sed -i "s/PDF_WORKER_NAME/$PDF_WORKER_NAME/g" wrangler.toml
        sed -i "s/LISTS_WORKER_NAME/$LISTS_WORKER_NAME/g" wrangler.toml
        echo -e "${GREEN}    ✅ main wrangler.toml configuration updated${NC}"
    fi

    echo -e "${YELLOW}  Updating app configuration files...${NC}"

    if [ -f "app/config/config.json" ]; then
        echo -e "${YELLOW}    Updating app/config/config.json...${NC}"
        local escaped_manifest_signing_key_id
        local escaped_manifest_signing_public_key
        local escaped_export_encryption_key_id
        local escaped_export_encryption_public_key
        escaped_manifest_signing_key_id=$(escape_for_sed_replacement "$MANIFEST_SIGNING_KEY_ID")
        escaped_manifest_signing_public_key=$(escape_for_sed_replacement "$MANIFEST_SIGNING_PUBLIC_KEY")
        escaped_export_encryption_key_id=$(escape_for_sed_replacement "$EXPORT_ENCRYPTION_KEY_ID")
        escaped_export_encryption_public_key=$(escape_for_sed_replacement "$EXPORT_ENCRYPTION_PUBLIC_KEY")

        sed -i "s|\"url\": \"[^\"]*\"|\"url\": \"https://$escaped_pages_custom_domain\"|g" app/config/config.json
        sed -i "s|\"MANIFEST_SIGNING_KEY_ID\"|\"$escaped_manifest_signing_key_id\"|g" app/config/config.json
        sed -i "s|\"MANIFEST_SIGNING_PUBLIC_KEY\"|\"$escaped_manifest_signing_public_key\"|g" app/config/config.json
        sed -i "s|\"EXPORT_ENCRYPTION_KEY_ID\"|\"$escaped_export_encryption_key_id\"|g" app/config/config.json
        sed -i "s|\"EXPORT_ENCRYPTION_PUBLIC_KEY\"|\"$escaped_export_encryption_public_key\"|g" app/config/config.json
        echo -e "${GREEN}      ✅ app config.json updated${NC}"
    fi

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
