#!/bin/bash

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
    restore_env_var_from_backup_if_missing "MANIFEST_SIGNING_PRIVATE_KEY"
    restore_env_var_from_backup_if_missing "MANIFEST_SIGNING_PUBLIC_KEY"
    restore_env_var_from_backup_if_missing "MANIFEST_SIGNING_KEY_ID"
    restore_env_var_from_backup_if_missing "MANIFEST_SIGNING_KEYS_JSON"
    restore_env_var_from_backup_if_missing "MANIFEST_SIGNING_ACTIVE_KEY_ID"

    if [ -z "$MANIFEST_SIGNING_PRIVATE_KEY" ] || is_placeholder "$MANIFEST_SIGNING_PRIVATE_KEY" || [ -z "$MANIFEST_SIGNING_PUBLIC_KEY" ] || is_placeholder "$MANIFEST_SIGNING_PUBLIC_KEY"; then
        should_generate="true"
    else
        if confirm_key_pair_regeneration "manifest signing" "Regenerating this key pair can invalidate verification for signatures tied to the previous key ID."; then
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
        generated_key_id=$(generate_10_char_id)
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

    update_private_key_registry "MANIFEST_SIGNING_KEYS_JSON" "MANIFEST_SIGNING_ACTIVE_KEY_ID" "$MANIFEST_SIGNING_KEY_ID" "$MANIFEST_SIGNING_PRIVATE_KEY" "manifest signing"

    echo ""
}

generate_export_encryption_key_pair() {
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

    EXPORT_ENCRYPTION_PRIVATE_KEY="${private_key_pem//$'\n'/\\n}"
    EXPORT_ENCRYPTION_PUBLIC_KEY="${public_key_pem//$'\n'/\\n}"

    export EXPORT_ENCRYPTION_PRIVATE_KEY
    export EXPORT_ENCRYPTION_PUBLIC_KEY

    write_env_var "EXPORT_ENCRYPTION_PRIVATE_KEY" "$EXPORT_ENCRYPTION_PRIVATE_KEY"
    write_env_var "EXPORT_ENCRYPTION_PUBLIC_KEY" "$EXPORT_ENCRYPTION_PUBLIC_KEY"

    return 0
}

configure_export_encryption_credentials() {
    echo -e "${BLUE}🔐 EXPORT ENCRYPTION CONFIGURATION${NC}"
    echo "================================="

    local should_generate="false"
    restore_env_var_from_backup_if_missing "EXPORT_ENCRYPTION_PRIVATE_KEY"
    restore_env_var_from_backup_if_missing "EXPORT_ENCRYPTION_PUBLIC_KEY"
    restore_env_var_from_backup_if_missing "EXPORT_ENCRYPTION_KEY_ID"
    restore_env_var_from_backup_if_missing "EXPORT_ENCRYPTION_KEYS_JSON"
    restore_env_var_from_backup_if_missing "EXPORT_ENCRYPTION_ACTIVE_KEY_ID"

    if [ -z "$EXPORT_ENCRYPTION_PRIVATE_KEY" ] || is_placeholder "$EXPORT_ENCRYPTION_PRIVATE_KEY" || [ -z "$EXPORT_ENCRYPTION_PUBLIC_KEY" ] || is_placeholder "$EXPORT_ENCRYPTION_PUBLIC_KEY"; then
        should_generate="true"
    else
        if confirm_key_pair_regeneration "export encryption" "Regenerating this key pair can make prior encrypted exports undecryptable without migration."; then
            should_generate="true"
        fi
    fi

    if [ "$should_generate" = "true" ]; then
        echo -e "${YELLOW}Generating export encryption RSA key pair...${NC}"
        if generate_export_encryption_key_pair; then
            echo -e "${GREEN}✅ Export encryption key pair generated${NC}"
        else
            echo -e "${RED}❌ Error: Failed to generate export encryption key pair${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Keeping current export encryption key pair${NC}"
    fi

    if [ -z "$EXPORT_ENCRYPTION_KEY_ID" ] || is_placeholder "$EXPORT_ENCRYPTION_KEY_ID" || [ "$should_generate" = "true" ]; then
        local generated_key_id
        generated_key_id=$(generate_10_char_id)
        if [ -z "$generated_key_id" ] || [ ${#generated_key_id} -ne 10 ]; then
            echo -e "${RED}❌ Error: Failed to generate EXPORT_ENCRYPTION_KEY_ID${NC}"
            exit 1
        fi
        EXPORT_ENCRYPTION_KEY_ID="$generated_key_id"
        export EXPORT_ENCRYPTION_KEY_ID
        write_env_var "EXPORT_ENCRYPTION_KEY_ID" "$EXPORT_ENCRYPTION_KEY_ID"
        echo -e "${GREEN}✅ EXPORT_ENCRYPTION_KEY_ID generated: $EXPORT_ENCRYPTION_KEY_ID${NC}"
    else
        echo -e "${GREEN}✅ EXPORT_ENCRYPTION_KEY_ID: $EXPORT_ENCRYPTION_KEY_ID${NC}"
    fi

    update_private_key_registry "EXPORT_ENCRYPTION_KEYS_JSON" "EXPORT_ENCRYPTION_ACTIVE_KEY_ID" "$EXPORT_ENCRYPTION_KEY_ID" "$EXPORT_ENCRYPTION_PRIVATE_KEY" "export encryption"

    echo ""
}

generate_data_at_rest_encryption_key_pair() {
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

    DATA_AT_REST_ENCRYPTION_PRIVATE_KEY="${private_key_pem//$'\n'/\\n}"
    DATA_AT_REST_ENCRYPTION_PUBLIC_KEY="${public_key_pem//$'\n'/\\n}"

    export DATA_AT_REST_ENCRYPTION_PRIVATE_KEY
    export DATA_AT_REST_ENCRYPTION_PUBLIC_KEY

    write_env_var "DATA_AT_REST_ENCRYPTION_PRIVATE_KEY" "$DATA_AT_REST_ENCRYPTION_PRIVATE_KEY"
    write_env_var "DATA_AT_REST_ENCRYPTION_PUBLIC_KEY" "$DATA_AT_REST_ENCRYPTION_PUBLIC_KEY"

    return 0
}

generate_user_kv_encryption_key_pair() {
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

    USER_KV_ENCRYPTION_PRIVATE_KEY="${private_key_pem//$'\n'/\\n}"
    USER_KV_ENCRYPTION_PUBLIC_KEY="${public_key_pem//$'\n'/\\n}"

    export USER_KV_ENCRYPTION_PRIVATE_KEY
    export USER_KV_ENCRYPTION_PUBLIC_KEY

    write_env_var "USER_KV_ENCRYPTION_PRIVATE_KEY" "$USER_KV_ENCRYPTION_PRIVATE_KEY"
    write_env_var "USER_KV_ENCRYPTION_PUBLIC_KEY" "$USER_KV_ENCRYPTION_PUBLIC_KEY"

    return 0
}

configure_user_kv_encryption_credentials() {
    echo -e "${BLUE}🧑 USER KV ENCRYPTION CONFIGURATION${NC}"
    echo "=================================="

    local should_generate="false"
    restore_env_var_from_backup_if_missing "USER_KV_ENCRYPTION_PRIVATE_KEY"
    restore_env_var_from_backup_if_missing "USER_KV_ENCRYPTION_PUBLIC_KEY"
    restore_env_var_from_backup_if_missing "USER_KV_ENCRYPTION_KEY_ID"
    restore_env_var_from_backup_if_missing "USER_KV_ENCRYPTION_KEYS_JSON"
    restore_env_var_from_backup_if_missing "USER_KV_ENCRYPTION_ACTIVE_KEY_ID"

    if [ -z "$USER_KV_ENCRYPTION_PRIVATE_KEY" ] || is_placeholder "$USER_KV_ENCRYPTION_PRIVATE_KEY" || [ -z "$USER_KV_ENCRYPTION_PUBLIC_KEY" ] || is_placeholder "$USER_KV_ENCRYPTION_PUBLIC_KEY"; then
        should_generate="true"
    else
        if confirm_key_pair_regeneration "user KV encryption" "Regenerating this key pair or key ID without re-encryption migration can make existing user KV records undecryptable."; then
            should_generate="true"
        fi
    fi

    if [ "$should_generate" = "true" ]; then
        echo -e "${YELLOW}Generating user KV encryption RSA key pair...${NC}"
        if generate_user_kv_encryption_key_pair; then
            echo -e "${GREEN}✅ User KV encryption key pair generated${NC}"
        else
            echo -e "${RED}❌ Error: Failed to generate user KV encryption key pair${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Keeping current user KV encryption key pair${NC}"
    fi

    if [ -z "$USER_KV_ENCRYPTION_KEY_ID" ] || is_placeholder "$USER_KV_ENCRYPTION_KEY_ID" || [ "$should_generate" = "true" ]; then
        local generated_key_id
        generated_key_id=$(generate_10_char_id)
        if [ -z "$generated_key_id" ] || [ ${#generated_key_id} -ne 10 ]; then
            echo -e "${RED}❌ Error: Failed to generate USER_KV_ENCRYPTION_KEY_ID${NC}"
            exit 1
        fi
        USER_KV_ENCRYPTION_KEY_ID="$generated_key_id"
        export USER_KV_ENCRYPTION_KEY_ID
        write_env_var "USER_KV_ENCRYPTION_KEY_ID" "$USER_KV_ENCRYPTION_KEY_ID"
        echo -e "${GREEN}✅ USER_KV_ENCRYPTION_KEY_ID generated: $USER_KV_ENCRYPTION_KEY_ID${NC}"
    else
        echo -e "${GREEN}✅ USER_KV_ENCRYPTION_KEY_ID: $USER_KV_ENCRYPTION_KEY_ID${NC}"
    fi

    update_private_key_registry "USER_KV_ENCRYPTION_KEYS_JSON" "USER_KV_ENCRYPTION_ACTIVE_KEY_ID" "$USER_KV_ENCRYPTION_KEY_ID" "$USER_KV_ENCRYPTION_PRIVATE_KEY" "user KV encryption"

    echo ""
}

configure_data_at_rest_encryption_credentials() {
    echo -e "${BLUE}🗃️ DATA-AT-REST ENCRYPTION CONFIGURATION${NC}"
    echo "========================================"

    # Data-at-rest encryption is mandatory for all environments.
    DATA_AT_REST_ENCRYPTION_ENABLED="true"

    export DATA_AT_REST_ENCRYPTION_ENABLED
    write_env_var "DATA_AT_REST_ENCRYPTION_ENABLED" "$DATA_AT_REST_ENCRYPTION_ENABLED"
    echo -e "${GREEN}✅ DATA_AT_REST_ENCRYPTION_ENABLED: $DATA_AT_REST_ENCRYPTION_ENABLED${NC}"

    local should_generate="false"
    restore_env_var_from_backup_if_missing "DATA_AT_REST_ENCRYPTION_PRIVATE_KEY"
    restore_env_var_from_backup_if_missing "DATA_AT_REST_ENCRYPTION_PUBLIC_KEY"
    restore_env_var_from_backup_if_missing "DATA_AT_REST_ENCRYPTION_KEY_ID"
    restore_env_var_from_backup_if_missing "DATA_AT_REST_ENCRYPTION_KEYS_JSON"
    restore_env_var_from_backup_if_missing "DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID"

    if [ -z "$DATA_AT_REST_ENCRYPTION_PRIVATE_KEY" ] || is_placeholder "$DATA_AT_REST_ENCRYPTION_PRIVATE_KEY" || [ -z "$DATA_AT_REST_ENCRYPTION_PUBLIC_KEY" ] || is_placeholder "$DATA_AT_REST_ENCRYPTION_PUBLIC_KEY"; then
        should_generate="true"
    else
        if confirm_key_pair_regeneration "data-at-rest encryption" "Regenerating this key pair can make previously encrypted data unreadable without migration."; then
            should_generate="true"
        fi
    fi

    if [ "$should_generate" = "true" ]; then
        echo -e "${YELLOW}Generating data-at-rest encryption RSA key pair...${NC}"
        if generate_data_at_rest_encryption_key_pair; then
            echo -e "${GREEN}✅ Data-at-rest encryption key pair generated${NC}"
        else
            echo -e "${RED}❌ Error: Failed to generate data-at-rest encryption key pair${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Keeping current data-at-rest encryption key pair${NC}"
    fi

    if [ -z "$DATA_AT_REST_ENCRYPTION_KEY_ID" ] || is_placeholder "$DATA_AT_REST_ENCRYPTION_KEY_ID" || [ "$should_generate" = "true" ]; then
        local generated_key_id
        generated_key_id=$(generate_10_char_id)
        if [ -z "$generated_key_id" ] || [ ${#generated_key_id} -ne 10 ]; then
            echo -e "${RED}❌ Error: Failed to generate DATA_AT_REST_ENCRYPTION_KEY_ID${NC}"
            exit 1
        fi
        DATA_AT_REST_ENCRYPTION_KEY_ID="$generated_key_id"
        export DATA_AT_REST_ENCRYPTION_KEY_ID
        write_env_var "DATA_AT_REST_ENCRYPTION_KEY_ID" "$DATA_AT_REST_ENCRYPTION_KEY_ID"
        echo -e "${GREEN}✅ DATA_AT_REST_ENCRYPTION_KEY_ID generated: $DATA_AT_REST_ENCRYPTION_KEY_ID${NC}"
    else
        echo -e "${GREEN}✅ DATA_AT_REST_ENCRYPTION_KEY_ID: $DATA_AT_REST_ENCRYPTION_KEY_ID${NC}"
    fi

    update_private_key_registry "DATA_AT_REST_ENCRYPTION_KEYS_JSON" "DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID" "$DATA_AT_REST_ENCRYPTION_KEY_ID" "$DATA_AT_REST_ENCRYPTION_PRIVATE_KEY" "data-at-rest encryption"

    echo ""
}

configure_registry_encryption_key() {
    echo -e "${BLUE}🔒 REGISTRY ENCRYPTION KEY CONFIGURATION${NC}"
    echo "========================================="

    restore_env_var_from_backup_if_missing "REGISTRY_ENCRYPTION_KEY"

    if [ -n "$REGISTRY_ENCRYPTION_KEY" ] && ! is_placeholder "$REGISTRY_ENCRYPTION_KEY"; then
        echo -e "${GREEN}✅ REGISTRY_ENCRYPTION_KEY already configured${NC}"
    else
        echo -e "${YELLOW}Generating REGISTRY_ENCRYPTION_KEY (32 random bytes, base64url)...${NC}"
        local key_value
        key_value=$(node -e "const { randomBytes } = require('crypto'); const buf = randomBytes(32); process.stdout.write(buf.toString('base64url'));")
        if [ -z "$key_value" ] || [ ${#key_value} -lt 20 ]; then
            echo -e "${RED}❌ Error: Failed to generate REGISTRY_ENCRYPTION_KEY${NC}"
            exit 1
        fi
        REGISTRY_ENCRYPTION_KEY="$key_value"
        export REGISTRY_ENCRYPTION_KEY
        write_env_var "REGISTRY_ENCRYPTION_KEY" "$REGISTRY_ENCRYPTION_KEY"
        echo -e "${GREEN}✅ REGISTRY_ENCRYPTION_KEY generated${NC}"
    fi

    echo ""
}
