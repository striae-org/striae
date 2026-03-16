# Striae Release Notes - v4.0.1

**Release Date**: March 15, 2026
**Period**: March 15 - March 15, 2026
**Total Commits**: 7 (non-merge; metadata/canonical URL alignment, worker subdomain validation fixes, and runtime/deployment maintenance)

## Patch Release - Metadata, Worker Routing, and Operational Refinements

## Summary

- Updated canonical URL behavior and page meta title handling for public-route metadata consistency.
- Fixed worker subdomain check behavior and patched signed URL GET handling in route-sensitive paths.
- Updated security disclosure metadata and refreshed generated worker runtime types.
- Simplified deployment script behavior for lowercase worker naming and subdomain automation consistency.
- Preserved release stability with targeted patch-level fixes and low-risk maintenance updates.

## Detailed Changes

### Metadata and Canonical URL Alignment

- Updated canonical URL handling to reduce route-surface inconsistencies.
- Refreshed page meta title behavior for public-facing metadata correctness.

### Worker Routing and Signed URL Stabilization

- Fixed worker subdomain check logic in proxy-sensitive routes.
- Patched signed URL GET handling to align with expected worker route validation semantics.

### Security and Runtime Maintenance

- Updated security.txt metadata to reflect current release posture.
- Refreshed Wrangler-generated types to keep worker runtime contracts synchronized.
- Simplified worker script naming/subdomain automation behavior for cleaner operations.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Metadata Consistency | Canonical URL and meta-title updates | Improves SEO consistency and reduces public-route metadata drift |
| Worker Route Validation | Subdomain check corrections and signed URL GET patch | Improves route and auth correctness for worker-bound requests |
| Security Metadata | security.txt refresh | Keeps disclosure and policy metadata current for this release |
| Deployment Operations | Worker-name casing and subdomain automation cleanup | Reduces script fragility and config drift risk |
| Runtime Contracts | Wrangler type refresh | Keeps generated runtime types aligned with deployed worker interfaces |

## Technical Implementation Details

### App Metadata Layer

- Canonical URL and meta-title adjustments were applied to align route-level output with current domain and release metadata expectations.

### Worker Proxy and Validation Layer

- Subdomain validation checks were corrected.
- Signed URL GET behavior was patched for route-sensitive worker integration paths.

### Tooling and Script Layer

- Worker automation scripts were refined for consistent lowercase worker-name handling.
- Runtime type generation outputs were refreshed to match current worker definitions.
- Security metadata surfaces were updated in the release window.

## Release Statistics

- **Commit Range**: `v4.0.0..v4.0.1`
- **Commits Included**: 7 (non-merge)
- **Build Status**: Succeeded (`npm run build`)
- **Typecheck Status**: Succeeded (`npm run typecheck`)
- **Lint Status**: Succeeded with warnings (`npm run lint`: 0 errors, 2 warnings)

## Commits Included (non-merge)

- `b170fb09` patch signed url get
- `23f1ffb1` update canonical urls
- `938d0d50` upd security.txt
- `d99efb2c` update meta titles
- `2db492e1` refresh wrangler types
- `7782072b` fix worker subdomain checks
- `6c924a99` refresh, script - worker names lowercase, simplify worker subdomain automations

## Closing Note

v4.0.1 delivers targeted patch-level refinements focused on metadata consistency, worker routing validation, and operational hardening while maintaining the secure baseline established in v4.0.0.
