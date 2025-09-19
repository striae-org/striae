# Striae Installation Guide

This guide provides step-by-step instructions for deploying Striae, a Firearms Examiner's Comparison Companion, on Cloudflare infrastructure.

> **👥 Internal Developers**: If you are an internal developer with the striae-org team, you can skip almost all of the setup process! Frontend, workers, and all infrastructure are already deployed and maintained. See the [Internal Developer Quick Start](#internal-developer-quick-start) section below.

## Table of Contents

- [Prerequisites](#prerequisites)
  - [External Developers - Required Accounts & Services](#external-developers---required-accounts--services)
  - [Cloudflare Services Required](#cloudflare-services-required)
  - [Internal Developer Quick Start](#internal-developer-quick-start)
- [Step 1: Clone and Prepare the Project](#step-1-clone-and-prepare-the-project)
  - [1.1: Install Dependencies](#11-install-dependencies)
- [Step 2: Cloudflare Service Configuration](#step-2-cloudflare-service-configuration)
  - [2.1 Cloudflare Turnstile Setup](#21-cloudflare-turnstile-setup)
  - [2.2 Cloudflare Images Setup](#22-cloudflare-images-setup)
  - [2.3 Cloudflare KV Setup](#23-cloudflare-kv-setup)
  - [2.4 Cloudflare R2 Setup](#24-cloudflare-r2-setup)
- [Step 3: Environment Variables Setup](#step-3-environment-variables-setup)
  - [3.1 Generate Security Tokens](#31-generate-security-tokens)
  - [3.2 Initialize Environment Configuration](#32-initialize-environment-configuration)
  - [3.3 Required Environment Variables](#33-required-environment-variables)
- [Step 4: Complete Deployment](#step-4-complete-deployment)
  - [4.1 Unified Complete Deployment](#41-unified-complete-deployment)
- [Step 5: Testing and Verification](#step-5-testing-and-verification)
  - [5.1 Test Authentication Flow](#51-test-authentication-flow)
  - [5.2 Test Core Features](#52-test-core-features)
  - [5.3 Test Worker Endpoints](#53-test-worker-endpoints)
  - [5.4 Verify CORS Configuration](#54-verify-cors-configuration)
- [Step 6: Security Checklist](#step-6-security-checklist)
- [Important Notes & Updates](#important-notes--updates)
  - [✨ New Environment Setup System](#-new-environment-setup-system)
  - [Key Improvements Made](#key-improvements-made)
  - [Required Binding Names](#required-binding-names)  
  - [Quick Start Summary](#quick-start-summary)
- [Troubleshooting](#troubleshooting)
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

#### ✅ Already Set Up for You

- **Cloudflare Account & Services** - Access provided through shared developer account (Pages, Workers, KV, R2, Images, Turnstile)
- **Frontend Deployment** - Fully deployed and maintained at [https://dev.striae.org](https://dev.striae.org)
- **Worker Deployment** - All backend workers deployed and maintained by infrastructure team
- **Firebase Authentication & MFA** - Pre-configured and ready to use
- **SendLayer API** - Email services already configured  
- **Environment Variables** - Complete `.env` file provided
- **Configuration Files** - All `config.json`, `firebase.ts`, and worker configs ready

#### 📋 Your Requirements

1. **Node.js** version 20.0.0 or higher
2. **Git** access to contribute to `striae-org/striae-dev` fork
3. **Development on separate branches only** - All contributions must be on dev branches, never directly to main/master

#### 🚀 Quick Setup Process

1. **Clone the dev fork**: `git clone https://github.com/striae-org/striae-dev.git`
2. **Create your dev branch**: `git checkout -b your-feature-branch`
3. **Use provided files**: Copy the complete `.env` and config files you receive
4. **Install dependencies**: Run `npm install` to install all required packages
5. **Start developing**: Frontend and all workers are deployed and maintained - you can begin contributing immediately!

#### 📞 Getting Internal Developer Access

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

## Step 3: Environment Variables Setup

**🎯 Internal Developers**: If you are an internal developer, **skip this entire step**. You will receive a complete, pre-configured `.env` file with all required variables. Simply use the provided file and proceed to Step 4.

**📋 External Developers**: This section is for external developers who need to set up their own environment variables and external service accounts.

Striae uses a centralized environment variables system that organizes all secrets by their usage across different workers and the Pages application.

### 3.1 Generate Security Tokens

**First, generate secure random tokens** for the custom authentication variables that you'll need in your `.env` file:

```bash
# Session secret (64 characters recommended)
openssl rand -hex 32

# Custom auth tokens (32 characters)
openssl rand -hex 16

# Alternative format
openssl rand -base64 24
```

**Save these tokens** - you'll need them when filling out your `.env` file in the next step.

### 3.2 Initialize Environment Configuration

**For Standard Installation:**

**Copy the environment template:**

```bash
cp .env.example .env
```

**Fill in your actual values in the `.env` file**

The `.env` file is organized by service and includes:

- **Cloudflare Core Configuration**: Account ID and shared credentials
- **Shared Authentication & Storage**: Cross-worker authentication tokens
- **Firebase Auth Configuration**: Complete Firebase project settings
- **Pages Worker Environment Variables**: Project name and custom domain
- **Individual Worker Variables**: Worker names and domains for all 6 workers
- **Service-Specific Secrets**: Unique credentials for each Cloudflare service

### 3.3 Required Environment Variables

All required variables are documented in the `.env` file. Here's what you need to collect:

**Cloudflare Core Services:**

- `ACCOUNT_ID` - Your Cloudflare Account ID
- `SL_API_KEY` - SendLayer API key for email services
- `USER_DB_AUTH` - Custom user database authentication token
- `R2_KEY_SECRET` - Custom R2 storage authentication token
- `IMAGES_API_TOKEN` - Cloudflare Images API token (shared)

**Firebase Configuration (Complete Project Settings):**

- `API_KEY` - Firebase API key
- `AUTH_DOMAIN` - Firebase auth domain
- `PROJECT_ID` - Firebase project ID
- `STORAGE_BUCKET` - Firebase storage bucket
- `MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `APP_ID` - Firebase app ID
- `MEASUREMENT_ID` - Firebase measurement ID (optional)

**Pages Configuration:**

- `PAGES_PROJECT_NAME` - Your Cloudflare Pages project name
- `PAGES_CUSTOM_DOMAIN` - Your custom domain

**Worker Configuration (Names and Domains):**

- `KEYS_WORKER_NAME` - Keys worker name
- `KEYS_WORKER_DOMAIN` - Keys worker domain
- `USER_WORKER_NAME` - User worker name  
- `USER_WORKER_DOMAIN` - User worker domain
- `DATA_WORKER_NAME` - Data worker name
- `DATA_WORKER_DOMAIN` - Data worker domain
- `IMAGES_WORKER_NAME` - Images worker name
- `IMAGES_WORKER_DOMAIN` - Images worker domain
- `TURNSTILE_WORKER_NAME` - Turnstile worker name
- `TURNSTILE_WORKER_DOMAIN` - Turnstile worker domain
- `PDF_WORKER_NAME` - PDF worker name
- `PDF_WORKER_DOMAIN` - PDF worker domain

**Service-Specific Credentials:**

- `KEYS_AUTH` - Keys worker authentication token
- `ACCOUNT_HASH` - Cloudflare Images Account Hash
- `KV_STORE_ID` - Your KV namespace ID from Step 2.3
- `BUCKET_NAME` - Your R2 bucket name from Step 2.4
- `API_TOKEN` - Cloudflare Images API token (for Images Worker)
- `HMAC_KEY` - Cloudflare Images HMAC signing key
- `CFT_PUBLIC_KEY` - Cloudflare Turnstile public key
- `CFT_SECRET_KEY` - Cloudflare Turnstile secret key

**Custom Security Tokens** (generate your own):

- `R2_KEY_SECRET` - R2 authentication token
- `USER_DB_AUTH` - KV authentication token
- `KEYS_AUTH` - Key handler authentication token

**Environment Variable Dependencies:**

- **Account Deletion**: Requires `SL_API_KEY` for email notifications
- **Case Management**: Requires `R2_KEY_SECRET` for data worker communication
- **Image Management**: Requires `IMAGES_API_TOKEN` for image worker communication
- **User Storage**: Requires `USER_DB_AUTH` for KV database access

---

## Step 4: Complete Deployment

**🎯 Internal Developers**: **Skip this entire step**. All services are already deployed and maintained by the infrastructure team.

**📋 External Developers**: Now that all configuration is complete, deploy your entire Striae application with a single unified command.

**✅ Prerequisites**: Before running the complete deployment, ensure you have completed:

1. ✅ Set up Cloudflare services in Step 2
2. ✅ Set up environment variables and run configuration setup in Step 3

### 4.1 Unified Complete Deployment

Deploy everything with a single unified script:

```bash
# Deploy entire Striae application (configuration, workers, secrets, and pages)
npm run deploy:all
```

This unified script will execute the complete deployment process in the correct order:

1. **Configuration Setup** - Validate environment and configure all files
2. **Install Worker Dependencies** - Install dependencies for all workers
3. **Deploy Workers** - All 6 Cloudflare Workers
4. **Deploy Worker Secrets** - Environment variables for workers
5. **Deploy Pages** - Frontend application (includes build)
6. **Deploy Pages Secrets** - Environment variables for Pages

The unified deployment script provides:

- ✅ **Complete deployment automation** - Deploy everything with one command
- ✅ **Correct sequencing** - Ensures dependencies are deployed in the right order
- ✅ **Step-by-step progress tracking** - Clear feedback on each deployment phase
- ✅ **Comprehensive error handling** - Stops if any step fails, preventing partial deployments
- ✅ **Success summary** - Shows what was deployed and next steps
- ✅ **Cross-platform compatibility** - Works on Windows, Mac, and Linux

---

## Step 5: Testing and Verification

**🎯 Internal Developers**: You can test your changes on the pre-configured development environment at [https://dev.striae.org](https://dev.striae.org). Firebase authentication, MFA, and all external services are already configured and functional.

**📋 External Developers**: Follow the complete testing steps below to verify your installation.

### 5.1 Test Authentication Flow

1. Navigate to your deployed application
2. Test user authentication (login/registration)
3. Test user login
4. Test multi-factor authentication (MFA)
5. Test password reset functionality

### 5.2 Test Core Features

1. **Image Upload**: Test image upload functionality
2. **Data Storage**: Test data saving and retrieval
3. **PDF Generation**: Test PDF export features
4. **Turnstile**: Verify bot protection is working

### 5.3 Test Worker Endpoints

Verify each worker is responding correctly:

- Keys worker: Authentication and key management
- User worker: User data operations
- Data worker: Data storage operations
- Images worker: Image upload and processing
- Turnstile worker: Bot protection
- PDF worker: PDF generation

### 5.4 Verify CORS Configuration

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

## Step 6: Security Checklist

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
4. **Setup Environment**: `cp .env.example .env` → Fill with your credentials
5. **Complete Deployment**: `npm run deploy:all` (unified deployment)
6. **Test & Verify**: Verify all functionality and run security checklist

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
