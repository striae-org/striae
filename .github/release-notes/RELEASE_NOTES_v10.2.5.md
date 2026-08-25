# Striae Release Notes - v10.2.5

**Release Date**: August 25, 2026
**Period**: August 25, 2026 (same-day)
**Total Commits**: 3 (non-merge since the v10.2.4 release)

## Patch Release - RSA-3072 Key Rotation Migration + Dependency Maintenance

## Summary

v10.2.5 is a same-day security-hardening patch. It raises the modulus length used for all future self-generated RSA key pairs (manifest signing, export encryption, data-at-rest encryption, and user KV encryption) from RSA-2048 to RSA-3072, and refreshes a small set of root and worker dependencies. No API contracts, storage formats, or existing deployed keys are affected; the change governs key generation for future rotations only.

## Detailed Changes

### RSA-3072 Key Rotation Migration (Security)

- **Shared Modulus Length Constant** - Added a single `RSA_KEY_MODULUS_LENGTH=3072` variable in `scripts/deploy-config/modules/keys.sh` and updated all four self-generated RSA key-pair generation routines (`generate_manifest_signing_key_pair`, `generate_export_encryption_key_pair`, `generate_data_at_rest_encryption_key_pair`, `generate_user_kv_encryption_key_pair`) to reference it instead of a hardcoded `modulusLength: 2048`.
- **Scope** - This change affects only newly generated key pairs going forward (fresh deploys and future key rotations via deploy-config). Existing already-deployed RSA-2048 key material continues to function unchanged until rotated.

### Dependency and Compatibility Maintenance

- **Root Dependency Bumps** - Bumped `@cloudflare/vite-plugin` (`1.53.1` → `1.54.0`), `@cloudflare/workers-types` (`5.20260823.1` → `5.20260825.1`), and `wrangler` (`4.125.0` → `4.126.0`) in the root `package.json`.
- **Worker Dependency Bumps** - Bumped `wrangler` to `4.126.0` across all six workers (`audit-worker`, `data-worker`, `files-worker`, `image-worker`, `lists-worker`, `pdf-worker`, `user-worker`) with matching `package-lock.json` refreshes.
- **Compatibility-Date Refresh** - Updated `compatibility_date` to `2026-08-25` in `wrangler.toml.example` and all worker `wrangler.jsonc.example` files.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.4.md
- **Commits Included**: 3 (non-merge commits from 2026-08-25)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.5 is a security-hardening and dependency-maintenance patch. Existing deployed RSA-2048 keys are unaffected; the RSA-3072 modulus length applies to newly generated key pairs from this point forward.
