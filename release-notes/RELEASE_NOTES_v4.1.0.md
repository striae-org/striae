# Striae Release Notes - v4.1.0

**Release Date**: March 19, 2026
**Period**: March 18 - March 19, 2026
**Total Commits**: 16 (non-merge since v4.0.3)

## Minor Release - Customized PDF Formats, Badge/ID Support, and Audit Viewer Refactor

## Summary

v4.1.0 introduces a server-side custom PDF format routing system that selects a report format based on the verified user email, with initial support for variable formats. User profiles now include a Badge/ID field surfaced throughout the audit system, confirmations, and PDF reports. The audit module received a multi-phase refactor including a centralized utility module and an improved viewer. UX polish was applied to modal and toast interaction states.

## Detailed Changes

### Customized PDF Formats and Variable Report Format Routing

- Added Primer Shear PDF report formats (debranded and customized) with a dedicated header layout displaying the user's full name, Badge/ID, date, and case number.
- Implemented server-side report format resolution in the Pages Function PDF proxy (`functions/api/pdf/[[path]].ts`): the format is selected based on the user's verified Firebase email against a `PRIMERSHEAR_EMAILS` environment secret — email addresses are never exposed in the client bundle.
- Added `PRIMERSHEAR_EMAILS` Pages secret (comma-separated, optional) to `worker-configuration.d.ts` and the `deploy-pages-secrets.sh` deployment flow.
- Added `primershear.emails` — an untracked local file (one address per line) — as the source-of-truth for the email list.
- Added `scripts/deploy-primershear-emails.sh`: reads `primershear.emails`, updates `.env`, deploys the `PRIMERSHEAR_EMAILS` secret to both Pages environments, and redeploys Pages in one step. Exposed as `npm run deploy-primershear`.
- Extended `PDFGenerationData` with `userFirstName`, `userLastName`, and `userBadgeId` fields; the primershear header renders `First Last, BadgeID`.
- Updated npm package `files` list: added `app/routes.ts`, `load-context.ts`, and `primershear.emails.example`.

### Badge/ID Field

- Added `badgeId` to the user data model and user worker storage/retrieval.
- Surfaced `badgeId` in the audit service, audit log entries, and the audit viewer.
- Added a Badge/ID prompt and missing-value notice in the relevant UI flows.

### Audit Module Refactor

- Phase 1: Restructured the audit viewer into a cleaner, more maintainable structure with clearer separation of concerns and improved readability.
- Phase 2: Refactored audit internals and audit viewer into a cleaner, more maintainable structure.
- Phase 3: Extracted a centralized audit utility module to reduce duplication across audit call sites.

### UX — Modal and Toast Interaction

- Centralized the modal close/escape key hook to a shared utility.
- Applied the shared hook consistently across toast and modal components.
- Set `cursor: default` on modal and toast elements to prevent incorrect pointer cursors on non-interactive surfaces.

### Compatibility

- Updated Cloudflare worker compatibility dates.

## Release Statistics

- **Commit Range**: `v4.0.3..v4.1.0`
- **Commits Included**: 16 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note
v4.1.0 introduces flexible PDF report formatting based on user email, enhanced user profiles with Badge/ID support, and a cleaner audit module structure, along with some important UX improvements to modals and toasts. The new deployment script for the Primer Shear email list makes it easy to manage report format access without touching source code.
