# Striae Release Notes - v9.1.1

**Release Date**: August 11, 2026
**Period**: August 10, 2026 to August 11, 2026
**Total Commits**: 7 (non-merge after the v9.1.0 release)

## Patch Release - Script-Based Publish Flow Restoration + Dependency/Compatibility Maintenance + Lists Worker Endpoint Stabilization

## Summary

v9.1.1 is a patch release focused on release-pipeline reliability and maintenance alignment. It restores the script-based publish flow used before v9.1.1, refreshes dependency and compatibility metadata across the app and workers, and applies a lists-worker endpoint stabilization follow-up (including a corrective revert) to keep behavior consistent.

## Detailed Changes

### Release Pipeline and Publishing Alignment

- Restored the pre-v9.1.1 package publish scripts for npmjs and GitHub Packages: `publish:npm`, `publish:github`, and `publish:all`.
- Removed the tag-triggered GitHub Actions publishing path so release publishing returns to the explicit script-based flow used in v9.1.0.

### Dependency and Compatibility Maintenance

- Bumped root and worker dependency metadata and refreshed lockfiles as part of patch-window maintenance.
- Updated Wrangler ecosystem dependencies and compatibility-date examples across worker configuration templates.
- Kept package and worker version metadata synchronized at v9.1.1.

### Lists Worker Endpoint Stabilization

- Applied a targeted lists-worker endpoint follow-up and a corrective revert to preserve stable endpoint behavior.
- Reduced the risk of carrying forward an unintended lists-worker route change during the patch window.

### Release Metadata Alignment

- Updated supported-version metadata and release documentation for the v9.1.1 patch line.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v9.1.0.md
- **Commits Included**: 7 (non-merge commits from 2026-08-10 through 2026-08-11)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v9.1.1 restores the explicit script-based publish workflow used prior to v9.1.1 while keeping dependency and compatibility metadata current across app and worker surfaces and stabilizing lists-worker endpoint behavior through targeted patch-window follow-ups.
