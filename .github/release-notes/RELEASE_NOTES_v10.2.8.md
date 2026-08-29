# Striae Release Notes - v10.2.8

**Release Date**: August 29, 2026
**Period**: August 28, 2026 - August 29, 2026
**Total Commits**: 4 (non-merge since the v10.2.7 release)

## Patch Release - Deploy GUI Binary Asset Fix, npm Toolchain Peer-Dependency Correction, and License Audit Refresh

## Summary

v10.2.8 is a small follow-up patch to v10.2.7. It fixes a static-asset corruption bug in the deploy GUI's local server, corrects a Cloudflare toolchain peer-dependency mismatch so `npm install` works without `--legacy-peer-deps`, refreshes the third-party license audit and compatibility dates to match, and adds the Socket badge version bump to the release workflow itself going forward.

## Detailed Changes

### Deploy GUI Static Asset Fix

- **Binary Asset Corruption Fix (Bug Fix)** - Fixed `scripts/deploy-gui/server.mjs`'s static-file handler, which previously read every served file (including binary assets like images and fonts) with `readFile(resolved, 'utf8')`. Only `index.html` now uses text-mode reading (needed for its token substitution); all other static files are read as a raw buffer so binary assets are no longer corrupted when served by the deploy GUI.

### npm Toolchain Peer-Dependency Correction

- **Legacy Peer Deps Removed** - `npm run striae-install` and `npm run striae-clean-install` now run plain `npm install` instead of `npm install --legacy-peer-deps`, and `scripts/generate-third-party-licenses.cjs`'s reproducible-install step dropped the same flag.
- **Cloudflare Toolchain Pinned for Peer Compatibility** - Since `@react-router/cloudflare` still only peers on `@cloudflare/workers-types@^4.x` while Wrangler moved to `@cloudflare/workers-types@v5` starting at `wrangler@4.108.0`, the root `package.json` now pins `wrangler` to `~4.107.1`, `@cloudflare/vite-plugin` to `~1.43.1`, `@cloudflare/vitest-pool-workers` to `~0.18.0`, and `@cloudflare/workers-types` to `^4.20260702.1` so a plain `npm install` resolves cleanly without peer conflicts.
- **Compatibility-Date Rollback** - Because the pinned Wrangler line has a lower maximum supported compatibility date, `compatibility_date` was rolled back to `2026-07-08` in `wrangler.toml.example` and all worker `wrangler.jsonc.example` files to stay within the supported range.
- **Additional npm Overrides/Resolutions** - Added `overrides`/`resolutions` entries routing several small transitive dependencies (`es-define-property`, `es-set-tostringtag`, `function-bind`, `gopd`, `has-symbols`, `has-tostringtag`, `hasown`, `isarray`, `safe-buffer`) to their `@socketregistry/*` equivalents.
- **Deploy GUI Action Description Update** - Updated the "Install root dependencies" action description in `scripts/deploy-gui/actions.mjs` to match the plain `npm install` command.

### License Audit and Lockfile Refresh

- **Third-Party License Audit Refresh** - Regenerated `THIRD_PARTY_LICENSES.md` against the corrected dependency tree.
- **Lockfile Cleanup** - Refreshed `package-lock.json` to match the corrected `package.json` dependency set.

### Release Workflow Update

- **Socket Badge Version Bump Added to Release Checklist** - Updated `.github/copilot-instructions.md` so the version-bump workflow now also updates the Socket badge version at the top of `.github/README.md` alongside the changelog entry.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.7.md
- **Commits Included**: 4 (non-merge commits from 2026-08-28 through 2026-08-29)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.8 is a housekeeping patch: it closes a binary-asset corruption bug in the deploy GUI, restores a clean plain-`npm install` experience by pinning the Cloudflare toolchain to a mutually peer-compatible version set, and refreshes the license audit and compatibility-date metadata to match, all without changing runtime application behavior.
