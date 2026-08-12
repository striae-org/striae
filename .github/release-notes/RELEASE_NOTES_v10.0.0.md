# Striae Release Notes - v10.0.0

**Release Date**: August 11, 2026
**Period**: August 11, 2026
**Total Commits**: 15 (non-merge after the v9.1.1 release)

## Major Release - Files Worker + Non-Image File Management

## Summary

v10.0.0 introduces the dedicated files worker and completes the end-to-end non-image file management flow for Striae cases. The release adds a first-class storage worker for associated case files, wires upload/download/delete handling through the app and worker boundaries, and integrates file lifecycle checks into export, import, archive, and case-deletion flows.

## Detailed Changes

### Files Worker and Storage Architecture

- Added a dedicated `files-worker` with worker-scoped scaffolding, environment configuration, and deployment setup for case-associated non-image file storage.
- Integrated the new files worker into the shared worker deployment and config scaffolding paths so the new storage layer is consistent with the rest of the platform.
- Corrected environment validation and configuration replacement issues so files-worker setup and runtime checks remain stable across deploy and dev flows.

### Non-Image File Management End-to-End Flow

- Added the main non-image file management experience in the app, including upload, listing, deletion, and associated-file management UI along the image/file management area.
- Implemented drag-and-drop upload behavior, progress indication, and ready-state styling to improve the file-management experience during case operations.
- Fixed file upload path resolution and active-state navbar behavior so associated-file actions stay aligned with the current case context.
- Added the backend flow for managing case files across app and worker boundaries, including the dedicated storage and retrieval path for associated non-image files.

### Manifest, Archive, Export, and Import Integrity

- Updated export and archive packaging to include associated non-image files in the case bundle and encrypted file manifest flow.
- Tightened manifest, decryption, and verification checks so exported and imported associated files remain traceable and valid during package handling.
- Adjusted archive/export progress indicators and file-size handling to reflect the new file-management workflow and support larger associated files.
- Ensured case deletion and import paths properly account for associated non-image files so they are removed or verified as part of the lifecycle rather than being left behind.

### Security and Release Hardening

- Hardened the file-management path with validation and safety checks around manifest/decrypt flows, upload handling, and archive packaging.
- Applied CSS/button polish and label alignment follow-ups to keep the new file-management flow visually consistent with the rest of the app.
- Set the per-file upload limit to 512 MB for the non-image file workflow to match the supported associated-file bundle design.

### Release Metadata Alignment

- Updated package and worker metadata to v10.0.0.
- Refreshed supported-version metadata and release documentation for the new major release line.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v9.1.1.md
- **Commits Included**: 15 (non-merge commits from 2026-08-11 through 2026-08-11)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.0.0 completes the migration to a dedicated files worker and delivers the new associated-file management lifecycle for Striae cases. The release brings upload, export, manifest integrity, import verification, and deletion handling under one consistent non-image file flow while keeping the app and worker deployment surfaces aligned.
