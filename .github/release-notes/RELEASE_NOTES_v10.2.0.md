# Striae Release Notes - v10.2.0

**Release Date**: August 22, 2026
**Period**: August 22, 2026 (same-day)
**Total Commits**: 4 (non-merge since the v10.1.1 release)

## Minor Release - Encryption Modularization

## Summary

v10.2.0 is a same-day internal refactor release that consolidates the RSA-OAEP + AES-256-GCM encryption primitives and key-candidate fallback logic previously duplicated across the audit, data, image, files, and user workers (5-6x each) into shared modules under `shared/crypto/` and `shared/registry/key-candidates.ts`. The frontend export-encryption utility's public-key/base64url side now delegates to the same shared primitives while keeping its exact existing public API. This is a pure internal code-location refactor: no worker secrets, environment variable names, or `wrangler.jsonc` bindings changed, and each worker's storage shape (JSON string vs binary vs user-KV inline-ciphertext record) and exact error-message wording are preserved. It also adds a redeploy-only configuration checkpoint validation step to the deploy script and includes routine dependency maintenance.

## Detailed Changes

### Encryption Modularization (Internal Refactor)

- **Shared Crypto Primitives** - Added `shared/crypto/base64url.ts`, `shared/crypto/rsa-oaep-public.ts` (encrypt-only, safe for `app/` + workers), and `shared/crypto/rsa-oaep-private.ts` (decrypt/unwrap, worker-only, never imported from `app/`) to consolidate the duplicated RSA-OAEP + AES-256-GCM logic.
- **Shared Key-Candidate Registry Logic** - Added `shared/registry/key-candidates.ts`, centralizing `buildPrivateKeyCandidates` (record-key → active-key → remaining-keys, deduped) and `logKeyRegistryDecryptionTelemetry` (scope is now a caller-supplied param instead of a hardcoded per-worker string).
- **Worker Wrapper Refactor** - Each worker's `encryption-utils.ts` (or `crypto/data-at-rest.ts` for the audit worker) is now a thin wrapper over the shared primitives, preserving its own storage shape and exact existing error-message wording via an optional `keyLabel` param on the shared parse/import/wrap/unwrap/encrypt/decrypt functions (default `'Encryption'`; the user worker passes `'User KV encryption'` for all its calls, preserving pre-existing behavior).
- **Frontend Export Encryption** - `app/utils/forensics/export-encryption.ts` now delegates its base64url and public-key primitives to the shared modules, with its public API (function names) unchanged so existing callers and tests are unaffected.
- **Type Re-Exports** - `PrivateKeyRegistry` and `DecryptionTelemetryOutcome` types are now re-exported from `shared/registry/key-candidates.ts` in every worker's `types.ts` instead of being redefined locally; `DataAtRestEnvelope` is re-exported from `shared/crypto/rsa-oaep-private.ts`.
- **New Encryption Test Coverage** - Added `tests/workers/image/` and `tests/workers/files/` (mirroring the existing `tests/workers/data/` `cloudflareTest` pattern), giving the image and files workers encryption test coverage they previously lacked. Added shared-module tests under `tests/workers/data/` for the new base64url/rsa-oaep-public/rsa-oaep-private/key-candidates modules.
- **No External Contract Changes** - No worker secrets, environment variable names, or `wrangler.jsonc` bindings changed; verified via a client-bundle grep that no private-key-capable symbol names leak into the browser bundle.

### Deploy Script Enhancement

- **Redeploy-Only Configuration Checkpoint** - `scripts/deploy-all.sh --redeploy-only` now runs `deploy-config.sh --validate-only` before proceeding, failing fast with guidance if the existing configuration is missing values expected by the current templates, instead of silently redeploying with stale configuration.

### Dependency Maintenance

- Bumped `@cloudflare/workers-types` and the data worker's `@cloudflare/vitest-pool-workers`, and applied minor whitespace cleanup in `package.json`.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.1.1.md
- **Commits Included**: 4 (non-merge commits from 2026-08-22)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.0 is a behavior-preserving internal refactor that eliminates significant duplication in the encryption code paths across all workers and the frontend export-encryption utility, making the shared cryptographic primitives and key-candidate fallback logic easier to maintain and audit going forward without changing any external contracts.
