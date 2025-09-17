# Environment Variables Setup

This directory (/scripts) contains scripts and configuration files for managing Striae's environment variables across all Cloudflare Workers and Pages.

## Files Overview

- **`.env`** - Your actual environment variables (DO NOT COMMIT)
- **`.env.example`** - Template with placeholder values (safe to commit)
- **`scripts/deploy-env.sh`** - Bash script for automated deployment (Linux/macOS/WSL)
- **`scripts/deploy-env.ps1`** - PowerShell script for automated deployment (Windows)
- **`scripts/deploy-env.bat`** - Batch file with manual commands (Windows)

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values in `.env`**

3. **Deploy to workers:**
   
   **Linux/macOS/WSL:**
   ```bash
   ./scripts/deploy-env.sh
   ```
   
   **Windows PowerShell:**
   ```powershell
   .\scripts\deploy-env.ps1
   ```
   
   **Windows (Manual):**
   ```cmd
   scripts\deploy-env.bat
   ```

## Environment Variables by Service

### Cloudflare Pages
- `SL_API_KEY` - SendLayer email service

### Keys Worker
- `ACCOUNT_HASH` - Cloudflare Images Account Hash
- `IMAGES_API_TOKEN` - Cloudflare Images API token (for keys worker)
- `KEYS_AUTH` - Custom keys authentication token
- `R2_KEY_SECRET` - Custom R2 authentication token
- `USER_DB_AUTH` - Custom KV authentication token

### User Worker
- `USER_DB_AUTH` - Custom KV authentication token
- `SL_API_KEY` - SendLayer email service API key for account deletion emails
- `R2_KEY_SECRET` - Custom R2 authentication token for data worker API calls
- `IMAGES_API_TOKEN` - Cloudflare Images API token for image worker API calls

### Data Worker
- `R2_KEY_SECRET` - Custom R2 authentication token

### Images Worker
- `ACCOUNT_ID` - Cloudflare Account ID
- `API_TOKEN` - Cloudflare Images API token
- `HMAC_KEY` - Cloudflare Images HMAC signing key

### Turnstile Worker
- `CFT_SECRET_KEY` - Cloudflare Turnstile secret key

### PDF Worker
- No environment variables needed (uses browser binding)

## Manual Deployment

If automated scripts don't work, you can set variables manually:

```bash
# Example for keys worker
cd workers/keys-worker
wrangler secret put ACCOUNT_ID --name striae-keys
wrangler secret put KEYS_AUTH --name striae-keys
# ... repeat for all variables
```

## Important Notes

1. **KV Binding**: Configure namespace ID in `workers/user-worker/wrangler.jsonc`
2. **R2 Binding**: Configure bucket name in `workers/data-worker/wrangler.jsonc`
3. **Pages Variables**: Set in Cloudflare Pages Dashboard manually
4. **Security**: Never commit `.env` with real values

## Generating Secure Tokens

```bash
# Session secret (64 characters)
openssl rand -hex 32

# Custom auth tokens (32 characters)  
openssl rand -hex 16

# Alternative format
openssl rand -base64 24
```

## Troubleshooting

- **Command not found**: Ensure `wrangler` CLI is installed and authenticated
- **Permission denied**: Run `chmod +x scripts/deploy-env.sh` on Unix systems
- **Missing variables**: Check that all required variables are set in `.env`
- **Deployment fails**: Verify worker names match your actual deployed worker names
