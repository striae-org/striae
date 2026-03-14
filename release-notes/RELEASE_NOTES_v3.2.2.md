# Striae Release Notes - v3.2.2

**Release Date**: March 14, 2026
**Period**: March 14 - March 14, 2026
**Total Commits**: 33 (non-merge; audit-service refactor phases, PDF asset/format re-organization, repository hygiene, and release metadata updates)

## Patch Release - Audit Service Refactor Consolidation and Repository Hygiene

## Summary

- Consolidated a multi-phase audit service refactor and cleanup sequence, with follow-on normalization of shared type imports and `User` type usage.
- Reorganized PDF worker assets and formats, including removal of legacy custom-asset paths.
- Applied repository hygiene passes across filename normalization, `.gitignore`, lint iterations, and Cloudflare type generation.
- Executed and then reverted keys/config migration and keys-worker decommission experiments within the same release window to preserve deployment baseline behavior.
- Updated project funding metadata and captured dependency movement history, including Vite bump and corresponding revert activity.

## Detailed Changes

### Audit Service Refactor and Type Normalization

- Completed phased audit service refactor updates (`phase 1` through `phase 4`) followed by cleanup consolidation.
- Normalized shared type import patterns and `User` type usage consistency across affected modules.

### PDF Worker Asset/Format Reorganization

- Moved PDF worker assets/formats into the updated organization layout.
- Removed legacy/custom PDF asset references and aligned generated asset placement.

### Repository Hygiene and Operational Stability

- Applied lint-driven cleanup commits and refreshed Cloudflare type generation output.
- Corrected filename and `.gitignore` adjustments, including explicit revert commits where needed.
- Reverted in-window keys/config migration and keys-worker decommission change set to avoid unstable release-surface drift.

### Funding and Dependency Metadata

- Updated Patreon/funding metadata references.
- Recorded Vite dependency bump and revert history in the release commit stream.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Audit Services | Multi-phase refactor consolidation and cleanup | Improves maintainability and consistency of audit operation pathways |
| Type Safety | Type import and `User` usage normalization | Reduces type drift and improves compile-time consistency |
| PDF Worker | Asset/format structure reorganization | Simplifies worker source organization and future format maintenance |
| Repository Hygiene | Lint/typegen/filename/ignore cleanup | Reduces maintenance noise and improves repo hygiene |
| Change Control | Explicit reversions for keys/config and worker decommission attempts | Preserves stable runtime baseline during patch release |
| Package Metadata | Patreon/funding updates and dependency-history capture | Keeps release metadata and package lifecycle history aligned |

## Technical Implementation Details

### Service Layer

- Audit service pathways were iteratively refactored and then consolidated into a cleanup pass.
- Type normalization updates aligned import conventions and `User` usage across impacted modules.

### Worker Layer

- PDF worker source structure now separates assets/formats in the updated layout.
- Legacy custom asset remnants were removed to reduce duplicate or stale worker sources.

### Repository and Tooling Layer

- Lint and typegen maintenance commits refreshed repository hygiene.
- Filename and ignore-file adjustments were applied with matching corrective reverts where necessary.

### Configuration and Packaging Layer

- Keys/config migration and keys worker decommission experiments were rolled back in-window.
- Funding metadata updates were finalized while dependency movement remained documented in commit history.

## Release Statistics

- **Commit Range**: `v3.2.1..v3.2.2`
- **Commits Included**: 33 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Succeeded with warnings (`npm run lint`: 0 errors, 2 warnings)

## Commit List (Non-Merge)

- `ca6356d2` (2026-03-14) - Revert "Merge pull request #687 from striae-org:dependabot/npm_and_yarn/vite-8.0.0"
- `d8a129f1` (2026-03-14) - upd patreon
- `41f2c32b` (2026-03-14) - add generated assets
- `c90560e4` (2026-03-14) - upd gitignore
- `561b8619` (2026-03-14) - cf typegen
- `336b1c20` (2026-03-14) - lint dev
- `04da0b6a` (2026-03-14) - lint dev
- `63325d8b` (2026-03-14) - normalize type imports
- `9d292e10` (2026-03-14) - normalize User type usage
- `e066ad8d` (2026-03-14) - upd User type usage
- `473b73df` (2026-03-14) - audit service refactor and cleanup
- `01f5e577` (2026-03-14) - audit service refactor phase 4
- `30e7c421` (2026-03-14) - audit service refactor phase 3
- `1a7b1b54` (2026-03-14) - audit refactor phase 2
- `9efa69b0` (2026-03-14) - Audit service refactor phase 1
- `6f7f783d` (2026-03-14) - move pdf assets and formats for organization
- `2631bf36` (2026-03-14) - rm cutom assets from pdf worker
- `25cfe438` (2026-03-14) - rm custom assets from pdf worker
- `cf5b604f` (2026-03-14) - Revert "config/key migration phase A"
- `fc4e6f1b` (2026-03-14) - Revert "config/key migration phase dev"
- `3a5e1d0e` (2026-03-14) - Revert "key/config migration phase dev (operations)"
- `9dd603e6` (2026-03-14) - Revert "rm keys worker and references - decommissioned"
- `029f1d19` (2026-03-14) - Revert "gitignore upd"
- `f8e7f324` (2026-03-14) - Revert "fix filenames"
- `fda0a346` (2026-03-14) - fix filenames
- `c2167dce` (2026-03-14) - gitignore upd
- `7fbe9665` (2026-03-14) - rm keys worker and references - decommissioned
- `052169ed` (2026-03-14) - key/config migration phase dev (operations)
- `b2a71546` (2026-03-14) - config/key migration phase dev
- `0afd6ed4` (2026-03-14) - config/key migration phase A
- `13e40938` (2026-03-14) - make patreon primary funding
- `6254bde7` (2026-03-14) - upd patreon funding
- `48e52d87` (2026-03-14) - Bump vite from 6.4.1 to 8.0.0

## Closing Note

v3.2.2 is a same-day stabilization patch that consolidates audit refactor work, keeps PDF worker source layout clean, and preserves baseline behavior through explicit in-window reversions.
