# Striae Release Notes - v2.2.0

**Release Date**: March 7, 2026
**Period**: March 7 - March 7, 2026
**Total Commits**: 37 (non-merge; MFA/profile hardening, auth/access simplification, UI/theming cleanup, policy/support updates, repository hygiene)

## Minor Release - MFA Profile Controls, Auth Simplification, and Surface Cleanup

## Summary

- Added and iterated in-app MFA phone-update capabilities with re-auth enforcement and shared utility refactors to improve account-security workflows.
- Simplified registration/auth configuration by removing extra allowlist/default-company wiring while keeping core validation and onboarding behavior intact.
- Stabilized access/routing flows through auth action path updates and mobile-prevention redirect fixes.
- Refined interface surfaces with toolbar color/theming iterations, modal/message polish, and cleanup of legacy footer/portal paths.
- Performed repository and public-surface cleanup by removing stale assets/components/script integrations and refreshing compatibility/config metadata.

## Detailed Changes

### MFA and Authentication Workflow Improvements

- Added profile-level MFA update flow support and iterated the associated modal UX/state handling.
- Hardened MFA re-authentication flow behavior for phone update operations.
- Refactored MFA update logic into utility/separate component pathways for clearer responsibilities.
- Continued auth flow cleanup by removing registration-config indirection and simplifying login-path MFA checks.

### Routing and Access Guard Refinements

- Updated auth email action handling and route behavior for better reliability.
- Fixed and iterated mobile-prevention routing logic to reduce path-specific bypass risk.
- Applied additional in-app link fixes after route and surface cleanup.

### UI, Theming, and Surface Cleanup

- Added toolbar color selector development updates.
- Applied color theming refinements, including a permanent dark-theme pass in this release window.
- Improved modal and message styling/error feedback behaviors.
- Removed footer component/surface remnants and deprecated portal-related link pathways.

### Legal, Community, and Support Surface Updates

- Refined registration, terms, and privacy content/flow integration.
- Added terms-update toast messaging updates.
- Added Patreon and sponsor button pathways for community support surfaces.
- Included FUNDING file add/remove/reapply cycle adjustments in repo metadata.

### Maintenance and Repository Hygiene

- Removed unused hooks and stale notice component files.
- Cleaned public assets and removed stale Cookiebot/Stripe-related references.
- Refreshed compatibility date metadata.
- Included NOTICE file update and corrective revert within the release window.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| MFA Security Flow | Profile MFA update + re-auth and utility refactor | Improved reliability and maintainability of MFA management |
| Auth/Access Stability | Email action/routing updates + mobile-prevention fixes | More consistent authentication and guarded-route behavior |
| UI/Surface Cleanup | Theming/modal/link cleanup and footer/portal removal | Cleaner interface and reduced legacy surface complexity |
| Repository Hygiene | Removal of stale assets/components/scripts and metadata refresh | Lower maintenance overhead and reduced config drift |

## Technical Implementation Details

### Authentication Layer

- MFA profile update behavior was refactored and hardened around re-auth requirements and clearer component boundaries.
- Login-path MFA checks were streamlined through shared utility usage and registration configuration simplification.

### Routing and Public Surface

- Route and link updates focused on reducing inconsistent path behavior and improving support/legal navigation reliability.
- Public/static cleanup removed stale artifacts that no longer map to active application surfaces.

## Release Statistics

- **Commit Range**: `v2.1.0..HEAD`
- **Commits Included**: 37 (non-merge)
- **Build/Typecheck Context**: Completed in local release prep workflow

## Closing Note

v2.2.0 focuses on practical security-flow hardening, auth path simplification, and cleanup-driven maintainability improvements across both application and repository surfaces.
