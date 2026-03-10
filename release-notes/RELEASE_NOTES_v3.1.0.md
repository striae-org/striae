# Striae Release Notes - v3.1.0

**Release Date**: March 10, 2026
**Period**: March 9 - March 10, 2026
**Total Commits**: 20 (non-merge)

## Minor Release - Verification UX, Security Hardening, and Tooling Cleanup

### Summary

- Removed hash utility pathways and hash value exposure from validation UI flows.
- Added a public signing key modal for exports, including copy-to-clipboard support and verification guidance.
- Improved export modal behavior and containment (cursor handling, action placement, and layout stability).
- Completed ESLint flat-config migration and broad lint cleanup.
- Applied compatibility/configuration maintenance and repository hygiene updates.

### Included Commits (Non-Merge)

- `06fc2fe` add ol ul li styling global
- `fe1163e` cursor default
- `743d63c` fix export modal
- `127d2c0` move button
- `fb8b282` add public key display modal
- `ca9ccf6` upd README
- `252ed6c` upd striae bg image
- `8390f33` rm hash value exposures to ui
- `a67bc58` rm @types/xlsx
- `2dac779` upd compat, remove xlsx types
- `630b586` fix export case modal
- `6da5a5b` fix default cursor on modals
- `960b71f` rm hash utility
- `1ccb1eb` lint warning cleanups
- `398d54b` global linting cleanup
- `a356cf3` eslint flat config migration
- `5514434` clean up intructions
- `2ba9442` upd gitignore
- `6861cdc` gitignore release notes
- `13e941f` rm mobile prevented and stale utils
