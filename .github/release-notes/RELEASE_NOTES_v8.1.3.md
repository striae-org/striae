# Striae Release Notes - v8.1.3

**Release Date**: July 19, 2026
**Period**: July 13, 2026 to July 19, 2026
**Total Commits**: 2 (non-merge after the v8.1.2 release)

## Patch Release - Third-Party Attribution, License Inventory, Lint Toolchain Fix, and Dependency Refresh

## Summary

v8.1.3 is a patch release that adds formal third-party attribution and license inventory files to the repository, introduces a generation script for the third-party license report, restores the ESLint toolchain by reverting TypeScript to a version compatible with `typescript-eslint`, and refreshes dependencies across the app and worker toolchain along with Wrangler example compatibility dates.

## Detailed Changes

### Third-Party Attribution and License Inventory

- Added a top-level `NOTICE` file recording attribution-relevant Apache-2.0 components (Firebase SDK family, gRPC and related transitive dependencies) and multi-license production dependencies (`jszip` under MIT OR GPL-3.0-or-later, `pako` under MIT AND Zlib).
- Added a `THIRD_PARTY_LICENSES.md` inventory containing the full per-package license texts for the resolved production dependency graph.
- Added `scripts/generate-third-party-licenses.cjs` and the `generate:third-party-licenses` npm script to reproducibly regenerate the license inventory via an isolated production dependency scan.
- Registered `NOTICE` and `THIRD_PARTY_LICENSES.md` in the npm package files allowlist so the attribution artifacts ship with the published package.

### Lint Toolchain Fix

- Reverted `typescript` from `^7.0.2` back to `^6.0.3`. The TypeScript 7 native port introduced in v8.1.2 ships a minimal programmatic API (`require('typescript')` no longer exposes `Extension`, `ModuleKind`, or `createProgram`), which crashed `@typescript-eslint/typescript-estree` during `npm run lint`. No published `typescript-eslint` version (peer `typescript >=4.8.4 <6.1.0`) supports TypeScript 7 yet, so reverting to TypeScript 6.0.3 restores a working lint step while keeping `tsc` typecheck and the build unaffected.

### Dependency Refresh

- Bumped root application dependencies including `isbot`, `@cloudflare/vite-plugin`, `@cloudflare/workers-types`, `@eslint-react/eslint-plugin`, `firebase-admin`, `vite`, and `wrangler`, and refreshed `package-lock.json`.
- Added an `allowScripts` allowlist to `package.json` for the install-script packages required in the production dependency graph.
- Bumped `wrangler` across the audit, data, image, lists, pdf, and user workers and `@cloudflare/vitest-pool-workers` in the data worker, refreshing each worker `package-lock.json`.
- Updated Wrangler example compatibility dates across the audit, data, image, lists, pdf, and user workers and the root `wrangler.toml.example`.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v8.1.2.md
- **Commits Included**: 2 (non-merge commits after v8.1.2 on 2026-07-13)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.1.3 strengthens the project's license compliance posture with formal attribution and inventory files and keeps the dependency graph current ahead of the next development window.
