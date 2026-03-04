# Striae Release Notes - v1.2.2

**Release Date**: March 4, 2026
**Period**: March 3 - March 4, 2026
**Total Commits**: 5 (non-merge; confirmed-annotation immutability hardening, registration allowlist expansion, Cookiebot hydration fix, demo/config example updates, tooling cleanup)

## 🛠️ Patch Release - Confirmation Immutability, Registration Controls, and Consent Stability

## ✅ Confirmed Annotation Immutability and Editing Safeguards

### Immutable Confirmed Image Protection

- Enforced a data-operation guard in `saveFileAnnotations` to block annotation writes when existing `confirmationData` is present
- Added route-level autosave protection in `striae.tsx` to short-circuit annotation updates for confirmed images
- Normalized case sidebar confirmation checks to rely on `confirmationData` presence for more consistent confirmed-state handling

### Notes Sidebar UX and State Hardening

- Added a read-only immutable notice for confirmed images
- Added explicit save-error messaging for blocked confirmed-image modifications
- Disabled notes controls and save pathways when upload/confirmation state does not permit editing
- Prevented stale selection timing issues by withholding notes-entry enablement until selected-file load/confirmation state is resolved

## 🔐 Registration Allowlist Expansion

### Domain and Individual Email Controls

- Extended auth registration config with `allowedIndividualEmails`
- Updated registration validation to allow either an approved domain suffix or an exact allowlisted email address
- Updated registration feedback text to reflect combined domain/address restriction behavior

## 🍪 Cookie Consent Hydration Reliability

### Client-Side Cookiebot Injection

- Moved Cookiebot `uc.js` script loading from SSR `<head>` markup to client-side `useEffect` injection
- Added script constants and an idempotent guard to avoid duplicate script injection
- Reduced risk of pre-hydration DOM mutation side effects during first-load consent bootstrapping

## 🎨 Demo Styling and Config Example Maintenance

### Public Surface Styling Updates

- Added shared `.demoSection`, `.demoTitle`, and `.demoContent` style support aligned with existing about-section patterns
- Added consistent link-color treatment for about/demo content blocks

### Worker and Pages Example Config Synchronization

- Updated `compatibility_date` values in worker `wrangler.jsonc.example` files and `wrangler.toml.example` to `2026-03-04`

## ⚙️ Tooling and Dependency Cleanup

### Build Surface Simplification

- Removed `rollup-plugin-visualizer` from dependencies and lockfile
- Removed visualizer plugin wiring/comments from `vite.config.ts`

## 📋 Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Confirmation Integrity | Blocked post-confirmation annotation writes and autosave paths | Preserves forensic immutability after confirmation |
| Notes UX | Read-only confirmed-image messaging and disablement logic | Clearer operator feedback and fewer invalid edit attempts |
| Auth Registration | Added individual-email allowlist alongside domain allowlist | More precise enrollment access control |
| Consent Stability | Cookiebot script moved to client-side hydration phase | Lower hydration mismatch and consent-banner instability risk |
| Tooling/Config | Visualizer removal and example config date sync | Leaner build setup and current worker/pages examples |

## 🔧 Technical Implementation Details

### Application Layer

- Updated annotation edit flow behavior across notes sidebar, case sidebar, route-level autosave, and centralized data operations
- Expanded registration configuration/validation to support exact address allowlisting
- Updated root consent-bootstrap behavior to run post-hydration with duplicate-injection safety

### Platform Layer

- Removed unused Vite visualizer integration from package/dependency surface
- Synchronized worker/pages example compatibility-date metadata for configuration parity

## 📊 Release Statistics

- **Files Modified**: 20
- **Commits Included**: 5 (non-merge, `fbc19ef..HEAD` first-parent)
- **Primary Areas**: confirmed-annotation immutability, registration policy controls, consent bootstrapping, demo/public styling, config/tooling hygiene
- **Validation Status**: Not run in this documentation/update pass

## Closing Note

v1.2.2 is a focused stabilization release that hardens confirmed-image immutability, improves registration access control precision, and reduces consent-script hydration risk while keeping example configuration and tooling surfaces clean.
