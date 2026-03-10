# Striae Release Notes - v3.0.4

**Release Date**: March 9, 2026
**Period**: March 9 - March 9, 2026
**Total Commits**: 5 (non-merge; package scope migration, install docs refinements, deploy-config sync hardening, package payload expansion)

## Patch Release - Package Distribution and Deploy Config Refinements

## Summary

- Migrated package identity from `@striae/striae` to `@striae-org/striae` and finalized package version `3.0.4`.
- Expanded package publishing workflows with dedicated npmjs and GitHub Packages publish scripts.
- Updated package payload rules to include worker source files while excluding runtime worker entry files.
- Refined deploy configuration syncing to preserve real admin credentials and avoid copying example `admin-service.json`.
- Updated installation and deployment guidance for the package-based setup path.

## Detailed Changes

### Package Identity and Publishing

- Updated package metadata to `@striae-org/striae` with version `3.0.4`.
- Added `publish:npm` registry targeting for npmjs and introduced `publish:github` / `publish:github:dry-run` scripts.

### Package Payload Coverage

- Expanded npm package file inclusion to publish worker source modules (`workers/*/src/*.ts`).
- Explicitly excluded worker runtime entry files (`workers/*/src/*worker.ts`) from package payload while keeping needed report modules.

### Deploy Config Hardening

- Updated `scripts/deploy-config.sh` to sync non-admin files from `app/config-example` into `app/config` without blindly replacing existing local config.
- Preserved existing `app/config/admin-service.json` when present and prevented copying example credentials into active config.
- Added clearer copy/skip reporting during config synchronization.

### Documentation and Release Surface Updates

- Expanded `.github/README.md` package section to include end-to-end install, scaffold copy, credential preparation, and deployment steps.
- Updated npm package links and package naming references to the new `@striae-org` scope.
- Updated supported version table in `.github/SECURITY.md` to `v3.0.4`.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Package Identity | Migrated package scope to `@striae-org/striae` | Aligns distribution with organization namespace |
| Package Completeness | Included worker source modules and excluded runtime worker entry files | Improves install-time completeness while avoiding runtime entry leakage |
| Deploy Reliability | Refined deploy-config synchronization and admin credential preservation | Reduces config clobber risk and credential misconfiguration |
| Documentation | Updated install/publish/deploy instructions and links | Lowers setup friction for package consumers |

## Technical Implementation Details

### Packaging Layer

- Package name, version, publish registries, and file inclusion rules were updated in `package.json`.

### Script Layer

- `deploy-config.sh` now performs selective config synchronization and explicit admin credential preservation behavior.

### Documentation Layer

- README and security metadata were aligned with package scope and current supported version.

## Release Statistics

- **Commit Range**: `v3.0.2..HEAD`
- **Commits Included**: 5 (non-merge)
- **Build Status**: Not run in this release-prep update

## Closing Note

v3.0.4 is a packaging and deployment-focused patch that improves package distribution clarity, config safety, and setup guidance for Striae adopters.
