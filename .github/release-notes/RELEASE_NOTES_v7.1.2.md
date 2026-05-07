# Striae Release Notes - v7.1.2

**Release Date**: May 7, 2026
**Period**: April 28, 2026 through May 7, 2026
**Total Commits**: 3 (non-merge after the v7.1.1 bump)

## Patch Release - Dependency Bumps and Maintenance

## Summary

v7.1.2 is a maintenance release consisting entirely of dependency updates, a Wrangler bump, and a Cloudflare compatibility date refresh across all workers. No feature changes or bug fixes are included.

## Detailed Changes

### Maintenance

- Bumped app and worker npm dependencies (`bump deps`, `npm, worker bump`).
- Updated Wrangler to the latest version (`bump wrangler`).
- Refreshed Cloudflare compatibility dates across all worker `wrangler.jsonc.example` files (`upd compat dates`).

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v7.1.1.md`
- **Commits Included**: 3 (non-merge commits after `v7.1.1` on 04/27/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v7.1.2 is a routine maintenance release with no behavioral changes. All updates are dependency and toolchain bumps to keep the project current.
