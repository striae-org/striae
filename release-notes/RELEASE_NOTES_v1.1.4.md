# Striae Release Notes - v1.1.4

**Release Date**: February 23, 2026
**Period**: February 20 - February 23, 2026
**Total Commits**: 38 (route/mobile refinements, navigation cleanup, policy and docs maintenance, repository hygiene)

## ⚡ Route & Device-Flow Refinements

### Mobile Detection and Routing Behavior
- Rerouted and refined mobile detection flow to improve device-based route handling
- Updated route configuration and route-level logic for cleaner public/app transitions
- Applied route CSS cleanups to reduce display inconsistencies

### Root and Public Route Consistency
- Fixed root component conditionals affecting route presentation behavior
- Corrected support and bug-report route logo link positioning behavior
- Refined route-specific logo handling and mobile query behavior on public-facing pages

## 🧭 Navigation & UI Cleanup

### Sidebar Blog Link Iteration
- Iterated on blog-link placement within sidebar navigation and finalized cleanup behavior
- Reduced navigation churn by stabilizing link visibility decisions across commits

## 📄 Policy & Documentation Maintenance

### Policy Metadata
- Updated policy date references to keep legal metadata current

### Docs Cleanup
- Performed docs cleanup/removal passes to streamline maintained documentation surface

## 🧹 Repository & Configuration Hygiene

### Git and Config Cleanup
- Consolidated multiple `.gitignore` updates (including public/config/TOML handling)
- Restored worker directory tracking after ignore-rule adjustments
- Continued repository hygiene updates for deployment/config examples

## 📋 Key Fix Summary

| Category | Change | Impact |
|----------|--------|--------|
| Routing | Mobile detection reroute + route updates | More predictable device-based route behavior |
| UI/CSS | Root conditional + route CSS/logo link cleanups | Better visual and navigation consistency on public routes |
| Navigation | Sidebar blog-link cleanup iteration | Cleaner and more stable sidebar behavior |
| Policy | Policy date updates | Current legal/policy metadata |
| Maintenance | Docs and `.gitignore`/config cleanup | Reduced repository noise and safer config handling |

## 🔧 Technical Implementation Details

### Routing and Detection
- Updated route handlers and root conditional checks to align mobile-prevention behavior with route intent
- Refined device-detection and route stylesheet interactions on threshold-sensitive routes

### Maintenance Work
- Applied repeated repository normalization commits for ignore rules and tracked directories
- Cleaned documentation and related static maintenance artifacts

## 📊 Release Statistics
- **Files Modified**: 100+
- **Commits Included**: 38 (non-merge, since 2026-02-20)
- **Primary Areas**: Route/device-flow behavior, public-route UI cleanup, policy/docs maintenance, repository hygiene
- **Validation Status**: Build completed successfully (`npm run build`)

## Closing Note

v1.1.4 focuses on stabilizing route/device behavior and cleaning repository/documentation surfaces after the v1.1.3 patch line, with additional consistency fixes across root/public route presentation and navigation behavior.
