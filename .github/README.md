# 🔫 Striae - A Firearms Examiner's Comparison Companion

## npm Package, Installation, and Full Deployment

**[Striae on npm](https://github.com/orgs/striae-org/packages/npm/package/striae)**

1) Install the latest package:

```bash
npm i @striae-org/striae
```

2) Copy the package scaffold into the project root

```bash
cp -R node_modules/@striae-org/striae/. .
```

3) Reinstall using Striae's own package.json (includes dev deps like wrangler/react-router)

```bash
rm -rf node_modules package-lock.json
npm install
```

4) Prepare Firebase admin credentials (required before deploy-config can pass)

```bash
mkdir -p app/config
cp -f app/config-example/admin-service.json app/config/admin-service.json
```

5) Replace `app/config/admin-service.json` with your actual Firebase service account JSON

6) Authenticate Cloudflare CLI

```bash
npx wrangler login
```

7) Run guided config + full deployment

```bash
npm run deploy:all
```

## 🌐 Application URL

**[Live App](https://www.striae.org)**

## 💬 Contact & Support

**[Striae Support](https://www.striae.org/support)**

**[Email Support](mailto:info@striae.org)**

## 👥 Project Maintainers

[![Stephen J. Lu](https://github.com/StephenJLu.png?size=50)](https://github.com/StephenJLu)

---

## 📋 Changelog

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
