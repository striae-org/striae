# Striae Release Notes - v8.0.1

**Release Date**: June 20, 2026
**Period**: June 7, 2026 through June 20, 2026
**Total Commits**: 7 (non-merge after the v8.0.0 release)

## Patch Release - Dependency and Tooling Maintenance

## Summary

v8.0.1 is a maintenance patch that bumps `firebase-admin` to its new major version (v14), updates the Wrangler and Cloudflare Vitest pool-workers ecosystem packages, refreshes app and worker dependencies, and applies Dependabot-driven patch updates for esbuild, ESLint TypeScript tooling, Vitest, and isbot. Compatibility dates are refreshed across all workers.

## Detailed Changes

### Firebase Admin SDK Major Bump

- Bumped `firebase-admin` from v13.10.0 to v14.0.0, adopting the latest Firebase Admin Node.js SDK major release for improved stability and upstream alignment.

### Wrangler Ecosystem Update

- Bumped `wrangler` and `@cloudflare/vitest-pool-workers` to their latest versions via the wrangler-ecosystem Dependabot group.

### ESLint Tooling Update

- Bumped `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` from 8.60.1 to 8.61.1 for improved linting coverage and rule refinements.

### Dependency and Tooling Maintenance

- Refreshed app and worker dependencies, including package-lock maintenance across the main app and all worker packages.
- Bumped `esbuild` from 0.27.3 to 0.28.1 across all six worker directories.
- Bumped `vitest` from 4.1.8 to 4.1.9.
- Bumped `isbot` from 5.1.41 to 5.1.43.
- Refreshed Cloudflare compatibility dates across all worker `wrangler.jsonc.example` files and `wrangler.toml.example`.

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v8.0.0.md`
- **Commits Included**: 7 (non-merge commits after `v8.0.0` on 06/07/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.0.1 keeps the dependency tree current with a focus on the Firebase Admin SDK major bump and routine Dependabot-driven maintenance across the app and all workers.
