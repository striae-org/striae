# Striae Release Notes - v9.0.1

**Release Date**: August 7, 2026
**Period**: August 4, 2026 to August 7, 2026
**Total Commits**: 6 (non-merge after the v9.0.0 release)

## Patch Release - Admin-Service Guard Enforcement for Build and Deploy

## Summary

v9.0.1 is a patch release focused on the admin-service guard used during build and deployment. It tightens the release pipeline so deployments fail fast when admin-service credentials are tracked in source control or leak into public/build artifacts, and it keeps the release metadata aligned with the hardened deployment checks.

## Detailed Changes

### Admin-Service Guard Hardening

- Tightened the admin-service security guard so the build and deployment workflow now enforces the same protection path during release execution.
- Ensured the guard runs as part of the worker deployment and Pages deployment flows, preventing insecure releases from proceeding when credential material is exposed.
- Kept the admin-service guard behavior aligned with the stricter deployment expectations for build-time validation.

### Release and Packaging Alignment

- Updated package and worker package versions to v9.0.1.
- Refreshed release documentation and supported-version metadata to reflect the new patch release.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v9.0.0.md
- **Commits Included**: 6 (non-merge commits from 2026-08-04 through 2026-08-07)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v9.0.1 strengthens the release pipeline around admin-service credential handling so builds and deployments fail closed when the guard detects unsafe exposure.
