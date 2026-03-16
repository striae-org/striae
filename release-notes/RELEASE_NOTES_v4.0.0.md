# Striae Release Notes - v4.0.0

**Release Date**: March 15, 2026
**Period**: March 14 - March 15, 2026
**Total Commits**: 37 (non-merge; security, API proxy migration, and secret/config hardening; general cleanup and stabilization)

## Major Release - Security, API, and Secret Hardening Migration

## Summary

- Migrated app transport to same-origin Pages API proxy routes with Firebase bearer-token verification at the edge boundary.
- Hardened internal worker authentication paths and upstream proxy header handling across user, data, audit, image, and PDF request surfaces.
- Expanded and standardized secret deployment flow (workers and Pages), including stronger config/secret separation and deployment-script validation.
- Simplified and stabilized worker-domain handling by removing custom-domain injection into worker Wrangler configs while preserving secret-based routing contracts.
- Applied targeted stabilization fixes during migration (header auth semantics, deletion reliability, 500-path corrections, and type generation refresh).

## Detailed Changes

### API Boundary Migration and Authentication Hardening

- Refactored frontend/backend API interactions to route through Pages `/api/*` proxy endpoints instead of direct worker-domain browser calls.
- Added and refined Firebase token retrieval/lookup/verification behavior for API-bound requests.
- Completed phased migration of higher-risk operations and service routes with auth-scoped forwarding behavior.
- Corrected auth-response handling to improve proxy/worker interoperability after migration.

### Secret Management and Deployment Hardening

- Added Pages secret deployment workflow and integrated required secret contracts for proxy routing and worker auth.
- Updated deploy/config scripts to reduce legacy fallback behavior and tighten configuration consistency.
- Strengthened script guidance around generated config, validate-only checks, and deployment ordering.
- Kept worker domains as secret/config inputs for routing and fallbacks, not as worker Wrangler custom-domain replacement values.

### Worker Auth and Route Surface Stabilization

- Removed custom worker route replacement paths from deployment flow where they were causing drift and complexity.
- Iterated worker Access/auth changes, then stabilized with targeted reverts to keep the secure proxy-secret baseline intact.
- Regenerated worker runtime types and aligned migration-era auth/header behavior across workers.

### Reliability, Operations, and Supporting Refinements

- Fixed deletion-operation reliability and upstream error handling in migration call paths.
- Addressed API-path failures (including 500-class regressions) discovered during migration rollout.
- Updated compatibility metadata and preserved release-surface stability through final script and auth cleanups.
- Included in-window UX/supporting updates (for example single-case export progress visibility) alongside security/API migration work.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| API Security Boundary | Same-origin `/api/*` proxy migration with Firebase edge verification | Reduces direct worker exposure and centralizes auth enforcement at the Pages boundary |
| Worker Auth Hardening | Header/auth semantics refined across worker proxy paths | Improves internal service trust enforcement and reduces auth drift/failures |
| Secret and Config Hardening | Pages+worker secret deployment and stricter script validation | Makes deployment safer, more repeatable, and less error-prone |
| Route/Domain Stabilization | Removed worker custom-domain replacement in Wrangler updates | Prevents config churn while preserving secret-driven upstream routing |
| Migration Reliability | Targeted fixes and controlled reverts during rollout | Maintains secure, stable behavior while converging on hardened architecture |

## Technical Implementation Details

### API and Edge Verification Layer

- Migrated service calls in phased sequence to proxy-backed API transport.
- Hardened Firebase token handling and request validation for auth-gated API routes.
- Corrected auth header handling to align Pages proxy and worker enforcement behavior.

### Deployment and Secret Layer

- Added/iterated Pages secret deployment script behavior and required secret inventory.
- Updated deploy-config/deploy-worker-secrets flows for stricter config hygiene and reduced legacy fallback behavior.
- Stabilized worker-domain treatment as secret routing inputs rather than Wrangler replacement targets.

### Worker and Runtime Layer

- Applied worker auth/header fixes across migrated services.
- Regenerated worker runtime types and aligned migration outputs with current contracts.
- Used targeted reverts to preserve secure baseline behavior when intermediate migration paths introduced excess complexity.

## Release Statistics

- **Commit Range**: `v3.3.0..v4.0.0`
- **Commits Included**: 37 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Succeeded with warnings (`npm run lint`: 0 errors, 2 warnings)

## Closing Note

v4.0.0 marks a major architectural hardening milestone: API transport now centers on authenticated edge proxy boundaries, worker auth and secrets are more rigorously managed, and deployment scripts are aligned to a safer secret/config migration model for production operations.
