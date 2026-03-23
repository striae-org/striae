# Striae Release Notes - v4.3.3

**Release Date**: March 23, 2026
**Period**: March 22 - March 23, 2026
**Total Commits**: 10 (non-merge since v4.3.2 release)

## Patch Release - Case Management, Archive-State Distinction, and Striae Route Refactoring

## Summary

v4.3.3 is a focused patch release centered on case-management reliability, clearer separation between archived and read-only case states, and a modular refactor of the main Striae route. The release improves archive/import workflow behavior, fixes UI regressions around archive case handling, and extracts route helpers to make the surrounding case operations easier to maintain. Some dependency updates and lint warnings resolved.

## Detailed Changes

### Case Management and Modal Workflow Updates

- Refined the cases modal presentation and related management flow behavior for active case handling.
- Updated case filtering behavior to better align case categories with the revised management UI.

### Archived, Imported Read-Only, and Review Read-Only State Separation

- Distinguished regular archived cases from imported read-only cases so each state is handled with the correct UI and lifecycle behavior.
- Separated archived-case handling from review-only read-only handling to prevent mixed state assumptions in navigation and case reset flows.
- Fixed follow-up archive-case UI regressions introduced during the broader state handling changes.

### Archive Import and Case Flow Reliability

- Tightened archive-related import/orchestration behavior across preview, confirmation, and route handling.
- Corrected case archival flow behavior in the main Striae route to keep archive operations consistent end to end.

### Striae Route Modularization

- Extracted reset helpers, open-case helpers, and case export helpers from the main Striae route.
- Reduced route-level complexity to make future archive and case-management maintenance safer and more targeted.

### Case and File Operation Messages Centralization

- Centralized case and file operation messages to improve consistency and maintainability across the codebase.

### Dependency Updates and Lint Fixes

- Updated @react-router/cloudflare, @react-router/dev, @react-router/fs-routes, react-router to 7.13.2.

## Release Statistics

- **Commit Range**: `v4.3.2..v4.3.3`
- **Commits Included**: 10 (non-merge, excluding the version bump commit)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings - 0 errors, 12 known/ignored warnings (npm run lint)

## Closing Note

v4.3.3 delivers targeted stability improvements across case management and archive/read-only workflows while reducing complexity in the Striae route implementation that coordinates those behaviors.