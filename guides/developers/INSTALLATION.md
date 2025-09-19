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
  - [3.1 Understanding the Automated Configuration](#31-understanding-the-automated-configuration)
  - [3.2 What You'll Be Prompted For](#32-what-youll-be-prompted-for)
  - [3.3 Token Generation Helper](#33-token-generation-helper)
  - [3.4 Required Information to Collect](#34-required-information-to-collect)
- [Step 4: Complete Deployment](#step-4-complete-deployment)
  - [4.1 Automated Configuration and Deployment](#41-automated-configuration-and-deployment)
- [Step 5: Testing and Verification](#step-5-testing-and-verification)
  - [5.1 Test Authentication Flow](#51-test-authentication-flow)
  - [5.2 Test Core Features](#52-test-core-features)
  - [5.3 Test Worker Endpoints](#53-test-worker-endpoints)
  - [5.4 Verify CORS Configuration](#54-verify-cors-configuration)
- [Step 6: Security Checklist](#step-6-security-checklist)
- [Important Notes & Updates](#important-notes--updates)
  - [✨ New Interactive Environment Setup System](#-new-interactive-environment-setup-system)
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

**📋 External Developers**: This section explains the interactive environment setup system that will automatically run during deployment. You don't need to configure environment variables manually - the deployment script will guide you through the process.

Striae uses an automated interactive environment setup system that guides you through configuring all required variables during the deployment process.

### 3.1 Understanding the Automated Configuration

**The configuration happens automatically during deployment:**

When you run `npm run deploy:all`, the deployment script will automatically:

1. **Copy Configuration Templates** - Automatically copy all example configuration files
2. **Interactive Variable Prompting** - Guide you through each required environment variable with descriptions
3. **Smart Validation** - Verify all required variables are provided
4. **Automatic File Updates** - Update all configuration files with your values
5. **CORS Configuration** - Automatically configure worker CORS headers with your domain

**You don't need to run any separate configuration commands** - everything is handled as part of the unified deployment process.

### 3.2 What You'll Be Prompted For

During the deployment process, the interactive setup will prompt you for values organized by category:

**🔧 Cloudflare Core Configuration:**

- Account ID and shared credentials

**🔐 Shared Authentication & Storage:**

- Cross-worker authentication tokens (with generation hints)

**🔥 Firebase Auth Configuration:**

- Complete Firebase project settings

**📄 Pages Configuration:**

- Project name and custom domain

**🔑 Worker Names & Domains:**

- All 6 worker names and custom domains

**🗄️ Storage Configuration:**

- R2 bucket name and KV namespace ID

**🔐 Service-Specific Secrets:**

- Unique credentials for each Cloudflare service

### 3.3 Token Generation Helper

When prompted for security tokens, the script provides generation hints. You can also generate them manually:

```bash
# Session secret (64 characters recommended)
openssl rand -hex 32

# Custom auth tokens (32 characters)
openssl rand -hex 16

# Alternative format
openssl rand -base64 24
```

### 3.4 Required Information to Collect

Before running the configuration script, gather the following information from Step 2 (Cloudflare services):

**From Step 2.1 (Turnstile):**

- Turnstile Site Key (`CFT_PUBLIC_KEY`)
- Turnstile Secret Key (`CFT_SECRET_KEY`)

**From Step 2.2 (Images):**

- Account ID (`ACCOUNT_ID`)
- Account Hash (`ACCOUNT_HASH`)
- Images API Token (`IMAGES_API_TOKEN` and `API_TOKEN`)
- HMAC Key (`HMAC_KEY`)

**From Step 2.3 (KV):**

- KV Namespace ID (`KV_STORE_ID`) - UUID format from dashboard

**From Step 2.4 (R2):**

- R2 Bucket Name (`BUCKET_NAME`)

**Additional Services:**

- **Firebase Project Settings** - Complete configuration from your Firebase project
- **SendLayer API Key** - For email services (`SL_API_KEY`)
- **Custom Domain Names** - Your domain and worker subdomains
- **Worker Names** - Names for all 6 workers in your Cloudflare account

**Security Tokens** (generated during setup):

The script will prompt you to generate secure tokens for:

- User database authentication
- R2 storage authentication  
- Worker authentication

**💡 Tip:** The interactive script provides helpful descriptions and generation hints for each variable, making the setup process straightforward even for complex configurations.

---

## Step 4: Complete Deployment

**🎯 Internal Developers**: **Skip this entire step**. All services are already deployed and maintained by the infrastructure team.

**📋 External Developers**: Now that all Cloudflare services are set up, deploy your entire Striae application with a single command that handles configuration and deployment automatically.

**✅ Prerequisites**: Before running the deployment, ensure you have completed:

1. ✅ Set up Cloudflare services in Step 2  
2. ✅ Have the required information ready from Step 3 (you'll be prompted during deployment)

### 4.1 Automated Configuration and Deployment

Deploy everything with a single unified script that includes interactive configuration:

```bash
# Deploy entire Striae application (configuration, workers, secrets, and pages)
npm run deploy:all
```

**What happens during deployment:**

The unified script will execute the complete deployment process in the correct order:

1. **Interactive Configuration Setup** - Prompts for all environment variables and configures files
2. **Install Worker Dependencies** - Install dependencies for all workers  
3. **Deploy Workers** - All 6 Cloudflare Workers
4. **Deploy Worker Secrets** - Environment variables for workers
5. **Deploy Pages** - Frontend application (includes build)
6. **Deploy Pages Secrets** - Environment variables for Pages

**💡 Note:** The configuration setup is fully integrated into the deployment process. The script will automatically prompt you for all required environment variables when you run `npm run deploy:all`.

The unified deployment script provides:

- ✅ **Complete deployment automation** - Deploy everything with one command
- ✅ **Interactive configuration setup** - Guided prompts for all required variables
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

### ✨ New Interactive Environment Setup System

**Striae now includes an automated interactive environment configuration system:**

1. **Interactive Configuration Prompts**: Guided setup for all environment variables with descriptions
2. **Automatic File Generation**: Creates and updates all configuration files automatically
3. **Smart Validation**: Verifies all required variables are provided before proceeding
4. **Cross-Platform Support**: Identical functionality on Linux, macOS, Windows (bash/PowerShell/batch)
5. **Template System**: Safe `.env.example` file for version control
6. **CORS Auto-Configuration**: Automatically configures worker CORS headers with your domain

### Key Improvements Made

1. **Streamlined Setup Process**: Interactive prompts replace manual `.env` file editing
2. **Automated Configuration Management**: Single command configures all worker and app files
3. **Enhanced User Experience**: Helpful descriptions and generation hints for each variable
4. **Reduced Errors**: Smart validation prevents common configuration mistakes
5. **Better Organization**: Variables grouped logically by service and function
6. **Complete Automation**: From environment setup to deployment in a single workflow

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
4. **Deploy Everything**: `npm run deploy:all` (includes automated interactive configuration)
5. **Test & Verify**: Verify all functionality and run security checklist

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
