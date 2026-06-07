#!/bin/bash

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

normalize_worker_label_value() {
    local label="$1"

    label=$(normalize_domain_value "$label")
    label="${label#.}"
    label="${label%.}"
    label=$(printf '%s' "$label" | tr '[:upper:]' '[:lower:]')

    printf '%s' "$label"
}

is_valid_worker_label() {
    local label="$1"

    [[ "$label" =~ ^[a-z0-9-]+$ ]]
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

resolve_existing_domain_value() {
    local var_name=$1
    local current_value=$2
    local preserved_value=""

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

    printf '%s' "$current_value"
}

restore_env_var_from_backup_if_missing() {
    local var_name=$1
    local current_value="${!var_name}"
    local preserved_value=""

    if [ "$update_env" != "true" ]; then
        return 0
    fi

    if [ -z "$preserved_domain_env_file" ] || [ ! -f "$preserved_domain_env_file" ]; then
        return 0
    fi

    current_value=$(strip_carriage_returns "$current_value")

    if [ -n "$current_value" ] && ! is_placeholder "$current_value"; then
        return 0
    fi

    preserved_value=$(read_env_var_from_file "$preserved_domain_env_file" "$var_name")
    preserved_value=$(strip_carriage_returns "$preserved_value")

    if [ -z "$preserved_value" ] || is_placeholder "$preserved_value"; then
        return 0
    fi

    printf -v "$var_name" '%s' "$preserved_value"
    export "$var_name"
    write_env_var "$var_name" "$preserved_value"
}

confirm_key_pair_regeneration() {
    local key_pair_label=$1
    local impact_warning=$2
    local regenerate_choice=""

    if [ "$force_rotate_keys" = "true" ]; then
        echo -e "${YELLOW}⚠️  Auto-confirmed regeneration for $key_pair_label key pair (--force-rotate-keys).${NC}"
        return 0
    fi

    echo -e "${GREEN}Current $key_pair_label key pair: [HIDDEN]${NC}"

    if [ -n "$impact_warning" ]; then
        echo -e "${YELLOW}⚠️  $impact_warning${NC}"
    fi

    read -p "Regenerate $key_pair_label key pair? (press Enter to keep current, or type 'y' to regenerate): " regenerate_choice
    regenerate_choice=$(strip_carriage_returns "$regenerate_choice")

    if [ "$regenerate_choice" = "y" ] || [ "$regenerate_choice" = "Y" ]; then
        return 0
    fi

    return 1
}

write_env_var() {
    local var_name=$1
    local var_value=$2
    local env_file_value="$var_value"

    var_value=$(strip_carriage_returns "$var_value")
    env_file_value="$var_value"

    if [ "$var_name" = "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY" ] || [ "$var_name" = "MANIFEST_SIGNING_PRIVATE_KEY" ] || [ "$var_name" = "MANIFEST_SIGNING_PUBLIC_KEY" ] || [ "$var_name" = "EXPORT_ENCRYPTION_PRIVATE_KEY" ] || [ "$var_name" = "EXPORT_ENCRYPTION_PUBLIC_KEY" ] || [ "$var_name" = "DATA_AT_REST_ENCRYPTION_PRIVATE_KEY" ] || [ "$var_name" = "DATA_AT_REST_ENCRYPTION_PUBLIC_KEY" ] || [ "$var_name" = "USER_KV_ENCRYPTION_PRIVATE_KEY" ] || [ "$var_name" = "USER_KV_ENCRYPTION_PUBLIC_KEY" ] || [ "$var_name" = "MANIFEST_SIGNING_KEYS_JSON" ] || [ "$var_name" = "EXPORT_ENCRYPTION_KEYS_JSON" ] || [ "$var_name" = "DATA_AT_REST_ENCRYPTION_KEYS_JSON" ] || [ "$var_name" = "USER_KV_ENCRYPTION_KEYS_JSON" ]; then
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

update_private_key_registry() {
    local registry_var_name=$1
    local active_key_var_name=$2
    local current_key_id=$3
    local private_key_value=$4
    local registry_label=$5
    local existing_registry_json=""
    local updated_registry_json=""
    local registry_entry_count=""

    if [ -z "$registry_var_name" ] || [ -z "$active_key_var_name" ] || [ -z "$current_key_id" ] || [ -z "$private_key_value" ]; then
        echo -e "${YELLOW}⚠️  Skipping $registry_label key registry update due to missing inputs${NC}"
        return 0
    fi

    existing_registry_json="${!registry_var_name}"
    existing_registry_json=$(strip_carriage_returns "$existing_registry_json")

    if [ -z "$existing_registry_json" ] || is_placeholder "$existing_registry_json"; then
        existing_registry_json="{}"
    fi

    updated_registry_json=$(node -e "const raw = process.argv[1] || '{}'; const keyId = process.argv[2] || ''; const privateKey = process.argv[3] || ''; if (!keyId || !privateKey) process.exit(1); const normalized = { activeKeyId: null, keys: {} }; try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) { if (parsed.keys && typeof parsed.keys === 'object' && !Array.isArray(parsed.keys)) { normalized.keys = Object.fromEntries(Object.entries(parsed.keys).filter(([id, pem]) => typeof id === 'string' && id.trim().length > 0 && typeof pem === 'string' && pem.trim().length > 0)); if (typeof parsed.activeKeyId === 'string' && parsed.activeKeyId.trim().length > 0) normalized.activeKeyId = parsed.activeKeyId.trim(); } else { normalized.keys = Object.fromEntries(Object.entries(parsed).filter(([id, pem]) => id !== 'activeKeyId' && id !== 'keys' && typeof id === 'string' && id.trim().length > 0 && typeof pem === 'string' && pem.trim().length > 0)); if (typeof parsed.activeKeyId === 'string' && parsed.activeKeyId.trim().length > 0) normalized.activeKeyId = parsed.activeKeyId.trim(); } } } catch (_) {} normalized.keys[keyId] = privateKey; normalized.activeKeyId = keyId; process.stdout.write(JSON.stringify(normalized));" "$existing_registry_json" "$current_key_id" "$private_key_value" 2>/dev/null || true)

    if [ -z "$updated_registry_json" ]; then
        echo -e "${RED}❌ Error: Failed to update $registry_label key registry JSON${NC}"
        exit 1
    fi

    printf -v "$registry_var_name" '%s' "$updated_registry_json"
    export "$registry_var_name"
    write_env_var "$registry_var_name" "$updated_registry_json"

    printf -v "$active_key_var_name" '%s' "$current_key_id"
    export "$active_key_var_name"
    write_env_var "$active_key_var_name" "$current_key_id"

    registry_entry_count=$(node -e "const raw = process.argv[1] || '{}'; try { const parsed = JSON.parse(raw); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { process.stdout.write('0'); process.exit(0); } const keys = parsed.keys && typeof parsed.keys === 'object' && !Array.isArray(parsed.keys) ? parsed.keys : parsed; const count = Object.entries(keys).filter(([id, pem]) => id !== 'activeKeyId' && id !== 'keys' && typeof id === 'string' && id.trim().length > 0 && typeof pem === 'string' && pem.trim().length > 0).length; process.stdout.write(String(count)); } catch (_) { process.stdout.write('0'); }" "$updated_registry_json")
    echo -e "${GREEN}✅ Updated $registry_label key registry ($registry_entry_count key IDs tracked)${NC}"
    echo -e "${GREEN}✅ $active_key_var_name: $current_key_id${NC}"
}

escape_for_sed_replacement() {
    printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

generate_10_char_id() {
    local label
    label=$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-z0-9' | head -c 10 || true)
    if [ -n "$label" ] && [ ${#label} -eq 10 ]; then
        printf '%s' "$label"
    fi
}
