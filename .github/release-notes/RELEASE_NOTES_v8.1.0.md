# Striae Release Notes - v8.1.0

**Release Date**: June 20, 2026
**Period**: June 20, 2026 (same-day release following v8.0.1)
**Total Commits**: 14 (non-merge after the v8.0.1 release)

## Minor Release - React Router v8 and ESLint v10 Major Upgrades

## Summary

v8.1.0 upgrades both React Router and ESLint to their next major versions. React Router moves from v7 to v8 with the new `@cloudflare/vite-plugin` replacing the previous `cloudflareDevProxy`, and all v8 future flags enabled in v8.0.0 are now the default behavior. ESLint moves from v9 to v10 with a modernized flat config, replacing legacy compatibility layers and individual parser/plugin packages with the unified `typescript-eslint` config and `@eslint-react/eslint-plugin`. Dependabot configuration is updated to reflect the new ESLint ecosystem packages, and npm packaging scripts are added for streamlined installs.

## Detailed Changes

### React Router v8 Major Bump

- Bumped `react-router`, `@react-router/cloudflare`, `@react-router/dev`, and `@react-router/fs-routes` from v7.18.0 to v8.0.1.
- Replaced `cloudflareDevProxy` from `@react-router/dev/vite/cloudflare` with `cloudflare()` from the new `@cloudflare/vite-plugin` package (v1.42.1).
- Removed the `load-context.ts` import from `vite.config.ts` as the new plugin handles context automatically.
- Removed all v8 future flags (`v8_middleware`, `v8_splitRouteModules`, `v8_viteEnvironmentApi`, `v8_passThroughRequests`, `v8_trailingSlashAwareDataRequests`) from `react-router.config.ts` as they are now default behavior in v8.

### ESLint v10 Major Bump

- Bumped `eslint` from v9.39.4 to v10.5.0.
- Replaced `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` with the unified `typescript-eslint` (v8.61.1) config package.
- Added `@eslint-react/eslint-plugin` (v5.9.1) replacing `eslint-plugin-react`.
- Replaced `eslint-plugin-import` with `eslint-plugin-import-x` (v4.16.2).
- Added `@eslint/js` (v10.0.1) and `globals` (v17.6.0) as direct dependencies.
- Rewrote `eslint.config.js` from `FlatCompat`-based legacy config to a modern `tseslint.config()` flat config using native ESLint v10 patterns.
- Removed the legacy `.eslintrc.cjs` file.
- Applied lint corrections across 13 source files to resolve new rule violations from the upgraded plugin set.

### Dependabot Configuration Update

- Removed the ESLint v10 ignore rule (no longer blocked by plugin peer declarations).
- Updated ESLint ecosystem group patterns to include `@eslint/*`, `@eslint-react/*`, `typescript-eslint`, and `globals`.
- Removed stale `vite-node` esbuild override from `package.json` overrides.

### npm Packaging and Install Scripts

- Added `striae-install` script for `--legacy-peer-deps` installs.
- Added `striae-clean-install` script for fresh node_modules rebuilds.
- Added `strip-modules` script to remove all `node_modules` and lockfiles across root and workers.
- Updated `deploy` script to clean stale `build/client/wrangler.json` and `.wrangler/deploy` before Pages deploy.
- Added `eslint.config.js` and `!workers/*/dist` to npm package files list.
- Restored `@cloudflare/workers-types` as a direct dev dependency.

### Dependency and Tooling Maintenance

- Refreshed app and worker package-lock files.
- Bumped `wrangler` to v4.103.0, `typescript` to v6.0.3, and `vite` to v8.0.16.

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v8.0.1.md`
- **Commits Included**: 14 (non-merge commits after `v8.0.1` on 06/20/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.1.0 brings the framework and linting toolchain to their latest major versions, completing the React Router v8 migration that was prepared with future flags in v8.0.0 and adopting ESLint v10's native flat config patterns for a cleaner, faster lint pipeline.
