# Striae Release Notes - v9.0.0

**Release Date**: August 4, 2026
**Period**: July 31, 2026 to August 4, 2026
**Total Commits**: 6 (non-merge after the v8.1.4 release)

## Major Release - Forensic Authorization Hardening and Security Remediation

## Summary

v9.0.0 is a security-focused major release that closes [GHSA-qgj2-x8xw-v75r](https://github.com/striae-org/striae/security/advisories/GHSA-qgj2-x8xw-v75r), reported by [@arpitjain099](https://github.com/arpitjain099). It restores the intended authorization boundary around forensic signing paths so authenticated users cannot mint confirmation signatures for cases they do not own or cannot access, and it includes release-window dependency refreshes plus small repository hygiene follow-ups.

## Detailed Changes

### Forensic Authorization Hardening

- Restored strict authorization checks on forensic data proxy paths so authenticated requests cannot bypass user scoping.
- Added shared forensic authorization helpers to verify authenticated user context, case access, and request/user identity alignment before signing occurs.
- Hardened confirmation signing so the signer must be the authenticated exporter and must have access to the referenced case before a signature is minted.
- Kept related worker and proxy configuration examples aligned with the forensic authorization boundary changes.

### Dependency and Package Maintenance

- Refreshed root and worker package manifests and lockfiles as part of the release-window maintenance cycle.
- Kept the package metadata aligned with the new major release line.

### Repository Hygiene Follow-Up

- Updated repository ignore rules as part of the release window.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v8.1.4.md
- **Commits Included**: 6 (non-merge commits from 2026-07-31 through 2026-08-04)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v9.0.0 closes the reported forensic authorization bypass and raises the release line to a major version to reflect the security boundary correction.
