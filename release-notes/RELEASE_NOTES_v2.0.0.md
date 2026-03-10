# Striae Release Notes - v2.0.0

**Release Date**: March 5, 2026
**Period**: March 4 - March 5, 2026
**Total Commits**: 6 (non-merge; backend Firebase Auth user deletion, required admin-service credential sourcing, deployment automation hardening, compatibility-date refresh, env/config example updates)

## Major Release - Backend Auth Deletion and Admin Credential Standardization

## Backend Firebase Auth Account Deletion

### User Worker Auth Lifecycle Enforcement

- Added backend Firebase service-account OAuth flow in user worker to obtain Google access tokens.
- Added Firebase Identity Toolkit account deletion call (`projects/{projectId}/accounts:delete`) using `localId`.
- Wired Firebase Auth deletion into the account deletion pipeline before KV/case cleanup to prevent orphaned auth accounts.
- Added explicit private-key format validation and actionable error messaging for PKCS8 parsing failures.

## Admin Service Credential Source of Truth

### Required `app/config/admin-service.json` Integration

- Updated `deploy-config.sh` to require `app/config/admin-service.json`.
- Auto-imported `project_id`, `client_email`, and `private_key` into `.env` for worker usage.
- Removed interactive prompting for Firebase service-account email/private key.
- Preserved existing `app/config/admin-service.json` during `--update-env` config resets.

### Worker Secret Deployment Alignment

- Updated `deploy-worker-secrets.sh` to require and parse `app/config/admin-service.json`.
- Ensured User Worker secrets for `PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_EMAIL`, and `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` are sourced from JSON and validated before deployment.

## Config and Example Synchronization

- Added service-account env placeholders to `.env.example`.
- Added `app/config-example/admin-service.json` template for consistent setup.
- Updated compatibility dates in worker `wrangler.jsonc.example` files and `wrangler.toml.example`.
- Updated `workers/user-worker/src/user-worker.example.ts` to reflect backend Firebase Auth deletion support.

## Route Experiment Rollback

- Included an add/revert cycle for trust/compliance route work during this release window.
- Final release state keeps no net trust/compliance route surface change from that experiment.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Account Deletion | Backend Firebase Auth deletion in User Worker | User deletion now removes authentication records as well as case/KV data |
| Credential Management | Required admin-service JSON as source of truth | Reduces manual secret-entry errors and key-format mismatches |
| Deployment Safety | Pre-deploy JSON validation for service-account fields | Fails early on invalid/missing credentials |
| Config Consistency | Env/example and compatibility-date updates | Cleaner onboarding and synchronized worker examples |

## Technical Implementation Details

### Application/Worker Layer

- Added service-account JWT signing and OAuth token exchange for Google API access in User Worker.
- Added Firebase account deletion API integration and improved key-parsing resilience in worker templates.

### Deployment Layer

- Centralized service-account credential loading in setup/deploy scripts from `app/config/admin-service.json`.
- Removed duplicate Firebase service-account prompt paths in deploy configuration flow.

## Release Statistics

- **Files Modified**: 14
- **Lines Changed**: +371 / -22
- **Commits Included**: 6 (non-merge, `6cfa825..HEAD`)
- **Build Status**: Succeeded (`npm run build`)

## Closing Note

v2.0.0 establishes backend-enforced account lifecycle deletion and standardizes service-account credential sourcing across configuration and worker-secret deployment workflows.
