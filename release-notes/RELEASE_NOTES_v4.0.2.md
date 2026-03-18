# Striae Release Notes - v4.0.2

**Release Date**: March 17, 2026
**Period**: March 15 - March 17, 2026
**Total Commits**: 18 (non-merge; post-v4.0.1 stabilization, dependency maintenance, and PDF worker/deploy updates)

## Patch Release - Stabilization, Dependency Maintenance, and Operational Cleanup

## Summary

- Stabilized PDF worker behavior through hardening attempts followed by controlled same-window reverts.
- Fixed an error-boundary loop regression path to improve failure-mode handling reliability.
- Performed dependency maintenance across runtime and type package surfaces.
- Reorganized shared utility/API structure and refreshed compatibility-date metadata.
- Updated deployment/key metadata surfaces, including key cleanup and PDF/deploy-config refinements.

## Detailed Changes

### PDF Worker and Deployment Stabilization

- Applied targeted PDF worker timeout and hardening updates.
- Performed immediate reverts on hardening paths that risked runtime instability.
- Finalized release-window updates for PDF worker and deploy-config alignment.

### Reliability and Runtime Behavior

- Fixed an error-boundary loop issue to prevent repeated fallback recursion behavior.
- Captured operational redeploy follow-up commits during stabilization.

### Dependency and Package Surface Maintenance

- Bumped dependency baselines and refreshed selected package versions.
- Updated React type dependencies (`@types/react`, `@types/react-dom`) and `isbot`.
- Updated npm package metadata links and related package configuration surfaces.

### Utilities, Config, and Key Surface Updates

- Reorganized shared utils and API modules for clearer structure.
- Updated worker compatibility-date metadata.
- Removed outdated key material and added `keybase.txt`.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| PDF Runtime Stability | Hardening and timeout iteration with controlled reverts | Preserves stable behavior while containing risky runtime deltas |
| Error Handling | Error boundary loop fix | Reduces recursive fallback risk under failure conditions |
| Dependency Hygiene | Runtime and type package updates | Keeps dependency surface current and aligned |
| Utilities and Config | Utility/API reorganization and compatibility-date refresh | Improves maintainability and config consistency |
| Deployment/Key Metadata | Deploy-config and key metadata cleanup | Reduces stale operational artifacts and key-surface drift |

## Technical Implementation Details

### Worker Runtime Layer

- PDF worker timeout/hardening commits were introduced and then reverted where necessary to maintain operational stability.
- Deploy-config and PDF worker updates were consolidated at the end of the release window.

### App Reliability Layer

- Error boundary fallback behavior was patched to avoid loop-prone error handling paths.

### Package and Tooling Layer

- Dependency and type updates were applied across package manifests.
- Package metadata links and compatibility-date values were refreshed.

## Release Statistics

- **Commit Range**: `v4.0.1..v4.0.2`
- **Commits Included**: 18 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Succeeded with warnings (`npm run lint`: 0 errors, 14 warnings)

## Closing Note

v4.0.2 delivers a stabilization-focused patch release that captures PDF worker hardening iteration, reliability fixes, and dependency/config maintenance while preserving runtime safety established in prior releases.
