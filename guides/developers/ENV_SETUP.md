# Environment Variables Setup

This directory (/scripts) contains scripts and configuration files for managing Striae's environment variables across all Cloudflare Workers and Pages.

## Files Overview

- **`.env`** - Your actual environment variables (DO NOT COMMIT)
- **`.env.example`** - Template with placeholder values (safe to commit)
- **`scripts/deploy-config.sh`** - Configuration setup script (Linux/macOS/WSL)
- **`scripts/deploy-config.ps1`** - Configuration setup script (Windows PowerShell)
- **`scripts/deploy-worker-secrets.sh`** - Worker secrets deployment (Linux/macOS/WSL)
- **`scripts/deploy-worker-secrets.ps1`** - Worker secrets deployment (Windows PowerShell)
- **`scripts/deploy-all.sh`** - Complete deployment automation (Linux/macOS/WSL)
- **`scripts/deploy-all.ps1`** - Complete deployment automation (Windows PowerShell)

## Quick Setup

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values in `.env`**

3. **Deploy configuration and everything:**

   **Linux/macOS/WSL:**

   ```bash
   npm run deploy:all
   ```

   **Windows PowerShell:**

   ```powershell
   npm run deploy:all
   ```

## Environment Variables by Service

### Cloudflare Core Configuration

- `ACCOUNT_ID` - Your Cloudflare Account ID

### Shared Authentication & Storage

- `SL_API_KEY` - SendLayer email service API key
- `USER_DB_AUTH` - Custom user database authentication token
- `R2_KEY_SECRET` - Custom R2 storage authentication token
- `IMAGES_API_TOKEN` - Cloudflare Images API token (shared)

### Firebase Auth Configuration

- `API_KEY` - Firebase API key
- `AUTH_DOMAIN` - Firebase auth domain
- `PROJECT_ID` - Firebase project ID
- `STORAGE_BUCKET` - Firebase storage bucket
- `MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `APP_ID` - Firebase app ID
- `MEASUREMENT_ID` - Firebase measurement ID (optional)

### Pages Worker Environment Variables

- `PAGES_PROJECT_NAME` - Your Cloudflare Pages project name
- `PAGES_CUSTOM_DOMAIN` - Your custom domain

### Keys Worker Environment Variables

- `KEYS_WORKER_NAME` - Keys worker name
- `KEYS_WORKER_DOMAIN` - Keys worker domain
- `KEYS_AUTH` - Custom keys authentication token
- `ACCOUNT_HASH` - Cloudflare Images Account Hash

### User Worker Environment Variables

- `USER_WORKER_NAME` - User worker name
- `USER_WORKER_DOMAIN` - User worker domain
- `KV_STORE_ID` - Your KV namespace ID

### Data Worker Environment Variables

- `DATA_WORKER_NAME` - Data worker name
- `DATA_WORKER_DOMAIN` - Data worker domain
- `BUCKET_NAME` - Your R2 bucket name

### Images Worker Environment Variables

- `IMAGES_WORKER_NAME` - Images worker name
- `IMAGES_WORKER_DOMAIN` - Images worker domain
- `API_TOKEN` - Cloudflare Images API token (for Images Worker)
- `HMAC_KEY` - Cloudflare Images HMAC signing key

### Turnstile Worker Environment Variables

- `TURNSTILE_WORKER_NAME` - Turnstile worker name
- `TURNSTILE_WORKER_DOMAIN` - Turnstile worker domain
- `CFT_PUBLIC_KEY` - Cloudflare Turnstile public key
- `CFT_SECRET_KEY` - Cloudflare Turnstile secret key

### PDF Worker Environment Variables

- `PDF_WORKER_NAME` - PDF worker name
- `PDF_WORKER_DOMAIN` - PDF worker domain
- No environment secrets needed (uses browser binding)

## New Automated Deployment Flow

The new deployment system provides a streamlined 6-step automated process:

1. **Configuration Setup** - `npm run deploy-config` validates environment and configures all files
2. **Install Worker Dependencies** - Installs dependencies for all workers
3. **Deploy Workers** - Deploys all 6 Cloudflare Workers
4. **Deploy Worker Secrets** - `npm run deploy-workers:secrets` sets environment variables
5. **Deploy Pages** - Deploys frontend application (includes build)
6. **Deploy Pages Secrets** - Sets Pages environment variables

**Complete Automation:**

```bash
npm run deploy:all  # Runs all 6 steps automatically
```

**Individual Commands:**

```bash
npm run deploy-config          # Step 1: Configuration setup only
npm run deploy-workers:secrets  # Step 4: Worker secrets only
npm run deploy-pages           # Step 5: Pages deployment only  
npm run deploy-pages:secrets   # Step 6: Pages secrets only
```

## Manual Deployment (Legacy)

If automated scripts don't work, you can set variables manually:

```bash
# Example for keys worker
cd workers/keys-worker
wrangler secret put KEYS_AUTH --name striae-keys
wrangler secret put ACCOUNT_HASH --name striae-keys
# ... repeat for all variables
```

## Important Notes

1. **Configuration First**: Always run `npm run deploy-config` before any deployment
2. **KV Binding**: Namespace ID automatically configured in `workers/user-worker/wrangler.jsonc`
3. **R2 Binding**: Bucket name automatically configured in `workers/data-worker/wrangler.jsonc`
4. **Pages Variables**: Automatically set through deployment scripts
5. **Security**: Never commit `.env` with real values

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

- **Configuration Errors**: Run `npm run deploy-config` to validate and fix configuration
- **Command not found**: Ensure `wrangler` CLI is installed and authenticated
- **Permission denied**: Run `chmod +x scripts/*.sh` on Unix systems
- **Missing variables**: Check that all required variables are set in `.env`
- **Deployment fails**: Verify worker names match your actual deployed worker names
- **Placeholder errors**: Ensure `npm run deploy-config` completed successfully before deployment
