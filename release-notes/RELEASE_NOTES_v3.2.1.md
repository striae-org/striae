# Striae Release Notes - v3.2.1

**Release Date**: March 14, 2026
**Period**: March 13 - March 14, 2026
**Total Commits**: 15 (non-merge; React Router migration, export hardening, dependency refresh, and release metadata updates)

## Patch Release - React Router Migration, Export Pipeline Hardening, and Dependency Refresh

## Summary

- Completed the React Router runtime migration across the app shell, route handling, server/client entrypoints, and Cloudflare Pages integration.
- Hardened export processing with targeted XLSX safeguards, migration to ExcelJS, and externalized ExcelJS bundling for leaner client delivery.
- Improved export UX by moving case-export progress behavior for clearer long-running operation feedback.
- Refreshed root and worker dependency surfaces, including React/React DOM updates, npm audit remediation, and worker package lock/package synchronization.
- Strengthened deployment and configuration reliability with deploy-script hardening, deprecation cleanup, and compatibility/date alignment in example configuration files.
- Updated package metadata and documentation with funding links, React Router documentation alignment, and final version rebuild to 3.2.1.

## Detailed Changes

### React Router Migration and Runtime Alignment

- Migrated core app runtime plumbing from legacy framework conventions to React Router across route config, root wiring, and server/client entrypoints.
- Updated Cloudflare Pages function integration and React Router build/typegen command paths in project scripts.
- Refreshed project docs and internal guidance to consistently reference React Router deployment/runtime behavior.

### Export Pipeline Hardening and ExcelJS Transition

- Added XLSX export hardening updates in export data processing and download handler paths.
- Migrated case export spreadsheet generation to ExcelJS-backed handling.
- Externalized ExcelJS client bundle assets to vendor-delivered static files with aligned type definitions and download flow integration.
- Moved case export progress behavior to improve visibility and continuity of export status updates.

### Dependency, Worker, and Tooling Maintenance

- Bumped React and React DOM package versions and applied npm audit-driven dependency updates.
- Applied deprecation cleanup and dependency lock refresh in root package metadata.
- Updated worker package manifests/locks and refreshed worker dependency state.
- Updated worker compatibility examples and release metadata during the version rebuild pass.

### Deployment and Release Metadata Updates

- Hardened deploy orchestration/config scripts for safer and more predictable environment preparation.
- Added package funding links for GitHub Sponsors and Patreon support.
- Completed final package/version metadata rebuild for the 3.2.1 patch line.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Framework Migration | React Router runtime migration across app/routes/entry/functions | Aligns frontend runtime with current router stack and deployment model |
| Export Integrity | XLSX hardening + ExcelJS migration + externalized bundle | Improves export safety while reducing bundle pressure in spreadsheet workflows |
| UX Reliability | Case export progress flow relocation | Gives clearer long-running export feedback and status continuity |
| Ops and Security Hygiene | npm audit/deprecation updates plus deploy script hardening | Reduces maintenance risk and improves deployment reliability |
| Worker Maintenance | Worker package/lock refresh and compatibility example updates | Keeps edge services synchronized and easier to operate |
| Release Metadata | Funding links, docs refresh, and version rebuild | Improves package discoverability and release consistency |

## Technical Implementation Details

### Routing and Runtime Layer

- Updated route/runtime infrastructure to React Router conventions in app entrypoints, routing configuration, and Cloudflare Pages function integration.
- Kept TypeScript/typegen flow aligned with React Router tooling commands.

### Export and Data Layer

- Hardened spreadsheet data preparation and export handler logic.
- Transitioned spreadsheet generation path to ExcelJS.
- Added vendor-bundle externalization path for ExcelJS and integrated supporting type declarations.

### Deployment and Worker Layer

- Improved deployment script safeguards for configuration/deployment sequencing.
- Updated worker package dependencies and lockfiles for consistency across edge services.
- Refreshed worker Wrangler example configs during release rebuild.

### Documentation and Packaging Layer

- Updated documentation references to React Router where applicable.
- Added package funding metadata and finalized 3.2.1 package/lock metadata alignment.

## Release Statistics

- **Commit Range**: `v3.2.0..HEAD`
- **Commits Included**: 15 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Failed (`npm run typecheck`) due to missing `@cloudflare/puppeteer` module resolution in `workers/pdf-worker/src/pdf-worker.ts` and `workers/pdf-worker/src/pdf-worker.example.ts`
- **Lint Status**: Failed (`npm run lint`) with existing repository lint debt (493 errors; includes minified vendor script lint hits and Node global usage in `workers/pdf-worker/scripts/generate-assets.js`)

## Commit List (Non-Merge)

- `44a96a8f` (2026-03-13) - intiial migration dev
- `2eb4f1fa` (2026-03-13) - harden deploy scripts
- `6eeb20b0` (2026-03-13) - bump react react dom
- `a23e833e` (2026-03-13) - npm audit fix
- `8a9c84a3` (2026-03-13) - xlsx hardening
- `21b44e6c` (2026-03-13) - migrate to exceljs
- `4d64f36b` (2026-03-13) - externalize exceljs bundle
- `6e7988e5` (2026-03-13) - move case export progress
- `526b6167` (2026-03-13) - worker audit fixes and upd wrangler
- `47516171` (2026-03-14) - address deprecations
- `4cd4c6da` (2026-03-14) - npm install refresh
- `e99e09df` (2026-03-14) - worker refresh
- `55108114` (2026-03-14) - add funding links to patreon
- `2ad4713e` (2026-03-14) - upd docs for react router
- `77130a04` (2026-03-14) - version rebuild

## Closing Note

v3.2.1 is a stabilization patch that completes the React Router migration baseline, strengthens spreadsheet export pathways, and refreshes dependency/deployment surfaces for safer operations.
