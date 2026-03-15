# Striae Release Notes - v3.3.0

**Release Date**: March 14, 2026
**Period**: March 14 - March 14, 2026
**Total Commits**: 20 (non-merge; portable signature verification, sidebar UX refinement, and npm package metadata/distribution updates)

## Minor Release - Portable Verification Packages, Sidebar UX Refinement, and Package Distribution Updates

## Summary

- Added a reusable internal verification utility and bundled public signing key PEM files into case and confirmation export packages for portable authenticity verification.
- Extended case and confirmation import flows to use ZIP-contained PEM files for signature verification when present, with configured-key fallback when a PEM is absent.
- Refined sidebar experience with reduced case-management clutter, toast-based sidebar feedback, and targeted button/layout polish across the release window.
- Updated npm package metadata and publish file selection to improve package discoverability and ensure required PDF worker helper files are included in the distributable scaffold.
- Stabilized release surfaces with manifest reinstatement plus metadata refreshes during the same-day release window.

## Detailed Changes

### Portable Verification and Export Packaging

- Added an internal verifier utility to support more direct signature validation workflows.
- Packaged public signing key PEM files with case ZIP exports and confirmation export bundles.
- Refined verification-template and clipboard support used alongside authenticated export verification flows.

### Import Verification and Authenticated Transfer Hardening

- Updated import verification flows to consume PEM files carried inside signed ZIP packages.
- Preserved configured verification-key fallback for import scenarios where a bundled PEM is not present.
- Strengthened signed export portability by keeping verification material adjacent to exported payloads.

### Sidebar UX and Interaction Refinements

- Reduced case-sidebar clutter with case-management UI/UX refinements during active case work.
- Moved sidebar success/failure messaging to toast-based feedback.
- Applied iterative button and sidebar polish passes across switch/cancel and related interaction states.

### Package Metadata and Publish Surface Updates

- Updated npm package keywords and long-form description to better reflect authenticated confirmations and report-generation capabilities.
- Refined package file-list behavior for publish output and aligned included worker helper assets/scripts with the intended distribution surface.

### Metadata, Notification, and Release Stabilization

- Refreshed app metadata across the release window.
- Iterated notification behavior, landing on a cleaner permission/toast posture after in-window experimentation.
- Reinstated manifest-related behavior as part of release stabilization before the minor version cut.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Verification Portability | PEM files bundled with signed export packages plus internal verifier utility | Improves independent validation and keeps signature-verification material with exported artifacts |
| Import Hardening | ZIP-contained PEM verification with configured-key fallback | Strengthens authenticated import handling while preserving compatibility when PEM is absent |
| Sidebar UX | Case-management decluttering and toast-based status messaging | Reduces workflow noise and makes operational feedback more visible |
| Package Distribution | npm description/keywords/file-list updates | Makes the published package clearer and ensures required PDF worker helpers ship with the scaffold |
| Release Stability | Manifest reinstatement and metadata/notification cleanup | Keeps the minor release surface coherent after same-day iteration |

## Technical Implementation Details

### Verification and Export Layer

- Added reusable internal verification support to authenticated export flows.
- Updated export packaging so public verification keys travel with signed case and confirmation artifacts.

### Import and Validation Layer

- Extended import verification logic to recognize bundled PEM files inside ZIP packages.
- Maintained fallback verification behavior through configured public-key resolution when bundled keys are unavailable.

### UI and Interaction Layer

- Reworked sidebar flow and feedback presentation to reduce visual clutter during active case review.
- Applied iterative button and interaction polish throughout the sidebar-related surfaces touched in this release window.

### Packaging and Metadata Layer

- Refined published package metadata and whitelist behavior.
- Aligned distributable contents with the current PDF worker helper/script requirements.

## Release Statistics

- **Commit Range**: `v3.2.2..HEAD`
- **Commits Included**: 20 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Succeeded with warnings (`npm run lint`: 0 errors, 2 warnings)

## Commit List (Non-Merge)

- `845dcae7` (2026-03-14) - upd description npm
- `c7f87e14` (2026-03-14) - upd keywords
- `a4f5ff1e` (2026-03-14) - npm package file list upd
- `698a2d4d` (2026-03-14) - ui/ux dev
- `9b31716b` (2026-03-14) - ui/ux dev
- `cf46eeeb` (2026-03-14) - button ui/ux dev
- `dce8d2fa` (2026-03-14) - button dev
- `4007ee3f` (2026-03-14) - cancel button dev
- `7fff586a` (2026-03-14) - sidebar messages to toasts
- `ccc464fb` (2026-03-14) - Case management UI/UX dev
- `4a9e9015` (2026-03-14) - add PEM import verification flows
- `2bc311e3` (2026-03-14) - include public key PEM files in ZIP and confirmation exports
- `e62dc340` (2026-03-14) - Internal verifier utility dev
- `dc6011f6` (2026-03-14) - clipboard utility and signature verification templates
- `509e9685` (2026-03-14) - rm desktop notif permissions
- `744b961c` (2026-03-14) - permissions and successful login toast
- `8c601fae` (2026-03-14) - add desktop notifications for toasts
- `6bf0a7de` (2026-03-14) - upd meta
- `5b41a839` (2026-03-14) - upd meta
- `9be65870` (2026-03-14) - reinstate manifest

## Closing Note

v3.3.0 is a same-day minor release that packages verification material directly with signed exports, hardens import verification portability, and refines the day-to-day sidebar/package experience around those authenticated workflows.
