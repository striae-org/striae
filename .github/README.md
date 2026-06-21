# 🔫 Striae - A Firearms Examiner's Comparison Companion

Striae is a specialized, cloud-native platform designed to streamline forensic firearms identification by providing an intuitive environment for digital comparison image annotation, authenticated confirmations, and automated report generation. Built with a focus on security, reliability, and user experience, Striae empowers firearms examiners to efficiently manage case data, collaborate securely, and produce comprehensive forensic reports with confidence.

## 🌐 Application URL

**[Live App](https://striae.app)**

## 💬 Contact & Support

**[Striae Support](https://www.striae.org/support)**

**[Email Support](mailto:info@striae.org)**

## 👥 Project Maintainers

[![Stephen J. Lu](https://github.com/StephenJLu.png?size=50)](https://github.com/StephenJLu)

---

## 📋 Changelog

## [2026-06-20] - *[Minor Release v8.1.0](https://github.com/striae-org/striae/releases/tag/v8.1.0)*

- **⚛️ React Router v8 Major Bump** - Upgraded React Router from v7 to v8, replaced `cloudflareDevProxy` with `@cloudflare/vite-plugin`, and removed v8 future flags now default in the new major.
- **🧹 ESLint v10 Major Bump** - Upgraded ESLint from v9 to v10 with a modernized flat config, unified `typescript-eslint` package, `@eslint-react/eslint-plugin`, and `eslint-plugin-import-x`; applied lint corrections across the codebase.
- **⚙️ Maintenance** - Updated Dependabot config for the new ESLint ecosystem, added npm packaging/install scripts, refreshed app and worker dependencies.

## [2026-06-20] - *[Patch Release v8.0.1](https://github.com/striae-org/striae/releases/tag/v8.0.1)*

- **📦 Firebase Admin SDK Major Bump** - Bumped `firebase-admin` from v13 to v14 for upstream alignment and improved stability.
- **⚙️ Maintenance** - Refreshed app and worker dependencies, bumped Wrangler ecosystem packages, ESLint TypeScript tooling, esbuild, Vitest, and isbot; refreshed Cloudflare compatibility dates across all workers.

## [2026-06-07] - *[Major Release v8.0.0](https://github.com/striae-org/striae/releases/tag/v8.0.0)*

- **🗝️ Key Registry R2 Migration** - Migrated cryptographic key registries from environment secrets to AES-256-GCM encrypted R2 storage, resolving the 5.1 kB secret size limit and enabling centralized key management across all workers; added shared registry module, encryption tooling, and automated upload scripts.
- **⚛️ React Router v8 Future Flags** - Enabled all React Router v8 future flags (`v8_middleware`, `v8_splitRouteModules`, `v8_viteEnvironmentApi`, `v8_passThroughRequests`, `v8_trailingSlashAwareDataRequests`) for early opt-in to the upcoming framework version.
- **📦 Shared Case Export Loader** - Extracted case export action loading into a shared lazy-import utility for reduced bundle size and deduplicated import logic.
- **⚙️ Maintenance** - Refreshed app and worker dependencies, fixed label auto-generation, and updated worker package installs.

## [2026-05-23] - *[Patch Release v7.1.3](https://github.com/striae-org/striae/releases/tag/v7.1.3)*

- **🛠️ Static Import Fix** - Applied a targeted follow-up fix for a static import issue discovered after the previous maintenance cycle.
- **🔒 Security and Dependency Maintenance** - Refreshed app and worker dependencies, updated build/test/lint tooling, bumped `protobufjs` for the upstream security fix, and refreshed Cloudflare compatibility dates.

## [2026-05-07] - *[Patch Release v7.1.2](https://github.com/striae-org/striae/releases/tag/v7.1.2)*

- **⚙️ Maintenance** - Bumped app and worker dependencies, updated Wrangler, and refreshed Cloudflare compatibility dates across all workers.

## [2026-04-27] - *[Patch Release v7.1.1](https://github.com/striae-org/striae/releases/tag/v7.1.1)*

- **🗑️ Manual Account Deletion Script** - Added `scripts/delete-account.mjs` (`npm run delete-account`) for operator-driven account cleanup using Firebase Admin SDK and Cloudflare worker APIs, with streaming output for real-time progress feedback; applied code review follow-up for improved error handling and robustness.
- **⚙️ Maintenance** - Bumped app and worker dependencies and refreshed Cloudflare compatibility dates across all workers.

## [2026-04-25] - *[Minor Release v7.1.0](https://github.com/striae-org/striae/releases/tag/v7.1.0)*

- **📋 Lists Worker** - Added a dedicated Cloudflare Worker (`lists-worker`) for KV-backed email allowlist management; exposes auth-gated GET/POST/DELETE endpoints for member and Primer Shear lists with constant-time auth comparison; integrated into the Pages registration flow via a service binding and shared client helper.
- **🔗 Registration Allowlist Integration** - Refactored registration allowlist and check paths to use the lists-worker service binding instead of static config files; removed `members.emails` and `primershear.emails` config-example files superseded by KV storage.
- **🧹 Dead Script Cleanup** - Removed `deploy-members-emails.sh`, `deploy-primershear-emails.sh`, and related package script references; updated deploy-config scaffolding to register the new lists worker.
- **🔐 UUID Security Fix** - Resolved a known `uuid` package vulnerability via a scoped npm override targeting the `firebase-admin` dependency chain.
- **⚙️ Maintenance** - Bumped Vite, applied general dependency updates, and refreshed Cloudflare compatibility dates across the app and workers.

## [2026-04-22] - *[Patch Release v7.0.1](https://github.com/striae-org/striae/releases/tag/v7.0.1)*

- **🖼️ Canvas L/R Notes Display** - Added left/right notes rendering to the canvas component, allowing examiners to view per-side annotation notes directly within the comparison canvas view; updated canvas CSS module and bumped compatibility dates across all worker `wrangler.jsonc.example` files.
- **⚙️ Worker Response Logic Alignment** - Standardized response handling patterns across the image worker and user worker for consistency; refactored router and handler response construction in the image worker and aligned response/error types and route handling in the user worker.
- **🧹 Code Review Follow-Up** - Applied minor code review fixes to the user worker including type refinements and removal of stale logic.

## [2026-04-21] - *[Major Release v7.0.0](https://github.com/striae-org/striae/releases/tag/v7.0.0)*

- **🔗 Service Bindings Migration** - Replaced HTTP-based worker proxying (domain environment variables and URL normalization) with Cloudflare Service Bindings across all five worker proxy functions; removed top-level `worker-configuration.d.ts` and worker domain helper functions from `env-utils.sh`; updated `wrangler.toml.example` and all worker `wrangler.jsonc.example` files.
- **🔑 Custom Auth Key Removal** - Removed stale auth key bindings (`USER_DB_AUTH`, `R2_KEY_SECRET`, `IMAGES_API_TOKEN`, `PDF_WORKER_AUTH`) and `X-Custom-Auth-Key` header usage from affected workers; cleaned up associated generated `worker-configuration.d.ts` files.
- **🖼️ Image Management Cleanup** - Removed the direct blob retrieval fallback from `image-manage.ts`; image access now exclusively uses signed URLs.
- **⚙️ Deploy Config Update** - Added worker name registration step to `scaffolding.sh` for service binding setup.
- **📦 Dependency Updates** - Bumped Firebase SDK, ESLint, app deps, worker package versions, and Cloudflare compatibility dates across all layers.

## [2026-04-20] - *[Patch Release v6.1.8](https://github.com/striae-org/striae/releases/tag/v6.1.8)*

- **🧹 Worker CORS Cleanup** - Removed CORS configuration from all worker entry points and consolidated worker source files by renaming `.example.ts` files to canonical `.ts` files; refactored user worker routes and removed CORS scaffolding from deploy config scripts.
- **🧪 Unit Test Suite Expansion** - Added app-level tests for forensics operations (confirmation signing, export encryption, manifest signing, audit export signing) and confirmation summary data, plus worker-level data utility tests (encryption, signature, and signing payload utils).
- **🔗 Community Links Removal** - Removed community links from `.github/README.md` and `README.md`.
- **⚙️ Maintenance** - Updated `.gitignore`, removed leftover output files, and applied lint fixes across `eslint.config.js`, worker test files, and `README.md`.

## [2026-04-20] - *[Patch Release v6.1.7](https://github.com/striae-org/striae/releases/tag/v6.1.7)*

- **🗑️ Case Deletion Fix** - Fixed a regression blocking deletion of the currently loaded case from the all-cases modal; any case can now be deleted from the modal regardless of which case is active.
- **⚡ Data Cache Refresh Hardening** - Hardened the data cache refresh logic to handle edge cases that could leave stale entries after refresh operations.
- **🐛 Case Listing Cache Reset** - Fixed the case listing cache not resetting correctly after a case deletion, preventing stale entries from persisting in the list.
- **🔑 Case Creation/Rename Permissions Fix** - Resolved a bug where permission checks for case creation and rename operations incorrectly blocked valid users.
- **🧹 Auth and Demo Logic Cleanup** - Removed unused demo company logic and the unimplemented `recoverEmail` email action handler, reducing dead code paths in the auth flow.

## [2026-04-19] - *[Patch Release v6.1.6](https://github.com/striae-org/striae/releases/tag/v6.1.6)*

- **🔗 Sidebar Navigation Update** - Replaced the "Striae Community" link in the About & Support sidebar footer with a direct "Manage Membership" link pointing to the account management portal.
- **⚡ Vite Native Path Resolution** - Migrated from the `vite-tsconfig-paths` plugin to Vite's built-in `resolve.tsconfigPaths` option, removing the plugin dependency.
- **⚙️ Post-Release Tooling Maintenance** - Included dependency bumps, compatibility-date updates, and Dependabot YAML configuration cleanup after v6.1.5.

## [2026-04-18] - *[Patch Release v6.1.5](https://github.com/striae-org/striae/releases/tag/v6.1.5)*

- **🔐 Auth Surface Cleanup** - Finalized the active login route assets, removed the remaining auth route template flow from scaffolding, and aligned login/MFA reCAPTCHA handling with the production auth surface.
- **🚫 App Non-Indexing Controls** - Added explicit `noindex, nofollow` protections through document metadata, response headers, and `robots.txt` to keep the application surface out of search indexing.
- **⚙️ Post-Release Tooling Maintenance** - Included lint configuration cleanup, package refreshes, Wrangler type regeneration, compatibility-date updates, and code-review follow-up commits completed after v6.1.4.

## [2026-04-17] - *[Patch Release v6.1.4](https://github.com/striae-org/striae/releases/tag/v6.1.4)*

- **⚡ Case Loading State Efficiency** - Refactored case loading state management across the case route, sidebar, and sidebar container to reduce redundant fetches, with added permission-evaluation guards and a case-already-loaded short-circuit to avoid unnecessary re-fetches.
- **⚡ Cases and Files Modal Efficiency** - Improved the all-cases modal and files modal to reduce unnecessary re-renders and redundant data operations during case-switching flows.
- **🔒 Security Maintenance** - Bumped `protobufjs` package to resolve a known vulnerability in transitive dependency chains.
- **⚙️ Release-Window Maintenance** - Included compatibility-date refreshes across all workers and code-review follow-up commits completed since v6.1.3.

## [2026-04-16] - *[Patch Release v6.1.3](https://github.com/striae-org/striae/releases/tag/v6.1.3)*

- **🐛 Confirmation-Status Cleanup Fix** - Fixed confirmation-status cleanup behavior for read-only case deletion scenarios to prevent stale status artifacts when read-only cases are removed.
- **⚙️ Release-Window Maintenance** - Included isbot and eslint-plugin-react-hooks bumps, Wrangler updates, compatibility-date refreshes, and code-review follow-up commits completed since v6.1.2.

## [2026-04-15] - *[Patch Release v6.1.2](https://github.com/striae-org/striae/releases/tag/v6.1.2)*

- **🔐 Notes Editing Permission Centralization** - Centralized notes editing permission enforcement and refactored the related notes-editing paths for more consistent write-access validation.
- **🧩 Shared Annotation Literals Cleanup** - Added shared annotation literals to reduce duplicated annotation-model constants and align annotation handling.
- **⚙️ Release-Window Maintenance** - Included dependency bumps, Wrangler updates, compatibility-date refreshes, and code-review follow-up commits completed since v6.1.0.
- **v6.1.2** - Corrected npm package files list to include the shared directory for annotation literals and related utilities.

## [2026-04-14] - *[Minor Release v6.1.0](https://github.com/striae-org/striae/releases/tag/v6.1.0)*

- **🧭 Item Model Terminology Refactor** - Completed a broad class-to-item naming/type transition across core data and UI surfaces, including item type/subclass display and control refinements.
- **🧩 Split Item Data and Reporting** - Added split left/right item datasets, split additional notes, updated summary/notes displays, and aligned PDF report formats plus icon/tool reporting behavior.
- **🗂️ File Management and Stabilization Follow-Ups** - Refined file-management filtering for split-item workflows and included release-window dependency/code-review maintenance plus archive re-export packaging fixes.

## [2026-04-12] - *[Patch Release v6.0.1](https://github.com/striae-org/striae/releases/tag/v6.0.1)*

- **🗂️ Archive Import UX Follow-Ups** - Continued archive import alert/messaging refinements from the v6.0.0 release window for clearer archive-operation feedback.
- **🌐 Public Surface and Config Follow-Ups** - Added Striae community links to About/Support surfaces and refactored registration + Primer Shear email configuration handling.
- **⚙️ Compatibility and Release Maintenance** - Included compatibility-date refreshes, v6.0.1 version housekeeping, and release-window code review follow-up commits.

## [2026-04-11] - *[Major Release v6.0.0](https://github.com/striae-org/striae/releases/tag/v6.0.0)*

- **🔐 Forensic Signature Algorithm Cutover** - Switched forensic manifest, confirmation export, and bundled audit-export signing/verification from `RSASSA-PKCS1-v1_5-SHA-256` to `RSASSA-PSS-SHA-256` with RSA-PSS salt length `32`.
- **🧾 Signature Contract Version Bump** - Bumped signing contracts to `manifestVersion: 3.0`, `confirmation signatureVersion: 3.0`, and `audit export signatureVersion: 2.0` to make the cryptographic change explicit.
- **⚠️ Breaking Verification Behavior** - This is a hard cutover. Pre-cutover PKCS1-signed exports are expected to fail signature verification/import under the new contract.
- **🗂️ Archive Workflow Refinements** - Refactored archive bundle export into shared helpers and tightened archive import alerts/messaging behavior.
- **🛠️ Release-Window Deployment and Packaging Maintenance** - Included deployment script updates, package script adjustments, and related release-window maintenance commits from 2026-04-10 through 2026-04-11.

## [2026-04-10] - *[Patch Release v5.5.2](https://github.com/striae-org/striae/releases/tag/v5.5.2)*

- **🔐 Registration Gateway Development** - Implemented registration gateway development work to enhance user onboarding flows and auth integration patterns with related code review adjustments.
- **📦 Firebase and Firebase Admin Updates** - Bumped Firebase and Firebase Admin SDK packages for improved security and stability in auth mechanisms and cloud integration.
- **🚀 Deployment Script Reliability** - Fixed deploy pages script execution issues and updated npm package file list configurations for improved artifact management.
- **⚙️ Environment and Compatibility Maintenance** - Updated environment example configurations, applied configuration override updates, and refreshed Cloudflare Workers compatibility dates.

## [2026-04-09] - *[Patch Release v5.5.1](https://github.com/striae-org/striae/releases/tag/v5.5.1)*

- **🕒 Timestamp UX Refinements** - Converted ISO timestamps to user-timezone display and refined timestamp/range-end presentation behavior for improved readability.
- **🎨 Notes UI Polish** - Applied iterative notes/button styling updates, wording/spacing improvements, prop-handling fixes, and follow-up review adjustments.
- **📦 Worker and Dependency Maintenance** - Added/fixed worker package version update flows, updated worker dependency metadata (including audit-worker Puppeteer entries), bumped data-worker wrangler, and included React/React DOM maintenance updates.
- **⚙️ Compatibility and Release Metadata Updates** - Applied compatibility-date refreshes and aligned the v5.5.1 release-version metadata.

## [2026-04-08] - *[Minor Release v5.5.0](https://github.com/striae-org/striae/releases/tag/v5.5.0)*

- **📄 Audit Trail PDF Export** - Added PDF export capability for the audit trail with a new format-independent worker report path and updated audit viewer header UI.
- **🧹 Audit History Fix and Code Review** - Applied a targeted audit history processing fix and incorporated review-driven refinements across the audit export pipeline.
- **🎨 Notes Save Button Polish** - Adjusted gradient styling on the save notes button for improved visual consistency.
- **📦 Dependency Maintenance** - Bumped Vite and Wrangler across the app and all workers; applied compatibility-date refreshes.

## [2026-04-03] - *[Patch Release v5.4.5](https://github.com/striae-org/striae/releases/tag/v5.4.5)*

- **🔐 TOTP Script Follow-Ups** - Applied targeted follow-up adjustments in the TOTP MFA enablement script to improve script-level reliability without changing the broader auth flow.
- **🛠️ Code Review Cleanup** - Incorporated additional review-driven refinements in the same script for maintainability and correctness.

## [2026-04-02] - *[Patch Release v5.4.4](https://github.com/striae-org/striae/releases/tag/v5.4.4)*

- **🔧 Image Worker Refactor** - Restructured the image worker codebase for improved modularity and maintainability while preserving all existing functionality and backward compatibility.
- **🧪 Experimental Cleanup** - Explored CORS and Firebase Auth enhancements but reverted to maintain stability and preserve the current production auth flow.

## [2026-04-02] - *[Patch Release v5.4.3](https://github.com/striae-org/striae/releases/tag/v5.4.3)*

- **💻 Desktop-Only Mobile Warning** - Added a session-dismissible mobile/tablet warning overlay at the app root so users are clearly told Striae is intended for desktop browsers.
- **🧭 Demo Limit Guardrail Follow-Ups** - Refined demo account case/file limit wiring and aligned the example config keys with the active permission checks.
- **🧹 Audit Export and API Cleanup** - Removed obsolete audit export code paths and narrowed the audit worker to GET/POST-only routes.
- **⚙️ Wrangler and Compatibility Maintenance** - Bumped Wrangler to `4.80.0` across the app and workers and refreshed example compatibility-date metadata.

## [2026-03-31] - *[Patch Release v5.4.2](https://github.com/striae-org/striae/releases/tag/v5.4.2)*

- **🔐 Original Case Owner UID in Confirmation Signing** - Threaded original case owner UID through confirmation export, import, and signing flows with an import-time guard that rejects packages not intended for the importing user.
- **🪪 Badge/ID Read-Only in Confirmation Modal** - Converted the Badge/ID field in the confirmation modal from an editable input to a read-only display sourced from the user's profile.
- **⚙️ Wrangler Type Refresh** - Refreshed `worker-configuration.d.ts` with updated wrangler-generated type definitions.

## [2026-03-31] - *[Patch Release v5.4.1](https://github.com/striae-org/striae/releases/tag/v5.4.1)*

- **🔐 TOTP Admin Unenroll Script** - Added a Firebase Admin SDK script (`npm run unenroll-totp-mfa -- <uid>`) for administrative TOTP MFA unenrollment to support account recovery when users lose access to their authenticator app.
- **💬 MFA Verification Support Guidance** - Added a support contact message to the TOTP verification prompt directing locked-out users to Striae support for account recovery assistance.
- **📦 npm Package Files Allowlist Refinement** - Simplified the npm files allowlist with broader worker directory inclusion and targeted exclusion patterns instead of individual inclusion globs.

## [2026-03-31] - *[Minor Release v5.4.0](https://github.com/striae-org/striae/releases/tag/v5.4.0)*

- **🔐 TOTP MFA** - Introduced TOTP (authenticator app) multi-factor authentication with dedicated enrollment, verification, enrolled-factor management, and profile management surfaces alongside existing phone MFA.
- **🗂️ Component Reorganization** - Migrated case-import and all-cases-modal components from the sidebar tree into the navbar tree, and moved class-details sub-components into a dedicated subdirectory under notes.
- **🎨 CSS Consolidation** - Collapsed per-modal individual CSS module files for case modals into a shared stylesheet, and consolidated auth, files, notes, toolbar, and user component styles to reduce duplication.
- **📦 Dependency and Tooling Maintenance** - Bumped Wrangler to 4.79.0, applied dependency updates across app and worker packages, and refreshed Cloudflare compatibility dates.

## [2026-03-29] - *[Patch Release v5.3.2](https://github.com/striae-org/striae/releases/tag/v5.3.2)*

- **🖼️ Image Signed URL Proxy** - Added a signed token (`?st=`) bypass path to the Pages image proxy, allowing signed URL image delivery without Firebase identity verification per request.
- **📄 PDF Image Signed URL Fix** - Pre-fetch signed URL images client-side and embed as data URLs before PDF generation so Puppeteer no longer requires outbound requests for proxy-served images.
- **📤 Export Confirmations Modal** - Added the export confirmations modal component with dedicated styling, route integration, and label/wording refinements for confirmed images.

## [2026-03-29] - *[Patch Release v5.3.1](https://github.com/striae-org/striae/releases/tag/v5.3.1)*

- **🪪 Designated Reviewer Flows** - Added designated reviewer assignment to case export workflows with a self-designation guardrail and a re-introduced export case modal for structured reviewer capture.
- **🔐 Import Decryption Follow-Up** - Extended import previews to support decryption of encrypted packages and removed remaining stale unencrypted import workflows to complete the encrypted workflow alignment from v5.3.0.
- **💬 Loading Toast UX** - Added a loading toast component with dedicated styling to provide visible progress feedback during case operations.
- **⚙️ Compatibility Date Maintenance** - Refreshed compatibility dates across all worker and Pages configuration example files.

## [2026-03-26] - *[Minor Release v5.3.0](https://github.com/striae-org/striae/releases/tag/v5.3.0)*

- **🔐 Export Workflow Consolidation** - Removed legacy and unencrypted export paths, retired the old case-export modal surface, and aligned the published/package export surface with current secure workflow expectations.
- **🧱 Worker and Account-Deletion Refactor** - Refactored audit, data, and user worker internals, removed obsolete backfill and keys-worker surfaces, and tightened account-deletion file cleanup behavior.
- **⚙️ Deployment and Runtime Cleanup** - Corrected deployment and secrets scripts, refreshed Wrangler type outputs, and removed inactive runtime/public repository artifacts uncovered during the cleanup cycle.
- **🧭 Import and Profile Follow-Ups** - Improved case import preview behavior, corrected confirmation-import audit entry handling, added Badge/ID capture in registration/profile flows, and expanded class-details options.

## [2026-03-25] - *[Patch Release v5.2.1](https://github.com/striae-org/striae/releases/tag/v5.2.1)*

- **🛠️ Deploy Script Reliability Fixes** - Fixed deployment-script issues, including account ID replacement behavior and related setup-path corrections to reduce config drift risk.
- **🧾 Environment and Key-Config Cleanup** - Reorganized environment example structure and corrected keys JSON entry handling for cleaner deployment preparation.
- **📦 Tooling Maintenance** - Applied Wrangler version bumps in the same patch window.

## [2026-03-25] - *[Minor Release v5.2.0](https://github.com/striae-org/striae/releases/tag/v5.2.0)*

- **🧹 Runtime and Legacy Cleanup** - Removed deprecated `requireSignedURLs` handling and additional Cloudflare holdover remnants that were no longer part of the active architecture.
- **🛡️ Deploy-Config Validation Hardening** - Refined placeholder detection regex behavior and incorporated release-window validation/code-review updates for safer environment setup flows.
- **🗝️ Key Registry Rotation Hardening** - Added deploy-config key-registry entry automation, standardized nested key-registry JSON + active key ID variables, and aligned worker key resolution paths for rotation-safe decrypt compatibility.
- **⚙️ Worker and Runtime Alignment** - Updated image-worker generated type surfaces, refreshed compatibility-date metadata, and included user-worker KV EAR follow-up adjustments.
- **📦 Migration Completion Cleanup** - Removed obsolete backfill-function remnants as part of post-migration stabilization.

## [2026-03-24] - *[Patch Release v5.1.1](https://github.com/striae-org/striae/releases/tag/v5.1.1)*

- **🔗 Signed URL Generation Refinement** - Fixed signed URL generation and verification logic for consistent validation across image serving surfaces with follow-up deploy-config alignment for URL signing keys.
- **🛡️ Image Access Control Hardening** - Improved image revoke handling to properly cascade revocation across dependent resources and enhanced image access validation flows.
- **⚙️ Deploy Configuration and Secrets Alignment** - Updated deploy-config sequences and environment templates to reflect current secrets requirements and validation patterns with enhanced secrets validation prompting.
- **🧪 Code Review Resolution and Maintenance** - Addressed targeted code review feedback and test infrastructure alignment from the patch release window.

## [2026-03-24] - *[Minor Release v5.1.0](https://github.com/striae-org/striae/releases/tag/v5.1.0)*

- **🔐 Data-at-Rest Encryption Rollout** - Extended encryption work into storage/runtime pathways (including audit/image surfaces), with migration/backfill tooling and environment example updates for encrypted data handling.
- **🧭 Import Guardrail Hardening** - Refined archive/import gate behavior, fixed import blocking edge cases, and clarified enforcement messaging in import UI flows.
- **⚙️ Deploy and Secret Wiring Alignment** - Updated deploy-config workflows for new encryption-related secrets, removed duplicate image token configuration, and refreshed worker type outputs.
- **🧪 Reliability and Maintenance Window** - Added root/image test updates, fixed PDF image GET handling reliability, and included dependency maintenance updates in the same release window.

## [2026-03-24] - *[Major Release v5.0.0](https://github.com/striae-org/striae/releases/tag/v5.0.0)*
- **🔐 Encrypted Forensic Package Workflow Rollout** - Added encryption support for case, confirmation, and archive package export paths with `ENCRYPTION_MANIFEST.json` metadata and import-time decryption flow integration.
- **🛡️ Import Decryption + Validation Hardening** - Introduced encrypted preview/import handling improvements and post-decrypt validation reliability fixes while preserving fail-closed signature/hash checks.
- **🧹 Verification Surface Simplification** - Removed legacy standalone public signing key verification utility UI surface and consolidated validation behavior into shared workflow paths.
- **⚙️ Guardrails and Deploy-Config Alignment** - Added mandatory encryption enforcement and related archive/read-only guardrails, with release-window deploy/config script updates to support encryption key lifecycle setup.

## [2026-03-23] - *[Patch Release v4.3.4](https://github.com/striae-org/striae/releases/tag/v4.3.4)*

- **🔁 Rename Audit Provenance Expansion** - Captured both sides of case renames by logging original-case rename-to events and destination-case creation-through-rename events.
- **🧭 Rename-Origin Metadata** - Added explicit rename-derived creation metadata (`createdByRename`) and source-case linkage for cleaner filtering and report interpretation.
- **🧹 Audit Surface Cleanup (No Behavior Change)** - Removed unused audit service methods and trimmed dead/publicly exported audit symbols while preserving active runtime paths.
- **🛠️ Audit Entry Reliability and Release-Window Maintenance** - Included related archive-case and annotation/confirmation audit detail follow-up fixes, plus React Router dependency alignment and duplicate import cleanup completed in the same patch window.

## [2026-03-23] - *[Patch Release v4.3.3](https://github.com/striae-org/striae/releases/tag/v4.3.3)*

- **🗂️ Case Management Workflow Refinements** - Refined cases modal behavior and related case-management handling to better align active-case workflows with updated state filtering.
- **🧭 Archive and Read-Only State Separation** - Distinguished archived cases from imported and review read-only cases so navigation, reset behavior, and archive-specific UI paths handle each state correctly.
- **📥 Archive Import and UI Regression Fixes** - Tightened archive import flow behavior across preview/orchestration surfaces and corrected follow-up archive-case UI regressions.
- **🧩 Striae Route Modularization** - Extracted route helpers for reset, open-case, and export behavior to reduce main-route complexity and support safer follow-up maintenance.

## [2026-03-22] - *[Patch Release v4.3.2](https://github.com/striae-org/striae/releases/tag/v4.3.2)*

- **🧭 Confirmation Import Audit Filter Alignment** - Updated audit viewer confirmation-import filtering to include both dedicated `confirmation-import` actions and legacy confirmation-phase import entries for accurate query coverage.
- **🔄 Case Refresh Version-Bump Guardrail** - Refined import result handling so the active case performs a full annotation refresh while different-case updates only increment confirmation save version state.
- **🪪 Reviewer Badge Mapping Correction** - Corrected confirmation import audit export summary badge resolution by using the canonical `reviewerBadgeId` field.

## [2026-03-22] - *[Patch Release v4.3.1](https://github.com/striae-org/striae/releases/tag/v4.3.1)*

- **🔐 Confirmation Import Signature Verification** - Fixed confirmation import signature verification logic to ensure accurate validation of imported confirmation signatures and enhanced confirmation import audit refinements.
- **🗃️ Audit Trail Archival Fixes** - Fixed audit trail archival fetch logic for correct archived entry retrieval and corrected CSV export handling for audit data integrity.
- **🧾 Audit Viewer Display Refinements** - Fixed reviewer badgeID display in audit viewer and improved audit trail inspector UX accuracy.
- **🔒 Read-Only and Archive Case Guardrails** - Disabled Open Case, List All Cases, and Delete Case in Case Management when a read-only or archived case is loaded; added a Clear RO Case action to Maintenance for proper cleanup. Blocked archive import when the case already exists in the user's regular case list, with a directed error message.

## [2026-03-22] - *[Minor Release v4.3.0](https://github.com/striae-org/striae/releases/tag/v4.3.0)*

- **🗂️ Case and Notes Management Expansion** - Added and iterated file/case management modal workflows, continued notes feature/styling refinement, unified modal presentation behavior, and expanded sidebar confirmation-export flow support.
- **🧾 Annotation Detail and Metadata Enhancements** - Expanded annotation model/detail handling with class-type metadata propagation, class-details modularization, additional calculation explanation coverage, diameter-calculation updates, and new annotation types including shotshell characteristics.
- **📄 PDF Formatting Evolution** - Continued modular PDF report format work (including multi-page support progression), refreshed generated-assets examples, and applied related worker/report integration refinements.
- **🛡️ Stabilization and Maintenance Window** - Captured follow-up code-review hardening plus release-window compatibility/dependency maintenance in the post-v4.2.1 development window.

## [2026-03-21] - *[Patch Release v4.2.1](https://github.com/striae-org/striae/releases/tag/v4.2.1)*

- **📝 Notes and Case UI Polish** - Refined notes modal naming, spacing, and message delivery behavior while improving case information spacing and sidebar open-case action presentation.
- **🧹 Confirmation Status Cleanup Hardening** - Added confirmation status utility updates and strengthened cleanup behavior for account deletion plus deletion/archival case lifecycle paths.
- **🧩 Data/Worker Flow Tightening** - Continued data-operations modular refactor work, tightened worker flow behavior, and removed API gateway fallback paths for clearer runtime handling.
- **📦 Dependency and Runtime Maintenance** - Bumped Firebase to `12.11.0`, bumped Wrangler to `4.76.0`, refreshed compatibility-date metadata, and completed targeted Tailwind/PostCSS cleanup.
- **🛠️ Release-Window Stabilization** - Included follow-up code-review and repository hygiene refinements as part of this patch cycle.

## [2026-03-20] - *[Minor Release v4.2.0](https://github.com/striae-org/striae/releases/tag/v4.2.0)*

- **🗃️ Case Archival Workflow Expansion** - Added multi-phase case archival implementation and follow-up refinements across archival IDs, operation cleanup, and archived-case lifecycle handling.
- **🛡️ Archive Integrity and Signature Hardening** - Introduced a shared integrity verification utility, closed audit signature verification gaps, improved tamper detection in archive import preview, and fixed archive image bundling for import reliability.
- **📥 Archived Import/Delete Guardrails** - Added archival import support while tightening operation gates and edge-case handling for archived-case confirmation and deletion paths.
- **🧾 Audit Metadata and Viewer Improvements** - Expanded Badge/ID and user metadata coverage in audit pathways and improved bundled audit trail viewing behavior.
- **🧭 Navbar and Modal Refactor** - Moved key case actions into the navbar, reorganized modal/notes surfaces, and standardized close/Escape behavior across interaction flows.
- **⚙️ Compatibility and Repository Hygiene** - Updated compatibility-date metadata and removed stale keybase artifact during release-window cleanup.

## [2026-03-19] - *[Minor Release v4.1.0](https://github.com/striae-org/striae/releases/tag/v4.1.0)*

- **📄 Customizable PDF Formats** - Added custom PDF report formats with server-side format routing driven by a verified-email allowlist (`PRIMERSHEAR_EMAILS` Pages secret), keeping email addresses out of the client bundle entirely.
- **🪪 Badge/ID Field** - Added Badge/ID to the user profile, audit service, audit log entries, audit viewer, and PDF report headers.
- **🔍 Audit Module Refactor** - Multi-phase refactor of audit internals: restructured the audit viewer, extracted a centralized audit utility module, and reduced duplication across audit call sites.
- **🖱️ Modal and Toast UX Polish** - Centralized the modal close/escape hook, applied it consistently to toast and modal components, and corrected cursor states on non-interactive surfaces.
- **⚙️ Primer Shear Deploy Script** - Added `scripts/deploy-primershear-emails.sh` (`npm run deploy-primershear`) to update the email list, push the secret, and redeploy Pages in one command. This script is specifically intended to manage the PDF format access list for Primer Shear members without requiring source code changes or redeploying the entire app.
- **📦 npm Package File List Update** - Added `app/routes.ts`, `load-context.ts`, and `primershear.emails.example` to the published package file manifest, which were missing from previous iterations.

## [2026-03-18] - *[Patch Release v4.0.3](https://github.com/striae-org/striae/releases/tag/v4.0.3)*

_Note: Summary intentionally scopes this patch entry to login example and deployment-script updates._

- **🔐 Login Route/Module Example Update** - Added a login route/module example to support implementation reference for authentication setup flows.
- **⚙️ Deploy Script Login Variables Update** - Added login-related variables to the deploy-config script to improve deployment-time login configuration coverage.

## [2026-03-17] - *[Patch Release v4.0.2](https://github.com/striae-org/striae/releases/tag/v4.0.2)*

_Note: Summary is based on 18 non-merge commits since v4.0.1 (post-4.0.1 stabilization, dependency maintenance, and PDF worker deployment hardening window)._

- **📄 PDF Worker Stabilization Cycle** - Applied PDF worker timeout/hardening changes and intentional follow-up reverts during the same release window to preserve stable runtime behavior.
- **📦 Dependency and Type Maintenance** - Updated dependency surfaces including `isbot`, React type packages, and broader dependency refresh commits.
- **🛠️ Error Boundary Reliability Fix** - Fixed an error-boundary loop condition to reduce fallback recursion risk in failure scenarios.
- **🧭 Utilities and API Structure Cleanup** - Reorganized shared utils/API structure and refreshed compatibility-date metadata.
- **🔐 Public Key and Deployment Metadata Hygiene** - Removed outdated key material, added `keybase.txt`, and aligned deploy-config/PDF worker operational metadata.

## [2026-03-15] - *[Patch Release v4.0.1](https://github.com/striae-org/striae/releases/tag/v4.0.1)*

_Note: Summary is based on 7 non-merge commits since v4.0.0 (same-day patch release window)._

- **🌐 Canonical and Metadata Updates** - Updated canonical URL handling and page meta titles to better align public-route metadata behavior.
- **🔐 Security Metadata Refresh** - Updated `security.txt` release-surface metadata for current disclosure alignment.
- **🛠️ Worker Subdomain Validation Fixes** - Fixed worker subdomain check behavior and patched signed URL GET handling across route-sensitive proxy paths.
- **⚙️ Deployment Script Refinement** - Simplified worker subdomain automation behavior and normalized worker-name casing in script flows.
- **📦 Runtime Type Synchronization** - Refreshed Wrangler-generated runtime types to keep worker contract outputs current.

## [2026-03-15] - *[Major Release v4.0.0](https://github.com/striae-org/striae/releases/tag/v4.0.0)*

_Note: Summary is based on 28 non-merge commits since v3.3.0 (security/API/secret hardening migration window)._

- **🛡️ API Security Boundary Migration** - Migrated app transport to same-origin Pages `/api/*` proxy routes with Firebase bearer-token verification and stronger auth-scoped request forwarding.
- **🔐 Secret and Config Hardening** - Expanded worker/Pages secret deployment flow, tightened deployment-script validation, and reduced legacy fallback/config drift paths.
- **🧱 Worker Auth and Route Surface Stabilization** - Refined header-auth behavior across workers and removed custom worker-route replacement flows from deployment config updates.
- **↩️ Controlled Migration Stabilization** - Applied targeted reverts and follow-up fixes during rollout to preserve secure baseline behavior while converging on hardened architecture.
- **⚙️ Reliability and Operations Cleanup** - Included deletion-path, API error-path, compatibility, and type-generation updates to stabilize the major migration surface.

## [2026-03-14] - *[Minor Release v3.3.0](https://github.com/striae-org/striae/releases/tag/v3.3.0)*

_Note: Summary is based on 20 non-merge commits since v3.2.2 (same-day minor release window)._ 

- **🔐 Portable Verification Packages** - Added internal verifier support and bundled public signing key PEM files with case and confirmation export packages for independent authenticity checks.
- **📥 Import Verification Hardening** - Extended import flows to use ZIP-contained PEM files for signature verification with configured-key fallback when PEM material is absent.
- **🎛️ Sidebar UX Refinement** - Reduced case-management clutter, moved sidebar status messaging to toasts, and applied iterative button/UI polish during active-case workflows.
- **📦 npm Package Metadata and Publish Surface Updates** - Refined package description/keywords and publish file selection to better represent authenticated workflows and ship required PDF worker helpers.
- **🧹 Manifest and Metadata Stabilization** - Reinstated manifest behavior and refreshed metadata/notification-related surfaces during the release window.

## [2026-03-14] - *[Patch Release v3.2.2](https://github.com/striae-org/striae/releases/tag/v3.2.2)*

_Note: Summary is based on 33 non-merge commits since v3.2.1 (same-day patch window)._

- **🧭 Audit Service Refactor Consolidation** - Completed phased audit-service refactor/cleanup and normalized shared type import plus `User` type usage patterns.
- **📄 PDF Worker Asset and Format Reorganization** - Reorganized PDF worker assets/formats and removed legacy custom-asset remnants.
- **🧹 Repository Hygiene and Tooling Passes** - Applied lint/typegen, filename normalization, and `.gitignore` maintenance updates.
- **↩️ Stability-Preserving Reverts** - Reverted in-window keys/config migration and keys-worker decommission experiments to keep runtime baseline stable.
- **💖 Funding and Dependency Metadata Updates** - Updated Patreon/funding metadata and captured Vite bump/revert history in release lineage.

## [2026-03-14] - *[Patch Release v3.2.1](https://github.com/striae-org/striae/releases/tag/v3.2.1)*

_Note: Summary is based on 15 non-merge commits since v3.2.0._

- **🧭 React Router Migration Baseline** - Completed app/runtime migration to React Router across route config, entrypoints, and Cloudflare Pages integration.
- **📊 Export Pipeline Hardening** - Hardened spreadsheet export workflows, migrated export generation to ExcelJS, and externalized ExcelJS bundle delivery.
- **⏱️ Export UX Reliability** - Moved case export progress behavior to improve long-running export status visibility.
- **⚙️ Dependency and Worker Refresh** - Applied React/package audit/deprecation updates and synchronized worker package/lock refresh.
- **📘 Release Metadata and Docs Alignment** - Added funding metadata, updated React Router documentation references, and finalized 3.2.1 version rebuild outputs.

## [2026-03-13] - *[Minor Release v3.2.0](https://github.com/striae-org/striae/releases/tag/v3.2.0)*

_Note: Summary excludes duplicate internal version-bump commits and focuses on functional changes._

- **🔐 PDF Worker Authentication Hardening** - Added PDF-worker auth key protection and aligned worker key flow for secure report generation.
- **📄 PDF Pipeline Expansion** - Added generated PDF assets and supporting PDF documentation updates.
- **🧭 Session and Timeout Behavior Updates** - Switched Firebase Auth to session persistence and reduced default timeout interval behavior.
- **⚙️ Deployment and Config Improvements** - Added automated worker-domain entry scripting and refreshed compatibility-date configuration.
- **🧹 Repository and Route Hygiene** - Moved wiki content to a separate directory, updated `.gitignore`, and refined icon/PNG route handling.

## [2026-03-12] - *[Patch Release v3.1.1](https://github.com/striae-org/striae/releases/tag/v3.1.1)*

- **🧹 Icon Sprite Cleanup** - Removed unused SVG symbols and manifest entries; sprite now contains only the 9 icons actively referenced in the app
- **🔑 Public Signing Key Component** - Extracted public signing key display into a dedicated component for cleaner modal integration
- **📋 Audit Report Integrity** - Updated integrity verification messaging in audit report output
- **📦 Dependency Updates** - Bumped isbot; applied DepBot security advisory fix (GHSA)
- **⚙️ Config and Compat Maintenance** - Refreshed Cloudflare compatibility dates, worker config, and Pages secrets handling

## [2026-03-10] - *[Minor Release v3.1.0](https://github.com/striae-org/striae/releases/tag/v3.1.0)*

- **🔐 Signature-First Verification Posture** - Removed hash-utility-dependent validation pathways and hash-value exposure in UI flows to align with signed export verification.
- **🔑 Public Signing Key UX** - Added export-modal access to the public signing key with copy support and concise verification guidance for independent validation workflows.
- **🧩 Export Modal Reliability & Layout Refinements** - Improved modal behavior and layout structure, including cursor consistency, action ordering, and content containment fixes.
- **🧹 Lint and Config Hygiene** - Completed ESLint flat-config migration and related repository cleanup, including compatibility/config maintenance.

## [2026-03-09] - *[Patch Release v3.0.5](https://github.com/striae-org/striae/releases/tag/v3.0.5)*

- **🧹 Metadata and Public Surface Cleanup** - Removed legacy author meta tag references and retired stale meta/public asset remnants
- **🚫 Header Policy Adjustment** - Removed outdated no-index related header leftovers
- **🎨 UI Polish** - Fixed toolbar color selector font-size style tagging

## [2026-03-09] - *[Patch Release v3.0.4](https://github.com/striae-org/striae/releases/tag/v3.0.4)*

- **📦 Package Scope and Version Alignment** - Migrated distributable package identity to `@striae-org/striae` and finalized package metadata at `v3.0.4`
- **🧩 Worker Source Packaging Expansion** - Included required worker source modules in npm package payload while excluding runtime worker entry files for safer distribution
- **⚙️ Deploy-Config Sync Hardening** - Refined `deploy-config.sh` to sync non-admin config files, preserve existing `admin-service.json`, and avoid copying example credentials into active config
- **📘 Installation and Publishing Workflow Updates** - Expanded package install/deploy instructions and added GitHub Packages publish guidance/scripts alongside npmjs registry targeting
- **🔐 Supported Version Matrix Update** - Updated security support metadata to `v3.0.4` for release alignment

## [2026-03-09] - *[Patch Release v3.0.2](https://github.com/striae-org/striae/releases/tag/v3.0.2)*

- **🧩 PDF Report Modularity Foundations** - Introduced report-format request envelopes and modular PDF worker report loading to support format-specific rendering paths while preserving legacy payload compatibility
- **📄 Shared Report Type Contracts** - Centralized PDF report interfaces/types and aligned worker/client request handling for cleaner typed boundaries
- **🧹 Package Version Correction** - Reverted an unintended npm patch increment during the release window to keep package version progression consistent before this release bump
- **🏷️ PDF Footer Branding Update** - Added the Striae `icon-256` brand mark next to "Notes formatted by Striae" in generated report footers

## [2026-03-09] - *[Major Security Release v3.0.0](https://github.com/striae-org/striae/releases/tag/v3.0.0)*

- **🛡️ Signed Forensic Manifest Enforcement** - Replaced hash-only confirmation integrity checks with server-issued asymmetric signatures and canonical payload verification to prevent hash-bypass tampering
- **🔒 Hard-Fail Import and Hash Verification Gates** - Import preview/execution and hash utility paths now block unsigned or invalidly signed confirmation packages
- **📜 Signature-Aware Audit Provenance** - Expanded audit export/view and logging pathways to capture signing and verification outcomes for stronger chain-of-custody evidence
- **⚙️ Signing Key and Deploy Hardening** - Added manifest-signing key config support, worker signing helpers, key auto-generation alignment, and deploy-config reliability fixes
- **📚 Security Advisory Context** - Added hash-fix documentation updates capturing vulnerability impact, patch guidance, and references for release communication

## [2026-03-07] - *[Minor Release v2.2.0](https://github.com/striae-org/striae/releases/tag/v2.2.0)*

- **🔐 MFA Management and Re-Authentication Improvements** - Added and iterated MFA phone-update support in profile management with re-auth flow hardening, messaging refinements, and utility-based MFA cleanup
- **🧭 Auth and Access Flow Simplification** - Simplified registration configuration paths, refined auth/email-action routing behavior, and stabilized mobile-prevention redirect handling
- **🎨 UI/Theming and Navigation Cleanup** - Introduced toolbar color selector/theming updates, removed legacy footer/portal surfaces, and applied link/modal/style corrections
- **📜 Policy, Support, and Community Surface Updates** - Refined registration/terms/privacy UX content, updated toast/legal messaging, and added Patreon/sponsor support pathways
- **🧹 Repository and Public Surface Hygiene** - Cleaned unused public assets/components/hooks, removed Cookiebot/Stripe leftovers, and refreshed compatibility/config metadata

## [2026-03-06] - *[Minor Release v2.1.0](https://github.com/striae-org/striae/releases/tag/v2.1.0)*

- **🔐 Auth Lifecycle and Credential Hardening** - Integrated backend Firebase Auth account deletion support with admin-service credential sourcing and deploy/config alignment updates
- **🔁 Email Action and MFA Flow Stability** - Iterated auth action route handling and ensured MFA setup checks run after verification/login state transitions
- **🧹 Turnstile/Auth UX Cleanup** - Removed stale Turnstile references and refined login/password UX with button styling and password visibility improvements
- **📬 Contact and Public Surface Refinements** - Updated contact route/link behavior, added Google SVG support, and expanded contact capture fields with city/state
- **⚙️ Tooling and Config Maintenance** - Refreshed compatibility/types outputs, corrected env example/deploy-config behavior, and pruned Playwright-related setup

## [2026-03-05] - *[Major Release v2.0.0](https://github.com/striae-org/striae/releases/tag/v2.0.0)*

- **🔐 Backend Firebase Auth Account Deletion** - User Worker account-deletion flow now calls Firebase Auth admin APIs so deleted accounts are removed from authentication storage, not just app data stores
- **🧭 Required Admin Service Credential Source** - Configuration and worker-secret scripts now require `app/config/admin-service.json` and ingest `project_id`/`client_email`/`private_key` directly from it
- **⚙️ Deploy Script Hardening** - Removed interactive service-account prompt paths and added strict credential validation to fail early on malformed or placeholder admin-service values
- **🧩 Config Example Synchronization** - Added `app/config-example/admin-service.json`, refreshed `.env.example` service-account placeholders, and aligned compatibility-date examples across worker/page config templates
- **🔄 Route Experiment Rollback Handling** - Captured trust/compliance route add/revert cycle in the release window with no net long-term public route-surface change

## [2026-03-04] - *[Patch Release v1.2.2](https://github.com/striae-org/striae/releases/tag/v1.2.2)*

- **✅ Confirmed Annotation Immutability Fixes** - Hardened confirmed-image editing safeguards across route autosave, data operations, and notes/case sidebars to block post-confirmation mutation paths
- **🔐 Registration Allowlist Expansion** - Added support for exact-email allowlisting alongside domain allowlists to improve registration access control flexibility
- **🍪 Cookie Consent Hydration Stability** - Moved Cookiebot `uc.js` injection to client-side hydration flow to reduce pre-hydration DOM mutation issues
- **🎨 Demo Surface and Config Example Updates** - Added reusable demo-section styling and refreshed worker/pages `compatibility_date` values in example configs
- **🧹 Tooling Cleanup** - Removed `rollup-plugin-visualizer` from dependencies and Vite plugin configuration to simplify build tooling

## [2026-03-03] - *[Patch Release v1.2.1](https://github.com/striae-org/striae/releases/tag/v1.2.1)*

- **🔗 Public Link and Navigation Cleanup** - Updated white paper link handling on public surfaces and consolidated access/support route pathways
- **🧭 Route Surface Simplification** - Removed legacy access/support/bugs route fragments and integrated relevant notice content into active home messaging
- **🔐 MFA/Auth and Privacy Refinements** - Improved MFA verification/error feedback, privacy wording, and public obfuscation behavior
- **⚙️ Worker/Config Hygiene** - Performed worker package cleanup, compatibility-date/type updates, and stale key/script cleanup
- **📦 Dependency Maintenance** - Applied package baseline updates including `autoprefixer` `10.4.24` → `10.4.27` and related repository/tooling alignment

## [2026-03-01] - *[Minor Release v1.2.0](https://github.com/striae-org/striae/releases/tag/v1.2.0)*

- **🔐 Authentication & Registration Iteration** - Continued login/registration flow development with new auth-registration config alignment and route-level integration updates
- **✅ Confirmation & Timestamp Reliability Fixes** - Corrected earliest annotation timestamp handling and refined confirmation-state saves with improved reviewer file refresh behavior
- **🛡️ Turnstile Refinement** - Iterated turnstile login implementation and validation/testing paths to strengthen access-guard behavior
- **🎨 Public Route/UI & Asset Cleanup** - Applied targeted home/public CSS fixes and synchronized supporting public assets/screenshots for cleaner presentation
- **⚙️ Config/Worker/Deploy Synchronization** - Updated worker compat/config examples, cross-platform deploy scripts, and repository hygiene to reduce config drift
- **📦 Dependency Maintenance** - Updated Firebase to `12.10.0` and `@typescript-eslint/parser` to `8.56.1` with associated package alignment

## [2026-02-27] - *[Patch Release v1.1.5](https://github.com/striae-org/striae/releases/tag/v1.1.5)*

- **⚖️ Legal & Compliance Hardening** - Expanded Terms and policy language across account types, fees, maintenance, confidentiality, dispute resolution, and forensic responsibility allocation
- **🔐 Consent and Data-Handling Clarifications** - Refined cookie/consent integration and aligned user-facing data control/retention messaging with current security and audit posture
- **🧭 Public Route & UI Refinements** - Iterated root/public route behavior, viewport handling, and layout/styling cleanup for more consistent legal/public page presentation
- **💳 Billing & Support Surface Updates** - Added/updated Stripe-related customer pathways and support/contact wording for clearer account-service expectations
- **🧹 Dependency and Repository Maintenance** - Included `vite-tsconfig-paths` update plus npm/yarn maintenance and ongoing `.gitignore`/deployment-config hygiene work

## [2026-02-23] - *[Patch Release v1.1.4](https://github.com/striae-org/striae/releases/tag/v1.1.4)*

- **📱 Mobile Detection Route Refinements** - Rerouted and refined device detection behavior for cleaner route handling on mobile/tablet access paths
- **🧭 Public Route Consistency Fixes** - Cleaned up route CSS, fixed root conditional behavior, and corrected logo link positioning on support/bugs and related public routes
- **🔗 Navigation Cleanup** - Iterated and stabilized sidebar blog-link behavior with final cleanup of transient navigation states
- **📄 Policy & Docs Maintenance** - Updated policy date references and performed documentation cleanup/removal passes
- **🧹 Repository Hygiene** - Consolidated `.gitignore`/config tracking updates (including worker directory and TOML/public handling) for cleaner project maintenance

## [2026-02-20] - *[Patch Release v1.1.3](https://github.com/striae-org/striae/releases/tag/v1.1.3)*

- **📊 Account Deletion Progress Tracking** - Added real-time per-case deletion progress with streaming updates and a red progress bar in the delete-account modal
- **✅ Zero-Case Completion Fix** - Successful account deletions with zero cases now correctly show `100%` progress
- **📱 Public Route Display Refinements** - Adjusted mobile/tablet threshold and logo visibility behavior on home and related public-facing routes
- **📄 Notice & Legal Content Updates** - Refined notice modal content/spacing and updated Terms/Privacy short-form text
- **🔒 Security Metadata Maintenance** - Updated `security.txt` advisory link, expiry, and PGP key material
- **🎨 CSS Baseline Consolidation** - Consolidated Tailwind/reset layering and refined global styling consistency

## [2026-02-15] - *[Patch Release v1.1.2](https://github.com/striae-org/striae/releases/tag/v1.1.2)*

- **🔒 HTML Injection Prevention** - Added comprehensive HTML entity escaping to all email form submissions (signup, bug reports, support, account deletion) to prevent XSS attacks
- **✅ Server-Side Validation** - Added required checkbox validation (emailConsent, codeAgreement) on server to prevent direct API bypass
- **🎨 Form Component Consolidation** - Refactored form styling to use centralized FormMessage, FormButton, and FormField components (~77% CSS reduction)
- **🧹 Code Quality Improvements** - Entity-escaped JSX apostrophes, improved type safety, cleaned up unused styles across 5+ components
- **📊 CSS Architecture Optimization** - Eliminated duplicate error/success message and button styling across manage-profile, delete-account, case-import, and sidebar components

## [2026-02-13] - *[Patch Release v1.1.1](https://github.com/striae-org/striae/releases/tag/v1.1.1)*

- **📁 Multi-File Upload Support** - Upload multiple image files simultaneously using drag & drop or file picker with sequential processing
- **⏳ Sequential Upload Processing** - Files upload one-at-a-time in order with automatic permission refresh after each file
- **📊 Enhanced Progress Feedback** - Real-time file counter ("X of Y") and current filename display during batch uploads
- **✅ Automatic File List Refresh** - Case sidebar file list updates immediately after each file upload completes
- **🎨 Improved Upload UX** - Better visual feedback with per-file error messages and graceful failure handling

## [2026-02-08] - *[Minor Release v1.1.0](https://github.com/striae-org/striae/releases/tag/v1.1.0)*

- **⚙️ Configuration Architecture** - Separated meta-config and app-config concerns for better security and maintainability
- **📚 Enhanced Documentation** - Comprehensive updates to user guides, deployment guides, and environment setup
- **🎨 Branding Updates** - Added new logos and deploy assistance references
- **🛠️ Deploy Script Improvements** - Enhanced deploy-config scripts to handle separated configuration files
- **📦 Dependency Updates** - Updated Cloudflare Workers Types and React to stable release
- **🗺️ Sitemap Fixes** - Resolved sitemap routing issues for improved SEO

## [2026-02-05] - *[Patch Release v1.0.5](https://github.com/striae-org/striae/releases/tag/v1.0.5)*

- **✅ Confirmation Status Indicators** - Applied visual confirmation indicators to case number displays and file lists
- **⚡ Performance Optimizations** - Fixed infinite re-render loops and improved component rendering efficiency
- **🎨 Design System Integration** - Standardized style token usage in some components for consistent design
- **🗺️ Dynamic Sitemap** - Implemented dynamic sitemap generation for improved SEO and discoverability
- **📦 Dependency Updates** - Updated Firebase, ESLint, TypeScript ESLint, and other core dependencies for security and compatibility

## [2026-01-31] - *[Stable Release v1.0.4](https://github.com/striae-org/striae/releases/tag/v1.0.4)*

- **📅 Annotation Date Tracking Fix** - Fixed earliest annotation date tracking in case exports and the notes sidebar
- **⏱️ Enhanced Timing Normalization** - Improved SHA256 timing normalization for more accurate cryptographic operations
- **🌐 Community Presence Updates** - Removed Discord and Open Collective references per organizational updates
- **🏆 OIN Badge Update** - Updated Open Invention Network badge to version 2.0
- **🧹 Code Cleanup** - Removed unused code and updated development dependencies

## [2025-10-04] - *[Release Candidate v1.0.3](https://github.com/striae-org/striae/releases/tag/v1.0.3)*

- **📱 Enhanced Mobile/Tablet Detection** - Significantly improved iPad landscape detection and multi-method device identification for better desktop-only enforcement
- **❓ Login Help Integration** - Added user-friendly login assistance and guidance directly on the home page
- **🏗️ Infrastructure Cleanup** - Streamlined routing architecture and build scripts for better maintainability
- **🔧 Development Improvements** - Dependency updates and code organization enhancements

## [2025-10-02] - *[Release v1.0.2](https://github.com/striae-org/striae/releases/tag/v1.0.2)*

- **🎨 Enhanced Login/Registration Flow** - Comprehensive UI improvements with better form styling, improved error messaging, and streamlined user experience
- **🏛️ Agency Registration System** - Complete agency onboarding system with automated email validation and domain verification
- **🔐 Zero Trust Access Policies** - Implementation of secure agency access controls with domain-based authentication requirements
- **✨ Form Component Enhancements** - Modernized form styling with improved validation feedback and consistent design patterns

## [2025-10-01] - *[Release v1.0.1](https://github.com/striae-org/striae/releases/tag/v1.0.1)*

- **🔧 Audit System Enhancements** - Improved audit reporting functionality with enhanced text summaries and hover text
- **📊 Export System Improvements** - Enhanced CSV export formatting and confirmation workflow fixes
- **🐛 Critical Bug Fixes** - Resolved self-confirmation flag issues and error logging improvements

## [2025-10-01] - *[Release v1.0.0](https://github.com/striae-org/striae/releases/tag/v1.0.0)*

- **🎉 Stable Production Release** - First stable release of Striae marking production readiness after comprehensive beta development and testing. See release notes for full details.
- **Critical Bug Fixes** - Resolved filename collision handling during case import and fixed file name display issues in import orchestrator

## [2025-09-28] - *[Release v0.9.28-beta](https://github.com/striae-org/striae/releases/tag/v0.9.28-beta)*

- **Cryptographic Security Enhancement** - Complete migration from CRC32 to SHA-256 for forensic-grade data integrity validation with tamper-proof hash generation
- **Infrastructure Modernization** - Full TypeScript conversion of all 7 Cloudflare Workers providing enhanced type safety and error prevention
- **Performance Optimization** - Batch processing implementation for large case file operations and audit entries preventing timeout issues
- **Enhanced Documentation** - White paper integration and comprehensive SHA-256 security guides for forensic compliance

## [2025-09-24] - *[Release v0.9.24-beta](https://github.com/striae-org/striae/releases/tag/v0.9.24-beta)*

- **Storage Function Centralization** - Unified all data operations into centralized utility modules with built-in permission validation and security controls
- **Audit Trail System Corrections** - Fixed filtering logic, reorganized activity categories, and consolidated action types for accurate audit tracking  
- **Enhanced Permission Validation** - Mandatory access control for all case operations preventing security bypasses with comprehensive type safety
- **Comprehensive Testing & QA** - Extensive pre-release candidate testing ensuring production readiness for October 1, 2025 release candidate

## [2025-09-22] - *[Release v0.9.22a-beta](https://github.com/striae-org/striae/releases/tag/v0.9.22a-beta)*

- **Comprehensive Audit Trail System** - Complete forensic audit logging providing full visibility into all case-related activities, user actions, and system operations with 5-phase workflow categorization
- **Mandatory Case Linkage Enhancement** - All case-related operations now require case number association ensuring complete audit trail integrity for forensic documentation  
- **Enhanced Box Annotation Auditing** - Complete audit logging for box annotation creation, editing, and deletion with position data, color information, and file context
- **File Lifecycle Tracking** - Comprehensive file operation logging including uploads, access, and deletion with integrity validation and performance metrics
- **Authentication Activity Monitoring** - Complete user action tracking including login, logout, MFA operations, and profile management with security event logging

## [2025-09-22] - *[Release v0.9.22-beta](https://github.com/striae-org/striae/releases/tag/v0.9.22-beta)*

- **Authenticated Confirmations System** - Complete implementation of firearms identification workflow with digital examiner verification and cryptographic integrity
- **Independent Review Process** - Structured export/import workflow allowing reviewing examiners to confirm original findings with full audit trail
- **Confirmation Security Framework** - Multi-layer validation including checksum verification, timestamp validation, and self-confirmation prevention
- **Enhanced Documentation** - Comprehensive confirmation guides and FAQ integration covering complete workflow from examination to final documentation

## [2025-09-20] - *[Release v0.9.20-beta](https://github.com/striae-org/striae/releases/tag/v0.9.20-beta)*

- **Export Security Enhancement** - Multi-layer authentication and validation for all case export operations with improved error handling
- **Case Review Import System** - Comprehensive ZIP package import utility allowing complete case review with automatic read-only protection
- **Complete Image Integration** - Seamless import of cases with all associated images, annotations, and metadata preservation
- **Production Code Quality** - Comprehensive console log cleanup while maintaining essential error logging and audit trails

## [2025-09-18] - *[Release v0.9.18-beta](https://github.com/striae-org/striae/releases/tag/v0.9.18-beta)*

- **Automated Deployment System** - Streamlined deployment scripts with unified `deploy:all` command and enhanced cross-platform support
- **CSS Architecture Improvements** - Global button hover effects system and mobile responsiveness cleanup for desktop-first focus
- **Developer Documentation Updates** - Restructured installation guide, enhanced environment setup documentation, and improved developer workflow
- **Infrastructure Enhancements** - Improved build system, dependency management, and deployment script organization

## [2025-09-17] - *[Release v0.9.17a-beta](https://github.com/striae-org/striae/releases/tag/v0.9.17a-beta)*

- **ZIP Export System with Images** - Advanced ZIP package generation with automatic image inclusion for complete case archival
- **Enhanced Export Interface** - Smart "Include Images" checkbox with intelligent UI logic for optimal user experience
- **Excel Format Optimization** - Box annotations now split into separate rows matching CSV structure for improved data analysis
- **Type System Cleanup** - Removed unused type definitions and reorganized type architecture for better maintainability
- **Code Quality Improvements** - Eliminated redundant files, optimized imports, and enhanced TypeScript compliance
- **Comprehensive Documentation Updates** - Updated all developer and user documentation reflecting new ZIP export capabilities

## [2025-09-17] - *[Release v0.9.17-beta](https://github.com/striae-org/striae/releases/tag/v0.9.17-beta)*

- **Comprehensive Case Data Export System** - Complete multi-format export functionality with JSON, CSV, and Excel (XLSX) support
- **Advanced Export Features** - Single case and bulk export capabilities with real-time progress tracking and intelligent error handling
- **Professional XLSX Integration** - Multi-worksheet Excel files with summary data and detailed case information using SheetJS library
- **Enhanced User Interface** - Polished export modal with format selection, progress visualization, and responsive design
- **Complete Documentation Suite** - Comprehensive user guides, FAQ section, and developer documentation for export functionality
- **Data Completeness Parity** - All 22 annotation fields available across all export formats ensuring comprehensive coverage
- **Robust Error Recovery** - Export operations continue processing even when individual cases encounter errors
- **Smart File Organization** - Automatic descriptive filename generation with timestamps and case identifiers

## [2025-09-15] - *[Release v0.9.15.1-beta](https://github.com/striae-org/striae/releases/tag/v0.9.15.1-beta)*

- **Interactive Box Annotation System** - Complete implementation of interactive box drawing tool with real-time annotation capabilities
- **Box Color Selection Interface** - Dynamic color selector with preset colors and custom color wheel for box annotations
- **Enhanced PDF Integration** - Box annotations now render accurately in PDF reports with exact positioning and color preservation
- **Improved UI/UX Components** - Refined toolbar integration, z-index management, and transparent annotation styling
- **Robust Position Management** - Fixed box annotation positioning with absolute coordinate system for stable multi-box support

## [2025-09-15] - *[Release v0.9.15-beta](https://github.com/striae-org/striae/releases/tag/v0.9.15-beta)*

- **Security & Authentication Enhancements** - Comprehensive MFA improvements with phone validation, demo number prevention, and enhanced user validation systems
- **Complete Account Deletion System** - Major feature implementation with email notifications, safety measures, demo account protection, and auto-logout functionality
- **User Management & Permissions** - Demo account system with permission-based access control, account limits, and enhanced profile management
- **Infrastructure & Developer Experience** - Documentation updates, Open Collective integration, automatic versioning, and comprehensive code cleanup
- **Technical Improvements** - TypeScript conversions, worker enhancements, security policy updates, and automated workflow improvements
- **UI/UX Enhancements** - Toast notification system, PDF generation improvements, navigation enhancements, and mobile responsiveness upgrades

## [2025-09-10] - *[Release v0.9.10-beta](https://github.com/striae-org/striae/releases/tag/v0.9.10-beta)*

- **Authentication System Enhancements** - Simplified login process with email validation and disabled profile email updates for security
- **Documentation & Developer Experience** - Comprehensive developer documentation with installation guides, architecture diagrams, and development protocols
- **UI/UX Improvements** - Enhanced homepage with developer information, consistent card hover effects, and LinkedIn icon integration
- **Code Quality & Maintenance** - Extensive code cleanup, dependency updates, and unified deployment scripts
- **Security & Configuration** - Improved Turnstile keys portability, removed redundant configurations, and enhanced gitignore specifications
- **Developer Tools** - Added Patreon widget development, console flair enhancements, and internal developer workflow improvements
- **Bug Fixes & Optimizations** - Fixed installation guide issues, removed deprecated mobile references, and streamlined configuration management

## [2025-09-06] - *[Release v0.9.06-beta](https://github.com/striae-org/striae/releases/tag/v0.9.06-beta)*

- **Installation & Setup Improvements** - Comprehensive installation guide and simplified setup process
- **Worker Infrastructure Enhancements** - Security hardening and configuration portability improvements
- **UI/UX Enhancements** - Added homepage about section, improved mobile responsiveness, and enhanced authentication components
- **Security & Data Management** - Free email domain filtering and enhanced authentication security measures
- **Community & Project Management** - Patreon integration, GitHub issue templates, and Code of Conduct
- **Bug Fixes & Optimizations** - PostCSS fixes, configuration improvements, and dependency updates
- **Developer Experience** - Enhanced documentation, worker optimizations, and deployment script improvements

## [2025-09-01] - *[Release v0.9.0-beta](https://github.com/striae-org/striae/releases/tag/v0.9.0)*

- Global CSS corrections and cleanup
- Numerous code cleanups and adjustments
- Created a footer modal component for in-app support (main app is now a single-screen interface)
- Refactored sidebar components to reduce redundancy and improve maintainability
- Created user's guide documentation

## [2025-08-26] - *Pre-Beta Release*

## 🔐 Authentication & Security Enhancements

### Multi-Factor Authentication (MFA)

- ✅ **Complete MFA system** with phone-based verification

### Login System Improvements

- ✅ **Simplified login process (email & password only)** with better error handling

---

## 🎨 UI/UX Improvements

### Visual Enhancements

- ✅ **Firefox compatibility** - Fixed text color issues
- ✅ **Consistent branding** - Logo links across all landing pages
- ✅ **Professional icons** - Replaced emoji in password fields with custom SVG icons
- ✅ **Improved form interactions** and visual feedback

---

## 📄 PDF Generation & Reporting

### New PDF Functionality

- ✅ **Complete PDF generation system**
- ✅ **Dynamic filename generation** for reports
- ✅ **Toast notifications** for PDF generation status
- ✅ **Enhanced button components** for PDF actions and status

---

## 📋 Content & Legal Updates

### Documentation

- ✅ **Simplified Terms & Conditions and Privacy Policy Sheets**
- ✅ **Compliance updates** for data control terms

---

## 🐛 Bug Fixes & Optimizations

### Canvas & Annotation System

- ✅ **Memory management** - Cleanup on component unmount
- ✅ **State management** - Clear displays on case/image changes
- ✅ **Improved interaction handling**

### General Improvements

- ✅ **Index labeling** to include numbers OR letters
- ✅ **Notes display** fixes
- ✅ **Form enhancements**
- ✅ **Link corrections** across application

---

## 📊 Development Statistics

- **94 commits** in 4 days
- **7 major feature areas** enhanced
- **3 new components** created
- **1 new worker module** implemented

---

## 🎯 Key Highlights

| Feature | Impact | Status |
| --------- | -------- | -------- |
| **MFA Implementation** | 🔒 Major security enhancement | ✅ Complete |
| **PDF Generation** | 📄 New core functionality | ✅ Complete |
| **UI Modernization** | 🎨 Better user experience | ✅ Complete |
| **Worker Infrastructure** | ⚡ Performance & scalability | ✅ Complete |
| **Code Quality** | 🛡️ SSR compatibility & error handling | ✅ Complete |

---

## [2025-08-23]

### ✨ Feature Additions

- Annotations display completed!

### 🔒 Security Enhancements

- Replaced Cloudflare Zero Trust with registration password gateway
- Removed Google-linked sign-in
- Corrected Manage Profile to verify new email addresses before updating from old email address
- Added an inactivity timer to automatically sign user out after certain period of inactivity

#### 🐛 Bug Fixes

- Renaming cases bug: Saved notes did not transfer over to the new case number correctly. This operation was fixed.
- Clear canvas on image delete: Clear the canvas of any images when a single file is deleted.

#### 🎨 Interface Improvements

- Added a "Rename/Delete Case" button to hide critical functions behind an extra gateway

#### 🔧 Minor Updates

- Multiple wording and interface adjustments

---

## [2025-08-17]

### ✅ Added

- Cloudflare Zero Access Gateway integration for enhanced security and streamlined authentication.
- Minor description/wording updates throughout the app for clarity.
- Various code corrections and minor bug fixes for reliability.

#### 🚧 Planned

- Annotations display on the canvas
- Conversion to Adobe PDF

#### ✅ Stable Features

- Firebase Authentication methods
- Case management
- File upload & management
- Notes creation & management

---

## [2025-08-10] - Development Update

### Striae Development Indefinitely Suspended

Some of you know that at the end of 2024, I’d been working on a personal project close to my heart — Striae, a Firearms Examiner’s Comparison Companion.

The goal was simple but powerful: give firearms examiners a secure, organized way to upload bullet and cartridge case comparison images, link them to specific cases, and make notations directly tied to each image.

#### ✅ Core Features Built

- User login & account management
- Case management for organized workflows
- Upload images tied to cases
- Make and store notations linked to each specific image

#### 🔒 Security Measures Implemented

- 🔐 Firebase Authentication for login and admin management
- 🔐 Encryption in transit and at rest
- 🔐 Data segregation/isolation
- 🔐 Controlled access & monitoring
- 🔐 Comprehensive audit trail system for forensic accountability

#### 🔮 Future Outlook

Unfortunately, a few significant life upheavals forced me to pause development before reaching the printing tools and live display functions I had envisioned.

Rather than let it fade away in a private, closed folder, I’ve opened the code archive to the public. Every project that I had built in the previous few years has been founded on the principle of contributing to the public good. My hope is that someone with the skills and interest might pick up where I left off — improve it, adapt it, and maybe even take Striae further than I imagined. If that sounds like you (or you know someone who'd be interested), the code is now available for anyone to view and build upon. If circumstances allow, I may resume development in the future and take this to the finish line.
