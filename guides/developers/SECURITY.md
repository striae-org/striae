# Striae Security Guide

## Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
   - [Firebase Authentication](#firebase-authentication)
     - [Implemented Features](#implemented-features)
   - [Password Security Requirements](#password-security-requirements)
   - [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
     - [MFA Flow](#mfa-flow)
3. [Access Control](#access-control)
   - [Direct Authentication Access](#direct-authentication-access)
   - [Account Deletion Security](#account-deletion-security)
4. [API Security](#api-security)
   - [Worker Authentication](#worker-authentication)
   - [CORS Configuration](#cors-configuration)
   - [API Key Management](#api-key-management)
5. [Data Security](#data-security)
   - [Signed URLs for Images](#signed-urls-for-images)
   - [Environment Variable Security](#environment-variable-security)
6. [Error Handling](#error-handling)
   - [Secure Error Responses](#secure-error-responses)
   - [HTTP Status Codes](#http-status-codes)
7. [Security Configuration](#security-configuration)
   - [Firebase Configuration](#firebase-configuration)
   - [Required Environment Setup](#required-environment-setup)
8. [Development Security Practices](#development-security-practices)
   - [Local Development](#local-development)
   - [Testing Authentication](#testing-authentication)
   - [Secret Management](#secret-management)
9. [Security Limitations](#security-limitations)
   - [Not Currently Implemented](#not-currently-implemented)
   - [Cloudflare Worker Logging](#cloudflare-worker-logging)
   - [Known Considerations](#known-considerations)
10. [Security Checklist for New Features](#security-checklist-for-new-features)
    - [Before Adding New Endpoints](#before-adding-new-endpoints)
    - [Before Deploying](#before-deploying)
11. [Incident Response](#incident-response)
    - [If Security Issue Discovered](#if-security-issue-discovered)
    - [Monitoring](#monitoring)

## Overview

This guide covers security practices, authentication flows, and security considerations for developers working on the Striae project.

## Authentication Architecture

### Firebase Authentication

Striae uses Firebase Authentication as the primary authentication system:

```typescript
// app/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '~/config/firebase';

export const app = initializeApp(firebaseConfig, "Striae");
export const auth = getAuth(app);
```

#### Implemented Features
- **Email/Password Authentication**: Standard email and password login
- **Email Verification**: Required before account activation
- **Multi-Factor Authentication (MFA)**: SMS-based second factor
- **Password Reset**: Secure password reset flow
- **Session Management**: Firebase token-based sessions

### Password Security Requirements

Strong password validation is enforced during authentication:

```typescript
// From app/routes/auth/login.tsx
const checkPasswordStrength = (password: string): boolean => {
  const hasMinLength = password.length >= 10;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
};
```

**Requirements:**
- Minimum 10 characters
- At least one uppercase letter
- At least one number
- At least one special character

### Multi-Factor Authentication (MFA)

MFA implementation using Firebase Auth:

```typescript
// app/utils/mfa.ts
export const userHasMFA = (user: User): boolean => {
  return multiFactor(user).enrolledFactors.length > 0;
};
```

#### MFA Flow
1. User completes email/password authentication
2. If MFA not enrolled, prompt for phone number enrollment
3. SMS verification code sent via Firebase
4. Future logins require both password and SMS code

## Access Control

### Direct Authentication Access

Application provides direct access to the authentication interface with email domain restrictions:

```typescript
// app/routes/auth/login.tsx
// Email domain validation using free-email-domains package
const validateEmailDomain = (email: string): boolean => {
  const emailDomain = email.toLowerCase().split('@')[1];
  return !freeEmailDomains.includes(emailDomain);
};
```

**Email Domain Restrictions:**

- Personal email providers (Gmail, Yahoo, Outlook, etc.) are blocked
- Only work/institutional email addresses are allowed
- Uses comprehensive free-email-domains package with 4,779+ blocked domains

### Account Deletion Security

Account deletion is protected by multiple security layers:

**Permission-Based Access Control:**

- Demo accounts (`permitted=false`) cannot delete accounts
- Regular accounts (`permitted=true`) have full deletion access
- Permission status fetched via `getUserData()` from permissions utilities

**Multi-Factor Confirmation:**

- Requires exact User ID (UID) confirmation
- Requires exact email address confirmation
- Both must match current user data exactly

**API Security:**

- Uses authenticated API calls to user-worker
- Requires valid API key from keys-worker
- Deletion endpoint validates authentication before processing

**Demo Account Protection:**

```typescript
// Deletion disabled for demo accounts
disabled={!permitted || !isConfirmationValid || isDeleting}
```

## API Security

### Worker Authentication

All Cloudflare Workers use custom authentication headers:

```javascript
// Example from workers/user-worker/src/user-worker.js
async function authenticate(request, env) {
  const authKey = request.headers.get('X-Custom-Auth-Key');
  if (authKey !== env.USER_DB_AUTH) throw new Error('Unauthorized');
}
```

### CORS Configuration

Strict CORS policies implemented across all workers:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.striae.org',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};
```

### API Key Management

API keys are managed through the Keys Worker:

```typescript
// app/utils/auth.ts
async function getApiKey(keyType: KeyType): Promise<string> {
  const response = await fetch(`${KEYS_URL}/${keyType}`, {
    headers: {
      'X-Custom-Auth-Key': KEYS_AUTH
    }
  });
  return response.text();
}
```

## Data Security

### Signed URLs for Images

Image access is controlled through cryptographically signed URLs:

```javascript
// workers/image-worker/src/image-worker.js
async function generateSignedUrl(url, env) {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(env.HMAC_KEY);
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expiry = Math.floor(Date.now() / 1000) + EXPIRATION;
  url.searchParams.set('exp', expiry);

  const stringToSign = url.pathname + '?' + url.searchParams.toString();
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
  const sig = bufferToHex(new Uint8Array(mac).buffer);

  url.searchParams.set('sig', sig);
  return url.toString();
}
```

### Environment Variable Security

All sensitive configuration is stored as environment variables across the workers:

```typescript
// Environment variables used across workers:
// 
// User Worker:
// - USER_DB_AUTH: User worker authentication token 
// - SL_API_KEY: SendLayer API key for email services
// - R2_KEY_SECRET: Data worker authentication token for cross-worker communication
// - IMAGES_API_TOKEN: Cloudflare Images API token for cross-worker communication
// - USER_DB: KV namespace binding for user data
//
// Data Worker:
// - R2_KEY_SECRET: Data worker authentication token
// - STRIAE_DATA: R2 bucket binding for file storage
//
// Image Worker:
// - API_TOKEN: Cloudflare Images API authentication
// - ACCOUNT_ID: Cloudflare account identifier for Images API
// - HMAC_KEY: HMAC secret key for signed URL generation
//
// Keys Worker:
// - KEYS_AUTH: Keys worker authentication token
// - R2_KEY_SECRET: Referenced for key distribution
// - ACCOUNT_HASH: Account hash for client-side operations
// - IMAGES_API_TOKEN: Referenced for key distribution
// - USER_DB_AUTH: Referenced for key distribution
//
// PDF Worker:
// - BROWSER: Puppeteer browser binding (no auth required)
//
// Turnstile Worker:
// - CFT_SECRET_KEY: Cloudflare Turnstile secret key
```

**Security Notes:**
- All authentication tokens are unique, randomly generated secrets
- KV and R2 bindings are configured in wrangler.jsonc files
- No environment variables are exposed to client-side code
- Keys Worker acts as a secure distribution point for other worker tokens

## Error Handling

### Secure Error Responses

Error handling sanitizes sensitive information:

```typescript
// app/services/firebase-errors.ts
export const handleAuthError = (err: unknown): { message: string; data?: AuthErrorData } => {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
        return { message: 'Invalid credentials' };
      case 'auth/user-not-found':
        return { message: 'No account found with this email' };
      // ... other cases
      default:
        console.error('Firebase Auth Error:', errorData);
        return { message: 'Something went wrong. Please contact support.' };
    }
  }
};
```

### HTTP Status Codes

Proper distinction between authentication and authorization errors:

- **401 Unauthorized**: Authentication failures (invalid credentials)
- **403 Forbidden**: Authorization failures (insufficient permissions)

## Security Configuration

### Firebase Configuration

```typescript
// app/config-example/firebase.ts
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;  
}
```

### Required Environment Setup

1. **Firebase Project**: Configure authentication settings
2. **MFA Setup**: Enable SMS authentication in Firebase Console
3. **Worker Environment Variables**: Set all required secrets
4. **CORS Configuration**: Ensure domain restrictions are properly set

## Development Security Practices

### Local Development

```javascript
// Commented out in production
// connectAuthEmulator(auth, 'http://127.0.0.1:9099');
```

### Testing Authentication

```typescript
// app/utils/mfa.ts includes comprehensive MFA testing instructions
// Test with real phone numbers for SMS verification
// Use Firebase emulator for local development
```

### Secret Management

1. **Never commit secrets**: Use `.env.example` templates
2. **Environment-specific configs**: Separate dev/prod configurations
3. **Key rotation**: Regularly update API keys and secrets
4. **Access logging**: Monitor worker access patterns

## Security Limitations

### Not Currently Implemented

- **Role-Based Permissions**: All authenticated users have same access
- **Rate Limiting**: No request throttling in workers
- **Custom Audit Logging**: No application-level audit trail system
- **API Versioning**: No versioning strategy for breaking changes
- **Account Lockout**: Relies on Firebase default protections

### Cloudflare Worker Logging

While custom audit logging is not implemented, Cloudflare provides built-in logging capabilities for Workers:

**Available Logging Features:**
- **Real-time Logs**: Console logs from workers available in Cloudflare dashboard
- **Request Analytics**: HTTP request metrics, response codes, and performance data
- **Error Tracking**: Automatic capture of worker exceptions and errors
- **Tail Logs**: Live streaming of worker execution logs via `wrangler tail`

**Log Retention Policy:**
- **Real-time Logs**: Available for immediate viewing during development
- **Analytics Data**: Retained for up to 30 days on Pro plans, longer on Enterprise
- **Error Logs**: Captured in Cloudflare's error tracking system
- **Console Logs**: Viewable in real-time but not persistently stored without external logging

**What Gets Logged:**
- Worker execution times and performance metrics
- HTTP request/response details (headers, status codes, response times)
- Console.log() statements from worker code
- Unhandled exceptions and stack traces
- Geographic request distribution and caching metrics

**Limitations:**
- No built-in request payload logging for security reasons
- Console logs are not permanently stored without external log aggregation
- No user action audit trail beyond HTTP request logs
- Limited historical log search capabilities

### Known Considerations

- **SMS Costs**: MFA SMS usage should be monitored
- **User Session Timeout**: Uses Firebase default session handling
- **Inactivity Logout**: Automatically log out users after a period of inactivity
- **Cross-Origin**: CORS restricted to single domain only

## Security Checklist for New Features

### Before Adding New Endpoints

- [ ] Implement proper authentication
- [ ] Add CORS headers
- [ ] Validate input data
- [ ] Use appropriate HTTP status codes
- [ ] Add error handling
- [ ] Test with invalid/malicious inputs

### Before Deploying

- [ ] Review environment variables
- [ ] Test authentication flows
- [ ] Verify CORS restrictions
- [ ] Check error message sanitization
- [ ] Validate permission checks

## Incident Response

### If Security Issue Discovered

1. **Immediate**: Disable affected endpoints if possible
2. **Assessment**: Determine scope and impact
3. **Communication**: Notify stakeholders
4. **Fix**: Implement and test solution
5. **Deploy**: Push fixes to production
6. **Post-mortem**: Document lessons learned

### Monitoring

Current monitoring capabilities include:

- **Console Logs**: Monitor worker logs for errors through Cloudflare dashboard
- **Firebase Console**: Check authentication metrics and user activity
- **Cloudflare Analytics**: Monitor traffic patterns, request volumes, and geographic distribution

**Accessing Cloudflare Worker Logs:**

```bash
# Real-time log streaming during development
wrangler tail --name striae-users
wrangler tail --name striae-images

# View logs in Cloudflare Dashboard:
# 1. Navigate to Workers & Pages
# 2. Select specific worker
# 3. Go to "Logs" tab for real-time view
# 4. Use "Analytics" tab for historical metrics
```

**Log Analysis Recommendations:**

- Monitor authentication failure patterns
- Track API response times and error rates
- Review geographic access patterns for anomalies
- Set up external log aggregation for long-term storage if needed

**Available Metrics:**
- Request count and error rates by worker
- Response time percentiles and performance trends
- Geographic distribution of requests
- Cache hit/miss ratios for static assets
