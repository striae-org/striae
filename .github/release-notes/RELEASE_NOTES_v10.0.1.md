# Striae Release Notes - v10.0.1

**Release Date**: August 16, 2026
**Period**: August 11, 2026 to August 16, 2026
**Total Commits**: 5 (non-merge after the v10.0.0 release)

## Patch Release - Magnification and Other-File Management Refinements

## Summary

v10.0.1 is a focused patch release that adds magnification capture to annotation workflows and refines associated non-image file management. It also corrects confirmation summary display updates and includes dependency, compatibility, and deployment-script maintenance from the release window.

## Detailed Changes

### Magnification Field

- Added magnification input fields to the relevant annotation and notes workflows.
- Carried magnification data through case export and PDF report rendering so the recorded value remains available in downstream case documentation.

### Other-File Management Refinements

- Refined the other-file management modal with improved file actions, layout, and interaction behavior.
- Improved other-file filtering and display handling so associated files are easier to find and identify in the current case.
- Applied related file-management UI styling and display refinements.

### Confirmation Summary Display

- Fixed confirmation summary updates so the confirmation summary displays current data reliably after case changes and confirmation operations.

### Maintenance and Release Alignment

- Refreshed root and worker dependency metadata and lockfiles.
- Updated worker compatibility-date examples and related deployment configuration handling.
- Synchronized package and worker version metadata at v10.0.1.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.0.0.md
- **Commits Included**: 5 (non-merge commits from 2026-08-11 through 2026-08-16)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.0.1 polishes the new associated-file workflow introduced in v10.0.0 while adding magnification to the annotation and reporting path and correcting confirmation summary display behavior. The patch keeps the app, worker, and deployment metadata aligned for the next release line.
