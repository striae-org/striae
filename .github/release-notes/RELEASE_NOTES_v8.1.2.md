# Striae Release Notes - v8.1.2

**Release Date**: July 13, 2026
**Period**: July 9, 2026 to July 13, 2026
**Total Commits**: 7 (non-merge after the v8.1.1 release)

## Patch Release - React 19 Migration Completion, Legal Notice Update, and Dependency Refresh

## Summary

v8.1.2 is a patch release that completes the React 19 migration and lint cleanup started in v8.1.1, applies code review refinements across audit, canvas, and sidebar surfaces, adds a patent pending legal notice to the login screen and sidebar footer, and refreshes dependencies across the app and worker toolchain.

## Detailed Changes

### React 19 Migration and Lint Cleanup

- Completed React 19 context, provider, and `forwardRef` migration across the audit viewer, auth provider, canvas, canvas confirmation, form field, icon, case import, navbar, files modal, sidebar container, theme provider, and manage profile components.
- Removed ESLint disable directives that were no longer needed after the migration was applied, keeping the flat config clean and lint rules fully active.
- Applied targeted lint fixes across the audit entries list, audit filters panel, MFA verification, canvas, all-cases modal, case sidebar, files modal, item-details state, sidebar container, and toolbar components.

### Code Review Refinements

- Refined audit filters panel behavior and component structure across multiple review passes.
- Simplified `sidebar-container` provider usage and improved context consumption patterns.
- Improved `use-item-details-state` hook internals for more idiomatic React 19 patterns.
- Tightened `theme-provider` component structure during the same review window.

### Legal Notice Update

- Added a "Patent Pending" notice to the sidebar footer copyright line and introduced a matching legal notice section on the login screen with a version link and copyright year.

### Dependency Refresh

- Bumped root application dependencies in `package.json` and refreshed `package-lock.json` to reflect the updated dependency graph.
- Refreshed the data-worker `package.json` and `package-lock.json` to align with the updated app toolchain.
- Updated Wrangler example compatibility dates across the audit, data, image, lists, pdf, and user workers.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v8.1.1.md
- **Commits Included**: 7 (non-merge commits after v8.1.1 on 2026-07-09)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v8.1.2 wraps up the React 19 migration cycle, tightens the legal notice surface, and keeps the dependency graph current ahead of the next development window.
