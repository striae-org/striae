# Striae Release Notes - v10.1.1

**Release Date**: August 22, 2026
**Period**: August 21, 2026 to August 22, 2026
**Total Commits**: 4 (non-merge since the v10.1.0 release)

## Patch Release - Manifest Signing Authorization Fix and UI Refinements

## Summary

v10.1.1 is a follow-up correction to the forensic signing authorization hardening released in v10.0.0: the data worker was missing the service binding to the user worker that its server-side case-authorization check depends on, causing forensic manifest/confirmation/audit-export signing requests to fail with a 502 instead of being authorized. This release restores the binding so the fix actually takes effect. It also includes a couple of UI refinements — corrected `supportLevel`/`subClass` label positioning on the canvas and login screen, and removal of the audit-write-failure warning toast from the login screen — plus a deploy-config script fix for Firebase config placeholder replacement.

## Detailed Changes

### Manifest Signing Authorization Fix (Security/Reliability Fix)

- **Missing User Worker Service Binding** - `workers/data-worker/src/forensic-authorization.ts`'s `requireCaseAccess()` calls `env.USER_WORKER.fetch(...)` to authorize case access as the server-side enforcement for the v9.0.0 forensic signing authorization gap (GHSA-qgj2-x8xw-v75r). `USER_WORKER` was declared in the data worker's types but the worker's `wrangler.jsonc`/`wrangler.jsonc.example` never declared the corresponding `services` binding, so the authorization check had no user worker to call.
- **Symptom** - Forensic manifest/confirmation/audit-export signing requests (`/api/forensic/sign-manifest`, `/sign-confirmation`, `/sign-audit-export`) failed with an opaque 502 ("Failed to sign forensic manifest: 502") because the missing binding caused `requireCaseAccess()` to catch a "User service not configured" error and return it as a 502, which the Pages proxy forwarded through unchanged.
- **Fix** - Added the `USER_WORKER` `services` binding to `workers/data-worker/wrangler.jsonc.example`, and wired `USER_WORKER_NAME` substitution and validation into `scripts/deploy-config/modules/scaffolding.sh` and `validation.sh` so fresh deploy-config runs generate the binding correctly going forward.

### UI Refinements

- **`supportLevel`/`subClass` Label Positioning Fix** - Fixed layout so canvas and route flex containers correctly constrain to their available height, resolving positioning issues with the `supportLevel` and `subClass` labels.
- **Login Screen Audit Warning Removal** - Removed the audit-write-failure warning toast from the login screen (added in v10.1.0) so it no longer surfaces there; the warning remains active in the main workspace.

### Deploy Script Fix

- **Firebase Config Placeholder Replacement** - Fixed `scripts/deploy-config/modules/scaffolding.sh` and `validation.sh` to match Firebase placeholder tokens regardless of single- or double-quote style, so `app/config/firebase.ts` is populated correctly whether the file was freshly copied from the template or previously generated.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.1.0.md
- **Commits Included**: 4 (non-merge commits from 2026-08-21 through 2026-08-22)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.1.1 closes out the loop on the v9.0.0/v10.0.0 forensic signing authorization hardening by restoring the missing data-worker-to-user-worker service binding that the server-side case-authorization check relies on — without it, the check itself couldn't run. Alongside that fix, this patch tidies up label positioning and login-screen warning behavior, and corrects a deploy-config script edge case in Firebase placeholder replacement.
