# Striae Installation Guide

This guide provides step-by-step instructions for deploying Striae, a Firearms Examiner's Comparison Companion, on Cloudflare infrastructure.

> **👥 Internal Developers**: If you are an internal developer with the striae-org team, you can skip almost all of the setup process! Frontend, workers, and all infrastructure are already deployed and maintained. See the [Internal Developer Quick Start](#internal-developer-quick-start) section below.

## Table of Contents

1. [Prerequisites](#prerequisites)
   - [External Developers - Required Accounts & Services](#external-developers---required-accounts--services)
   - [Cloudflare Services Required](#cloudflare-services-required)
   - [Internal Developer Quick Start](#internal-developer-quick-start)
2. [Step 1: Clone and Prepare the Project](#step-1-clone-and-prepare-the-project)
   - [1.1: Install Dependencies](#11-install-dependencies)
3. [Step 2: Cloudflare Service Configuration](#step-2-cloudflare-service-configuration)
   - [2.1 Cloudflare Turnstile Setup](#21-cloudflare-turnstile-setup)
   - [2.2 Cloudflare Images Setup](#22-cloudflare-images-setup)
   - [2.3 Cloudflare KV Setup](#23-cloudflare-kv-setup)
   - [2.4 Cloudflare R2 Setup](#24-cloudflare-r2-setup)
4. [Step 3: Configure Worker Files](#step-3-configure-worker-files)
   - [3.1 Copy Configuration Files](#31-copy-configuration-files)
   - [3.2 Update Worker Configurations](#32-update-worker-configurations)
5. [Step 4: Configure CORS for All Workers](#step-4-configure-cors-for-all-workers)
   - [4.1 Update CORS Headers in Worker Source Files](#41-update-cors-headers-in-worker-source-files)
   - [4.2 CORS Security Notes](#42-cors-security-notes)
   - [4.3 Verify CORS Configuration](#43-verify-cors-configuration)
6. [Step 5: Environment Variables Setup](#step-5-environment-variables-setup)
   - [5.1 Initialize Environment Configuration](#51-initialize-environment-configuration)
   - [5.2 Required Environment Variables](#52-required-environment-variables)
   - [5.3 Generate Security Tokens](#53-generate-security-tokens)
7. [Step 6: Configuration Files](#step-6-configuration-files)
   - [6.1 Update Configuration Files](#61-update-configuration-files)
8. [Step 7: Complete Deployment](#step-7-complete-deployment)
   - [7.1 Unified Complete Deployment](#71-unified-complete-deployment)
9. [Step 8: Testing and Verification](#step-8-testing-and-verification)
   - [8.1 Test Authentication Flow](#81-test-authentication-flow)
   - [8.2 Test Core Features](#82-test-core-features)
   - [8.3 Test Worker Endpoints](#83-test-worker-endpoints)
   - [8.4 Verify CORS Configuration](#84-verify-cors-configuration)
10. [Step 9: Security Checklist](#step-9-security-checklist)
11. [Important Notes & Updates](#important-notes--updates)
    - [✨ New Environment Setup System](#-new-environment-setup-system)
    - [Key Improvements Made](#key-improvements-made)
    - [Required Binding Names](#required-binding-names)
    - [Custom Domain Setup (Optional)](#custom-domain-setup-optional)
    - [Quick Start Summary](#quick-start-summary)
12. [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [KV Namespace Configuration Issues](#kv-namespace-configuration-issues)
    - [Useful Commands](#useful-commands)

## Prerequisites

Before starting the installation, choose your setup path based on your developer status:

### External Developers - Required Accounts & Services

**If you are setting up Striae independently**, you'll need to configure all services yourself:

1. **Cloudflare Account** with a registered domain name (for all Cloudflare services)
2. **Firebase Project** with Authentication enabled and properly configured
3. **SendLayer Account** with API access for email services
4. **Node.js** version 20.0.0 or higher
5. **Git** for cloning the repository

### Cloudflare Services Required

- **Cloudflare Pages** (for frontend hosting)
- **Cloudflare Workers** (for backend microservices)
- **Cloudflare Turnstile** (for bot protection)
- **Cloudflare Images** (for image storage and processing)
- **Cloudflare KV** (for user database)
- **Cloudflare R2** (for data storage)

### Internal Developer Quick Start

**If you are an internal developer with the striae-org team**, you have a much simpler setup process:

#### ✅ Already Set Up for You:
- **Cloudflare Account & Services** - Access provided through shared developer account (Pages, Workers, KV, R2, Images, Turnstile)
- **Frontend Deployment** - Fully deployed and maintained at [https://dev.striae.org](https://dev.striae.org)
- **Worker Deployment** - All backend workers deployed and maintained by infrastructure team
- **Firebase Authentication & MFA** - Pre-configured and ready to use
- **SendLayer API** - Email services already configured  
- **Environment Variables** - Complete `.env` file provided
- **Configuration Files** - All `config.json`, `firebase.ts`, and worker configs ready

#### 📋 Your Requirements:
1. **Node.js** version 20.0.0 or higher
2. **Git** access to contribute to `striae-org/striae-dev` fork
3. **Development on separate branches only** - All contributions must be on dev branches, never directly to main/master

#### 🚀 Quick Setup Process:
1. **Clone the dev fork**: `git clone https://github.com/striae-org/striae-dev.git`
2. **Create your dev branch**: `git checkout -b your-feature-branch`
3. **Use provided files**: Copy the complete `.env` and config files you receive
4. **Install dependencies**: Run `npm install` to install all required packages
5. **Start developing**: Frontend and all workers are deployed and maintained - you can begin contributing immediately!

#### 📞 Getting Internal Developer Access:
Contact Stephen at [dev@striae.org](mailto:dev@striae.org) to:
- Receive your pre-configured environment files
- Get access to the shared Cloudflare developer account
- Get access to the development fork
- Join the internal development workflow

> **🔒 Development Workflow**: All internal development must be contributed to the `striae-org/striae-dev` fork on separate dev branches only. Direct commits to main/master branches are not permitted.

---

## Step 1: Clone and Prepare the Project

**For External Developers:**
1. **Fork the repository** to your GitHub account:
   - Go to [https://github.com/striae-org/striae](https://github.com/striae-org/striae)
   - Click the "Fork" button to create your own copy
2. **Clone your fork**:
```bash
git clone https://github.com/YOUR_USERNAME/striae.git
cd striae
```

**For Internal Developers:**
```bash
# Clone the development fork directly (you have push access)
git clone https://github.com/striae-org/striae-dev.git
cd striae-dev

# Create your feature branch immediately
git checkout -b your-feature-branch-name
```

> **🔒 External Developer Note**: After forking and making changes, you'll submit pull requests from your fork back to the main `striae-org/striae` repository.

> **🔒 Internal Developer Note**: All development must be done on separate dev branches within the `striae-org/striae-dev` fork. Never commit directly to main/master branches.

### 1.1: Install Dependencies

Install the required dependencies using npm:

```bash
# Install all dependencies
npm install
```

This will install all the required Node.js packages including:
- Remix framework dependencies
- Cloudflare Workers compatibility packages
- Build tools and utilities
- Development dependencies

**Verification:**
```bash
# Verify the installation was successful
ls -la
# You should see: node_modules/, package.json, package-lock.json, and other project files

# Test that the build process works
npm run build
```

---

## Step 2: Cloudflare Service Configuration

**🎯 Internal Developers**: **Skip this entire step**. You have access to pre-configured Cloudflare services through the shared developer account. All Turnstile, Images, KV, and R2 services are already set up and configured.

**📋 External Developers**: This section guides you through setting up your own Cloudflare services required for Striae.

### 2.1 Cloudflare Turnstile Setup

1. Navigate to Cloudflare Dashboard → Turnstile
2. Create a new Turnstile site
3. Configure the site settings:
   - **Domain**: Your domain (e.g., `striae.org`)
   - **Mode**: Managed or Non-Interactive (recommended)
4. Note down:
   - **Site Key** (for frontend configuration)
   - **Secret Key** (CFT_SECRET_KEY)

### 2.2 Cloudflare Images Setup

1. Navigate to Cloudflare Dashboard → Images
2. Subscribe to the Cloudflare Images plan
3. Go to Images → Variants and create a new variant:
   - **Variant Name**: `striae`
   - **Settings**: Use default settings
   - **Metadata**: Strip all metadata (recommended)
4. Go to Images → Keys and note:
   - **HMAC Key** for signed URLs (HMAC_KEY)
5. Go to Images → Overview and note:
   - **Account ID** (ACCOUNT_ID)
   - **Account Hash** (ACCOUNT_HASH)
6. Go to Manage Account → Account API Tokens and create:
   - **Images API Token** with read and write permissions to Cloudflare Images (IMAGES_API_TOKEN: Keys Worker; API_TOKEN: Images Worker)

### 2.3 Cloudflare KV Setup

1. Navigate to Cloudflare Dashboard → Storage & Databases → KV
2. Click "+ Create Instance" in the upper right corner
3. Create a new KV namespace:
   - **Namespace name**: `USER_DB` (or your preferred name)
   - Click "Create"

4. **⚠️ IMPORTANT: Record the Namespace ID**
   - After creating the namespace, you'll see it listed in the KV dashboard
   - **Copy the "Namespace ID"** (UUID format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Save this ID** - you'll need it for Step 3 (Configure Worker Files)
   - Example: `680e629649f957baa393b83d11ca17c6`

> **Important Note:** The Namespace ID is different from the namespace name. You need the UUID-format ID, not the name "USER_DB". This ID will be used in your worker configuration files.

### 2.4 Cloudflare R2 Setup

1. Navigate to Cloudflare Dashboard → R2 Object Storage
2. Create a new R2 bucket for data storage
3. Configure CORS settings for your bucket, replacing the allowed origin with your custom domain:

```json
[
  {
    "AllowedOrigins": [
      "https://your-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "DELETE",
      "POST"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Type",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Step 3: Configure Worker Files

**🎯 Internal Developers**: **Skip this entire step**. You will receive pre-configured `wrangler.jsonc` files for all workers with the correct account IDs, namespace IDs, and bucket names already set up.

**📋 External Developers**: Before deploying workers, you need to configure each worker's `wrangler.jsonc` file with your own Cloudflare account details.

Before deploying workers, you need to configure each worker's `wrangler.jsonc` file:

### 3.1 Copy Configuration Files

For each worker, copy the example configuration:

```bash
# Navigate to each worker directory and copy the example file
cd workers/keys-worker
cp wrangler.jsonc.example wrangler.jsonc

cd ../user-worker  
cp wrangler.jsonc.example wrangler.jsonc

cd ../data-worker
cp wrangler.jsonc.example wrangler.jsonc

cd ../image-worker
cp wrangler.jsonc.example wrangler.jsonc

cd ../turnstile-worker
cp wrangler.jsonc.example wrangler.jsonc

cd ../pdf-worker
cp wrangler.jsonc.example wrangler.jsonc
```

### 3.2 Update Worker Configurations

In each `wrangler.jsonc` file, update the following:

1. **Replace `YOUR_ACCOUNT_ID`** with your actual Cloudflare Account ID
2. **Replace custom domain patterns** with your actual domains (optional but recommended)
3. **🔑 Update KV namespace ID** in user-worker:
   - Open `workers/user-worker/wrangler.jsonc`
   - Find the `kv_namespaces` section
   - Replace `insert-your-kv-namespace-id` with the **Namespace ID** you saved from Step 2.3
   - Example: `"id": "680e629649f957baa393b83d11ca17c6"`
4. **Update R2 bucket name** in data-worker (replace `insert-your-r2-bucket-name` with your bucket name)

> **KV Namespace Configuration Example:**
> ```json
> "kv_namespaces": [
>   {
>     "binding": "USER_DB",
>     "id": "680e629649f957baa393b83d11ca17c6"
>   }
> ]
> ```
> ⚠️ Use the UUID-format **Namespace ID**, not the namespace name!

**Example for user-worker/wrangler.jsonc:**
```json
{
  "name": "striae-users",
  "account_id": "your-actual-account-id",
  "main": "src/user-worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "kv_namespaces": [
    {
      "binding": "USER_DB",
      "id": "your-actual-kv-namespace-id"
    }
  ],
  "routes": [
    {
      "pattern": "users.yourdomain.com",
      "custom_domain": true
    }
  ],
  "placement": { "mode": "smart" }
}
```

**Example for data-worker/wrangler.jsonc:**
```json
{
  "name": "striae-data",
  "account_id": "your-actual-account-id",
  "main": "src/data-worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "r2_buckets": [
    {
      "binding": "STRIAE_DATA",
      "bucket_name": "your-actual-r2-bucket-name"
    }
  ],
  "routes": [
    {
      "pattern": "data.yourdomain.com",
      "custom_domain": true
    }
  ],
  "placement": { "mode": "smart" }
}
```

---

## Step 4: Configure CORS for All Workers

**🎯 Internal Developers**: **Skip this entire step**. CORS headers are already configured for the development environment (`https://dev.striae.org`) in the provided worker files.

**📋 External Developers**: All workers have CORS (Cross-Origin Resource Sharing) headers that must be updated to match your domain.

**Important**: All workers have CORS (Cross-Origin Resource Sharing) headers that must be updated to match your domain. By default, they're configured for `https://www.striae.org`.

### 4.1 Update CORS Headers in Worker Source Files

Each worker needs its CORS headers updated to allow requests from your domain:

**1. User Worker** (`workers/user-worker/src/user-worker.js`):
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

// Also update worker URLs for cross-worker communication
const DATA_WORKER_URL = 'https://data.your-domain.com';
const IMAGE_WORKER_URL = 'https://images.your-domain.com';
```

**2. Data Worker** (`workers/data-worker/src/data-worker.js`):
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};
```

**3. Images Worker** (`workers/image-worker/src/image-worker.js`):
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};
```

**4. Keys Worker** (`workers/keys-worker/src/keys.js`):
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'text/plain'
};
```

**5. Turnstile Worker** (`workers/turnstile-worker/src/turnstile.js`):
```javascript
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

**6. PDF Worker** (`workers/pdf-worker/src/pdf-worker.js`):
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Update this
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};
```

### 4.2 CORS Security Notes

- **Use HTTPS**: Always use `https://` in CORS origins
- **Exact Match**: CORS requires exact domain matching (including subdomains)
- **No Wildcards**: Avoid using `*` for Access-Control-Allow-Origin in production
- **Multiple Domains**: If you need multiple domains, implement dynamic CORS checking
- **Testing**: Use browser developer tools to verify CORS headers are correct

### 4.3 Verify CORS Configuration

Test CORS headers using curl or browser developer tools:

```bash
# Test CORS preflight request
curl -X OPTIONS \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://your-worker.your-subdomain.workers.dev

# Should return Access-Control-Allow-Origin header
```

**Common CORS Issues:**
- ❌ **Mixed HTTP/HTTPS**: Ensure both frontend and workers use HTTPS
- ❌ **Subdomain Mismatch**: `www.domain.com` ≠ `domain.com`
- ❌ **Port Differences**: Development vs production port differences
- ❌ **Missing Preflight**: Some requests require OPTIONS preflight handling

---

## Step 5: Environment Variables Setup

**🎯 Internal Developers**: If you are an internal developer, **skip this entire step**. You will receive a complete, pre-configured `.env` file with all required variables. Simply use the provided file and proceed to Step 8.

**📋 External Developers**: This section is for external developers who need to set up their own environment variables and external service accounts.

Striae uses a centralized environment variables system that organizes all secrets by their usage across different workers and the Pages application.

### 5.1 Initialize Environment Configuration

**For Standard Installation:**

1. **Copy the environment template:**

```bash
cp .env.example .env
```

2. **Fill in your actual values in the `.env` file**

The `.env` file is organized by service and includes:
- **Pages Worker Variables**: Session management and email service
- **Keys Worker Variables**: Authentication and key management  
- **Individual Worker Variables**: Service-specific secrets
- **Cloudflare Service Keys**: Images, Turnstile, R2, KV credentials

### 5.2 Required Environment Variables

All required variables are documented in the `.env` file. Here's what you need to collect:

**Cloudflare Services:**
- `ACCOUNT_ID` - Your Cloudflare Account ID
- `IMAGES_API_TOKEN` or `API_TOKEN` (for Image Worker) - Cloudflare Images API token
- `ACCOUNT_HASH` - Cloudflare Images Account Hash
- `HMAC_KEY` - Cloudflare Images HMAC signing key
- `CFT_SECRET_KEY` - Cloudflare Turnstile secret key

**External Services:**
- `SL_API_KEY` - SendLayer API token

**Custom Security Tokens** (generate your own):
- `R2_KEY_SECRET` - R2 authentication token
- `USER_DB_AUTH` - KV authentication token
- `KEYS_AUTH` - Key handler authentication token

**Environment Variable Dependencies:**
- **Account Deletion**: Requires `SL_API_KEY` for email notifications
- **Case Management**: Requires `R2_KEY_SECRET` for data worker communication
- **Image Management**: Requires `IMAGES_API_TOKEN` for image worker communication
- **User Storage**: Requires `USER_DB_AUTH` for KV database access

### 5.3 Generate Security Tokens

Generate secure random tokens for the custom authentication variables:

```bash
# Session secret (64 characters recommended)
openssl rand -hex 32

# Custom auth tokens (32 characters)
openssl rand -hex 16

# Alternative format
openssl rand -base64 24
```

---

## Step 6: Configuration Files

**🎯 Internal Developers**: If you are an internal developer, **skip this entire step**. You will receive pre-configured config files including `config.json`, `firebase.ts`, `inactivity.ts`, `keys.json`, and `wrangler.toml`. Use the provided files and proceed directly to Step 8.

**📋 External Developers**: This section is for external developers who need to manually configure their application settings and Firebase integration.

### 6.1 Update Configuration Files

1. **Copy example configurations**:
```bash
cp app/config-example/config.json app/config/config.json
cp app/config-example/firebase.ts app/config/firebase.ts
cp app/config-example/inactivity.ts app/config/inactivity.ts
cp app/components/turnstile/keys.json.example app/components/turnstile/keys.json
cp wrangler.toml.example wrangler.toml
```

2. **Update `app/config/config.json`**:
Replace all worker URLs with your deployed worker URLs:
```json
{
  "name": "Striae",
  "author": "Stephen J. Lu",
  "title": "A Firearms Examiner's Comparison Companion",  
  "url": "https://your-domain.com",    
  "data_worker_url": "https://your-data-worker.your-subdomain.workers.dev",
  "keys_url": "https://your-keys-worker.your-subdomain.workers.dev",
  "image_worker_url": "https://your-image-worker.your-subdomain.workers.dev",
  "user_worker_url": "https://your-user-worker.your-subdomain.workers.dev",
  "pdf_worker_url": "https://your-pdf-worker.your-subdomain.workers.dev",
  "keys_auth": "YOUR_KEYS_AUTH_TOKEN"
}
```

3. **Update `app/components/turnstile/keys.json`**:
```json
{
  "CFT_PUBLIC_KEY": "YOUR_CLOUDFLARE_TURNSTILE_PUBLIC_KEY",
  "worker_url": "https://your-turnstile-worker.your-subdomain.workers.dev"
}
```

4. **Update `app/config/firebase.ts`**:
Insert your Firebase configuration parameters:
```typescript
// Replace with your Firebase config
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

5. **Update `wrangler.toml` (root directory)**:
```toml
name = "your-striae-app-name"
compatibility_date = "2024-12-30"
pages_build_output_dir = "./build/client"

[placement]
mode = "smart"
```

> **Note**: The root `wrangler.toml` file configures the Cloudflare Pages deployment (frontend), while the `wrangler.jsonc` files in the `workers/` directories configure individual worker services.

---

## Step 7: Complete Deployment

**🎯 Internal Developers**: **Skip this entire step**. All services are already deployed and maintained by the infrastructure team.

**📋 External Developers**: Now that all configuration is complete, deploy your entire Striae application with a single unified command.

**✅ Prerequisites**: Before running the complete deployment, ensure you have completed:
1. ✅ Configured all worker files (`wrangler.jsonc`) in Step 3
2. ✅ Updated CORS settings in worker source files in Step 4
3. ✅ Set up environment variables (`.env` file) in Step 5
4. ✅ Updated configuration files (`config.json`, `firebase.ts`, `keys.json`, `wrangler.toml`) in Step 6

### 7.1 Unified Complete Deployment

Deploy everything with a single unified script:

```bash
# Deploy entire Striae application (workers, secrets, pages, and page secrets)
npm run deploy:all
```

This unified script will execute the complete deployment process in the correct order:

1. **Deploy Workers** - All 6 Cloudflare Workers
2. **Deploy Worker Secrets** - Environment variables for workers
3. **Deploy Pages** - Frontend application (includes build)
4. **Deploy Pages Secrets** - Environment variables for Pages

The unified deployment script provides:

- ✅ **Complete deployment automation** - Deploy everything with one command
- ✅ **Correct sequencing** - Ensures dependencies are deployed in the right order
- ✅ **Step-by-step progress tracking** - Clear feedback on each deployment phase
- ✅ **Comprehensive error handling** - Stops if any step fails, preventing partial deployments
- ✅ **Success summary** - Shows what was deployed and next steps
- ✅ **Cross-platform compatibility** - Works on Windows, Mac, and Linux

---

## Step 8: Testing and Verification

**🎯 Internal Developers**: You can test your changes on the pre-configured development environment at [https://dev.striae.org](https://dev.striae.org). Firebase authentication, MFA, and all external services are already configured and functional.

**📋 External Developers**: Follow the complete testing steps below to verify your installation.

### 8.1 Test Authentication Flow

1. Navigate to your deployed application
2. Test user authentication (login/registration)
3. Test user login
4. Test multi-factor authentication (MFA)
5. Test password reset functionality

### 8.2 Test Core Features

1. **Image Upload**: Test image upload functionality
2. **Data Storage**: Test data saving and retrieval
3. **PDF Generation**: Test PDF export features
4. **Turnstile**: Verify bot protection is working

### 8.3 Test Worker Endpoints

Verify each worker is responding correctly:
- Keys worker: Authentication and key management
- User worker: User data operations
- Data worker: Data storage operations
- Images worker: Image upload and processing
- Turnstile worker: Bot protection
- PDF worker: PDF generation

### 8.4 Verify CORS Configuration

Test that CORS is working correctly by:

1. **Browser Developer Tools**: Check that requests from your frontend to workers succeed without CORS errors
2. **Network Tab**: Verify that OPTIONS preflight requests return proper CORS headers
3. **Manual Testing**: Use curl to test CORS headers:

```bash
# Test CORS for each worker
curl -X OPTIONS \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  https://your-worker-url.workers.dev
```

Expected response should include:
- `Access-Control-Allow-Origin: https://your-domain.com`
- Appropriate `Access-Control-Allow-Methods`
- Appropriate `Access-Control-Allow-Headers`

---

## Step 9: Security Checklist

- [ ] All environment variables are set correctly
- [ ] CORS is properly configured for all workers with your domain
- [ ] CORS is properly configured for R2
- [ ] Firebase authentication is working
- [ ] Turnstile is blocking bots
- [ ] HTTPS is enforced
- [ ] All custom domains are configured
- [ ] Worker authentication tokens are unique and secure

---

## Important Notes & Updates

### ✨ New Environment Setup System

**Striae now includes an automated environment variables management system:**

1. **Centralized Configuration**: All environment variables organized in `.env` file by service
2. **Automated Environment Setup**: Scripts for Linux, macOS, Windows, and PowerShell
3. **Template System**: Safe `.env.example` file for version control
4. **Comprehensive Documentation**: See [Environment Variables Setup](https://developers.striae.org/striae-dev/get-started/installation-guide/environment-variables-setup) for detailed instructions

### Key Improvements Made

1. **Streamlined Environment Setup**: Single `.env` file replaces manual variable collection
2. **Automated Secret Management**: One command configures all worker secrets
3. **Cross-Platform Support**: Scripts for all operating systems
4. **Better Organization**: Variables grouped by worker/service usage
5. **Enhanced Security**: Template system prevents accidental credential commits

### Required Binding Names
- **User Worker KV Binding**: `USER_DB`
- **Data Worker R2 Binding**: `STRIAE_DATA`

### Custom Domain Setup (Optional)
Each worker can optionally use custom domains. Update the `routes` section in each worker's `wrangler.jsonc` file with your preferred subdomain pattern:
- Keys: `keys.yourdomain.com`
- Users: `users.yourdomain.com`  
- Data: `data.yourdomain.com`
- Images: `images.yourdomain.com`
- Turnstile: `turnstile.yourdomain.com`
- PDF: `pdf.yourdomain.com`

### Quick Start Summary

**For Internal Developers:**
1. **Clone dev fork**: `git clone https://github.com/striae-org/striae-dev.git`
2. **Create dev branch**: `git checkout -b your-feature-branch`
3. **Use provided files**: Place received `.env`, config files, `wrangler.toml`, and `wrangler.jsonc` files in correct project directories
4. **Install dependencies**: Run `npm install` to install all required packages
5. **Start developing**: Frontend and all workers are deployed and maintained - test on [https://dev.striae.org](https://dev.striae.org)

**For External Developers:**

1. **Fork & Clone**: Fork `striae-org/striae` to your account → Clone your fork
2. **Install Dependencies**: Run `npm install` to install all required packages
3. **Configure Services**: Set up Cloudflare (Turnstile, Images, KV, R2), Firebase, SendLayer
4. **Configure Workers**: Copy `wrangler.jsonc.example` files → Update with your account details
5. **Setup Environment**: `cp .env.example .env` → Fill with your credentials
6. **Configure Application**: Update `config.json`, `firebase.ts`, `keys.json`, `wrangler.toml` files
7. **Complete Deployment**: `npm run deploy:all` (unified deployment)
8. **Test & Verify**: Verify all functionality and run security checklist

---

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure R2 CORS configuration includes your domain
2. **Authentication Failures**: Verify Firebase configuration and worker tokens
3. **Image Upload Issues**: Check environment variable configuration in image worker
4. **Worker Errors**: Verify environment variables and bindings are set correctly

### KV Namespace Configuration Issues

**Error: `KV namespace 'USER_DB' is not valid [code: 10042]`**

This error occurs when the KV namespace configuration uses a name instead of the UUID-format ID:

1. **Check Your Configuration**: Open `workers/user-worker/wrangler.jsonc`
2. **Verify the ID Format**: The `id` field should be a UUID (e.g., `680e629649f957baa393b83d11ca17c6`), not a name like `USER_DB`
3. **Get the Correct ID**: 
   - Go to Cloudflare Dashboard → Storage & Databases → KV
   - Find your `USER_DB` namespace
   - Copy the "Namespace ID" (UUID format)
4. **Update the Configuration**:
   ```json
   "kv_namespaces": [
     {
       "binding": "USER_DB",
       "id": "your-actual-uuid-here"
     }
   ]
   ```
5. **Redeploy**: Run `wrangler deploy` in the user-worker directory

**Error: `A request to the Cloudflare API (/accounts/.../storage/kv/namespaces/...) failed`**

This usually indicates:
- The namespace ID doesn't exist
- Wrong account ID in `wrangler.jsonc`
- Authentication issues with Cloudflare

Double-check your Account ID and KV namespace ID in the Cloudflare dashboard.

### Useful Commands

```bash
# Check worker status
wrangler whoami

# Tail worker logs
wrangler tail [worker-name]

# Check Pages deployment status
wrangler pages deployment list

# Test local development
npm run dev
```
