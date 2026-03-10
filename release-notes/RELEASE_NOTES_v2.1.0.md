# Striae Release Notes - v2.1.0

**Release Date**: March 6, 2026
**Period**: March 5 - March 6, 2026
**Total Commits**: 37 (non-merge; auth action path iteration, MFA/email verification synchronization, turnstile cleanup, contact UX refinements, policy/config/tooling maintenance)

## Minor Release - Auth Action Reliability and Contact Surface Refresh

## Summary

- 🔐 Hardened account/auth workflows by integrating backend Firebase Auth deletion, enforcing admin-service credential sourcing, and tightening password-reset/session behavior.
- 🔁 Stabilized custom Firebase email action routing through iterative fixes/reverts, with post-verification MFA setup checks to keep onboarding state consistent.
- 🧹 Removed turnstile leftovers and stale auth/public form text while improving login controls and password field UX.
- 📬 Refined public contact surfaces (Google icon updates, contact link cleanup, added city/state fields) for clearer support intake.
- ⚙️ Performed infra maintenance: compatibility-date updates, repeated `wrangler types` sync, deploy-config/env example fixes, and Playwright pruning.

## Detailed Changes

### Authentication and Account Lifecycle

- Added backend Firebase Auth Admin account-deletion integration and supporting admin-service credential wiring.
- Synced `app/config/admin-service.json` and `.env` example/service-account fields for consistent deploy/setup behavior.
- Iterated custom email action routing (`/auth-action` path fixes/reverts) to stabilize reset and verification flows.
- Ensured MFA enrollment checks run after email verification or login state refresh.
- Added forced sign-out on password reset and improved password input visibility/feedback UX.

### Turnstile and Login Surface Cleanup

- Removed and reconciled stale Turnstile references after rollback/reapply cycles.
- Updated login button styling and removed stale form text.

### Public Contact and Compliance Content

- Updated contact page link handling and added Google SVG assets for contact surfaces.
- Added city/state fields to contact workflow data capture.
- Added Data Retention Policy and refined account termination legal terms.

### Tooling and Configuration Hygiene

- Refreshed compatibility dates and type generation outputs (`wrangler types`, type updates).
- Fixed deploy-config script behavior and corrected environment example values.
- Pruned Playwright-related dependencies/workflows.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Authentication Reliability | Email action path/routing iterations + MFA post-verification sync | Reduced auth-action breakage risk and improved enrollment consistency |
| Account Lifecycle Security | Backend Firebase Auth admin deletion + service-account config alignment | Stronger account deletion completeness and safer credential provisioning |
| Public UX | Contact form/link/icon updates with city/state capture | Clearer support intake and improved form usability |
| Tooling and Maintenance | Compatibility/type sync + Playwright pruning | Lower config drift and lighter maintenance overhead |

## Technical Implementation Details

### Application/Auth Layer

- Auth flow updates include custom action-path handling, login/reset ergonomics, and verification-to-MFA state synchronization.
- Password reset workflow now explicitly signs users out to prevent stale session state.

### Configuration/Deployment Layer

- Service-account and environment example updates reduce setup drift between local config and worker secret deployment.
- Deploy script corrections and compatibility/type sync reduce deployment-time surprises.

## Release Statistics

- **Commits Included**: 37 (non-merge, `v2.0.0..HEAD`)
- **Build Status**: Succeeded (`npm run build`)

## Closing Note

v2.1.0 focuses on authentication flow resilience, contact/public surface improvements, and ongoing deployment/configuration hygiene to support stable production operations.
