# Striae Release Notes - v8.1.1

**Release Date**: July 9, 2026
**Period**: June 20, 2026 to July 9, 2026
**Total Commits**: 6 (non-merge after the v8.1.0 release)

## Patch Release - Dependency Refresh and Tooling Alignment

## Summary

v8.1.1 is a patch release focused on dependency refresh and tooling alignment across the app and worker surfaces. The release updates the core build and runtime toolchain to the latest compatible versions, refreshes Cloudflare compatibility dates, keeps package manifests consistent across the root app and all workers, and completes the React 19 lint migration cleanup in the app UI layer.

## Detailed Changes

### Dependency Refresh and Tooling Alignment

- Bumped root application dependencies and dev tooling, including React Router to v8.2.0, Vite to v8.1.4, Wrangler to v4.110.0, Vitest to v4.1.10, and the Cloudflare Vite plugin to v1.44.0.
- Refreshed worker package manifests and Wrangler example configs across the audit, data, image, lists, pdf, and user workers to keep the deployed worker toolchain consistent with the app.
- Updated the root Wrangler example compatibility date to 2026-07-09 and aligned worker package versions with the v8.1.1 release.

### Release Maintenance

- Refreshed package-lock files and worker lockfiles to reflect the updated dependency graph.
- Completed React 19 lint migration cleanup across UI components by migrating context usage/provider syntax, replacing remaining `forwardRef` patterns where appropriate, and resolving lint findings without disabling the active React lint rules.
- Applied the standard patch-release housekeeping required to keep the app and workers in sync after the v8.1.0 rollout.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v8.1.0.md
- **Commits Included**: 6 (non-merge commits after v8.1.0 on 2026-07-09)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.1.1 keeps the platform on a current, supported dependency set while preserving the React Router v8 and ESLint v10 foundation introduced in v8.1.0.
