# Striae Release Notes - v1.2.0

**Release Date**: March 1, 2026
**Period**: February 27 - March 1, 2026
**Total Commits**: 36 (non-merge; authentication/registration flow work, confirmation timestamp fixes, turnstile refinements, configuration and asset synchronization, dependency maintenance)

## 🔐 Authentication and Registration Flow Development

### Login and Registration Iteration

- Iterated login and registration behavior with route-level and configuration updates to support the next-phase authentication flow
- Added/updated authentication registration config examples and synchronized login handling with new config paths
- Included supporting styling refinements on auth routes and related public-route integration points

### Turnstile and Access Guarding

- Refined turnstile implementation work for login flow behavior and continued test iteration in this release window
- Updated turnstile key examples/config references and related route-level integration paths

## ✅ Confirmation and Timestamp Reliability Fixes

### Annotation Timestamp Corrections

- Fixed `earliestAnnotationTimestamp` handling in helper logic and notes-save paths
- Resolved edge behavior where earliest timestamps were not consistently preserved during save/update operations

### Confirmation State and Reviewer UX

- Refined confirmation-state save behavior and follow-up file display refresh when reviewer confirmation updates occur
- Improved consistency between confirmation persistence and sidebar/file-state visibility

## 🎨 Public-Surface and Route Styling Cleanup

### Home and Route CSS Adjustments

- Applied targeted fixes to home and route CSS classes to reduce styling inconsistencies
- Added supporting public assets and class-level cleanup for improved presentation consistency

### Public Content/Asset Updates

- Added ACS screenshots and supporting origin/image assets used in public-facing content and documentation surfaces
- Included supporting presentation updates (logo/icon/social assets) and route metadata/static-file alignment

## ⚙️ Config, Worker, and Deployment Maintenance

### Configuration and Compat-Date Synchronization

- Updated worker compatibility dates and worker config examples across service directories
- Synced type/config scaffolding and environment example files for improved setup consistency

### Script and Repository Hygiene

- Continued deploy-script alignment across shell/PowerShell/BAT variants and supporting config scripts
- Performed repository hygiene and synchronization updates (`.gitignore`, config examples, tooling metadata)

## 📦 Dependency and Tooling Updates

- Updated Firebase from `12.9.0` to `12.10.0` and finalized associated package/version alignment
- Updated `@typescript-eslint/parser` from `8.56.0` to `8.56.1`
- Applied wrangler/version iteration updates with stabilization cleanup in the same release window

## 📋 Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Authentication | Login/registration and auth-config iteration | Better readiness for evolving account-entry flow |
| Security/Access | Turnstile refinement and testing updates | Improved confidence in bot-protection path behavior |
| Data Integrity | Earliest annotation timestamp and confirmation save fixes | More reliable chronology and confirmation state persistence |
| UX/Presentation | Home/public route CSS and asset cleanup | More consistent public-page display and supporting visuals |
| Infrastructure | Worker/config/script synchronization | Lower configuration drift and easier environment alignment |
| Maintenance | Dependency and tooling updates | Improved compatibility and ongoing maintenance posture |

## 🔧 Technical Implementation Details

### Application Layer

- Updated authentication routes/components and supporting config-example files for registration/login flow evolution
- Applied focused fixes in annotation timestamp utility and confirmation-related sidebar/case display behavior

### Infrastructure Layer

- Updated worker example/config files, compatibility-date tooling, and deployment scripts for cross-environment consistency
- Refined package/dependency baseline and aligned repository metadata/assets with current release state

## 📊 Release Statistics

- **Files Modified**: 150+
- **Commits Included**: 36 (non-merge, `v1.1.5..HEAD`)
- **Primary Areas**: authentication/registration iteration, confirmation timestamp reliability, turnstile refinement, config/worker/script synchronization, dependency maintenance
- **Validation Status**: Build succeeded (`npm run build`)

## Closing Note

v1.2.0 focuses on authentication-flow iteration and reliability hardening, with key fixes for timestamp/confirmation consistency and broad infrastructure synchronization to keep worker/config/deployment surfaces aligned.
