# Striae Release Notes - v7.1.3

**Release Date**: May 23, 2026
**Period**: May 8, 2026 through May 23, 2026
**Total Commits**: 15 (non-merge after the v7.1.2 release)

## Patch Release - Dependency Refreshes and Import Fix

## Summary

v7.1.3 is a patch release focused primarily on dependency and tooling maintenance, with a small follow-up fix to static import handling. This release also includes a protobufjs security update, refreshed Cloudflare compatibility dates, and routine package-lock maintenance across the app and workers.

## Detailed Changes

### Static Import Fix

- Fixed a static import issue in a post-maintenance follow-up commit (`fix static import`).

### Dependency and Tooling Maintenance

- Refreshed app and worker dependencies, including npm package updates and lockfile maintenance (`npm refresh`, `package lock refresh`, `npm package refresh`, `bump deps`).
- Updated testing and build tooling, including Vite, Vitest, `@vitest/coverage-v8`, and `@cloudflare/vitest-pool-workers`.
- Bumped the Wrangler ecosystem dependencies and refreshed Cloudflare compatibility dates (`upd compat dates`).
- Updated the ESLint ecosystem packages in the maintenance window.

### Security Maintenance

- Bumped `protobufjs` from `7.5.6` to `7.6.1` to address the upstream security update.

### Code Review Follow-Up

- Included a targeted code review follow-up commit in the same patch window (`code review`).

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v7.1.2.md`
- **Commits Included**: 15 (non-merge commits after `v7.1.2` on 05/07/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v7.1.3 is a maintenance-oriented patch release with one small post-refresh import fix. The main focus is keeping dependencies, tooling, and compatibility metadata current while preserving runtime stability.
