# Striae Release Notes - v1.2.1

**Release Date**: March 3, 2026
**Period**: March 1 - March 3, 2026
**Total Commits**: 25 (non-merge; public-link updates, access/support route cleanup, MFA/privacy refinements, worker/config/dependency maintenance)

## 🧹 Patch Release - Navigation, Access Cleanup, and Maintenance Hardening

## 🔗 Public Navigation and Link Updates

### White Paper and Public Link Alignment

- Added/updated white paper links across home/footer/public surfaces for clearer access to documentation
- Refined public link behavior and content placement in notice/footer contexts

### Route Surface Cleanup

- Removed legacy `access` route and retired standalone support/bugs route surfaces in favor of consolidated public pathways
- Integrated relevant access-notice messaging into home notice content to reduce route fragmentation

## 🔐 Authentication, MFA, and Privacy Refinements

### MFA and Auth Feedback Improvements

- Improved MFA verification and error-message handling for clearer user feedback during enrollment/verification flows
- Continued auth-related cleanup aligned with simplified access patterns

### Privacy and Data-Handling Adjustments

- Updated privacy content and related user-facing data messaging
- Added phone/email obfuscation updates for safer public display contexts

## ⚙️ Infrastructure and Dependency Maintenance

### Worker and Config Hygiene

- Performed worker package cleanup and npm audit maintenance tasks
- Updated compatibility-date references and wrangler type generation metadata
- Removed outdated scripts and obsolete config keys (including `SL_API_KEY`) to reduce drift

### Package Baseline Updates

- Applied package/version maintenance and package-manager metadata alignment
- Removed unused sanitization dependency and refined `sideEffects` allowlist behavior
- Updated `autoprefixer` from `10.4.24` to `10.4.27`

## 📋 Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Public Navigation | White paper links and route-surface cleanup | Clearer public access paths and reduced route duplication |
| Auth/MFA UX | Verification and error-message refinements | More reliable and understandable authentication feedback |
| Privacy/Security | Privacy messaging, obfuscation, key cleanup | Better protection posture and cleaner security surface |
| Infrastructure | Worker/config/script maintenance | Lower config drift and easier environment consistency |
| Dependencies | Package and tooling updates | Improved compatibility and ongoing maintenance stability |

## 🔧 Technical Implementation Details

### Application Layer

- Updated home/footer notice content and internal navigation behavior for documentation and support pathways
- Removed legacy route surfaces and consolidated messaging into active public pages

### Platform Layer

- Synced worker/tooling compatibility metadata, removed stale configuration keys, and cleaned package baselines
- Continued repository hygiene and script maintenance to keep deployment/dev surfaces consistent

## 📊 Release Statistics

- **Files Modified**: 90+
- **Commits Included**: 25 (non-merge, `v1.2.0..HEAD`)
- **Primary Areas**: link/navigation alignment, route cleanup, MFA/privacy refinements, worker/config/dependency maintenance
- **Validation Status**: Build succeeded (`npm run build`)

## Closing Note

v1.2.1 is a focused patch release that streamlines public navigation and route structure while improving authentication feedback and tightening maintenance across worker/config/dependency surfaces.
