# Striae Release Notes - v8.0.0

**Release Date**: June 7, 2026
**Period**: May 23, 2026 through June 7, 2026
**Total Commits**: 11 (non-merge after the v7.1.3 release)

## Major Release - Key Registry R2 Migration and React Router v8 Opt-In

## Summary

v8.0.0 is a major release that migrates cryptographic key registries from environment secrets to encrypted R2 storage, overcoming the 5.1 kB per-secret size limit and enabling centralized key management across all workers. This release also opts in to all available React Router v8 future flags, preparing the application for seamless framework migration. Supporting changes include a shared case export loader, automated registry upload tooling, and routine dependency maintenance.

## Detailed Changes

### Key Registry Migration to R2

- Introduced a shared R2-based key registry module (`shared/registry/r2-key-registry.ts`) that fetches key registries from a centralized R2 config bucket instead of per-worker environment secrets, resolving the 5.1 kB secret size constraint for growing key sets.
- Added AES-256-GCM encryption at rest for registry files (`shared/registry/registry-encryption.ts`) using a shared `REGISTRY_ENCRYPTION_KEY`, ensuring private key material remains encrypted in storage.
- Migrated all affected workers (data, image, audit, user) to consume key registries from R2, replacing inline environment variable lookups with the shared R2 registry module.
- Scoped registry files by purpose: `data-at-rest-keys.json`, `export-encryption-keys.json`, `manifest-signing-keys.json`, and `user-kv-encryption-keys.json`.
- Updated `wrangler.jsonc.example` across all workers to include the R2 config bucket binding and `REGISTRY_ENCRYPTION_KEY` secret.
- Added comprehensive unit tests for the R2 key registry and registry encryption modules (`tests/workers/data/key-registry.test.ts`, `tests/workers/data/registry-encryption.test.ts`).

### Registry Upload and Encryption Tooling

- Added `scripts/encrypt-registry.mjs` for offline AES-256-GCM encryption of registry JSON files before upload.
- Added `scripts/upload-registries.sh` for automated extraction and upload of key registry files to the R2 config bucket, with dry-run support.
- Updated `scripts/deploy-worker-secrets.sh` and deploy-config modules to register the new `REGISTRY_ENCRYPTION_KEY` secret and R2 bucket binding in scaffolding.

### React Router v8 Future Flags

- Enabled all React Router v8 future flags in `react-router.config.ts`: `v8_middleware`, `v8_splitRouteModules`, `v8_viteEnvironmentApi`, `v8_passThroughRequests`, and `v8_trailingSlashAwareDataRequests`.
- This early opt-in prepares the application for a seamless upgrade to React Router v8 when it ships as stable.

### Shared Case Export Loader

- Extracted case export action loading into a shared lazy-import utility (`app/utils/data/operations/case-export-loader.ts`) to reduce initial bundle size and deduplicate import logic across case export surfaces.
- Refactored `app/routes/striae/utils/case-export.ts` and `app/components/actions/case-manage/operations.ts` to use the shared loader.

### Label Auto-Generation Fix

- Fixed a label auto-generation issue in case operations (`fix label auto generation`).

### Dependency and Tooling Maintenance

- Refreshed app and worker dependencies, including package-lock maintenance across the main app and all worker packages (`bump deps package refresh`, `package refresh`, `worker package installs`).

## Breaking Changes

- **Key Registry Source**: Workers now expect key registries to be stored in the R2 config bucket rather than as environment secrets. Deployments must run `scripts/upload-registries.sh` (or equivalent) to populate registries before the upgrade, and configure the `CONFIG_BUCKET` R2 binding plus `REGISTRY_ENCRYPTION_KEY` secret on each worker.

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v7.1.3.md`
- **Commits Included**: 11 (non-merge commits after `v7.1.3` on 05/23/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.0.0 establishes a scalable foundation for cryptographic key management by moving registries to encrypted R2 storage, and positions the application for React Router v8 by activating all forward-looking future flags. Deployments should follow the updated deploy-config steps to provision R2 buckets and upload encrypted registries before upgrading.
