# Striae Release Notes - v8.1.4

**Release Date**: July 31, 2026
**Period**: July 20, 2026 to July 31, 2026
**Total Commits**: 9 (non-merge commits since July 19, 2026)

## Patch Release - Dependency and Lint Maintenance, Compatibility-Date Refresh, and License Inventory Regeneration

## Summary

v8.1.4 is a patch release focused on maintenance and release-window hardening. It applies dependency and install metadata refreshes across the app and workers, corrects lint and override configuration issues, updates Cloudflare compatibility-date examples, regenerates the third-party license inventory, and includes review-driven follow-up fixes.

## Detailed Changes

### Dependency and Package Maintenance

- Refreshed root and worker package metadata (`package.json`/`package-lock.json`) as part of routine maintenance and install alignment.
- Applied npm override corrections to keep lint and dependency resolution stable.
- Included a short wrangler-ecosystem bump and immediate revert in the same release window, resulting in no net retained change from that attempted update.

### Lint Configuration and Review Follow-Ups

- Applied targeted ESLint configuration fixes to address lint-tooling regressions discovered during the maintenance cycle.
- Included small review-driven app follow-ups in canvas and sidebar container components.

### Cloudflare Compatibility-Date Refresh

- Updated compatibility-date examples across all workers and the root Wrangler example configuration:
  - `workers/audit-worker/wrangler.jsonc.example`
  - `workers/data-worker/wrangler.jsonc.example`
  - `workers/image-worker/wrangler.jsonc.example`
  - `workers/lists-worker/wrangler.jsonc.example`
  - `workers/pdf-worker/wrangler.jsonc.example`
  - `workers/user-worker/wrangler.jsonc.example`
  - `wrangler.toml.example`

### Third-Party License Inventory Regeneration

- Regenerated `THIRD_PARTY_LICENSES.md` to keep the published license inventory synchronized with the current production dependency graph.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v8.1.3.md
- **Commits Included**: 9 (non-merge commits from 2026-07-20 through 2026-07-31)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.1.4 keeps the project current and release-ready through focused dependency, lint, and configuration maintenance while preserving the licensing and worker-configuration hygiene introduced in recent patch cycles.
