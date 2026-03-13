# Release Notes — v3.1.1

**Release Date:** March 12, 2026
**Covered Period:** Since v3.1.0
**Non-merge Commits:** 13

## Changes

- `4fdfc0d` upd compat dates
- `b887a75` clean up icons
- `cd7a6d8` upd instructions
- `1c6ce86` patch pages secrets rm
- `0bac80b` upd integrity verification in audit report
- `055fca7` fix max-height
- `cb87fcf` separate signing-key display into component (#684)
- `6a89088` revert wrangler
- `17b3ca3` GHSA DepBot 127 fix
- `b7fb2a5` upd compat dates
- `b288ba0` wrangler upd
- `951710c` Bump isbot from 5.1.35 to 5.1.36

## Summary

- **🧹 Icon Sprite Cleanup** - Removed unused SVG symbols and manifest entries; sprite now contains only the 9 icons actively referenced in the app
- **🔑 Public Signing Key Component** - Extracted public signing key display into a dedicated component for cleaner modal integration
- **📋 Audit Report Integrity** - Updated integrity verification messaging in audit report output
- **📦 Dependency Updates** - Bumped isbot; applied DepBot security advisory fix (GHSA)
- **⚙️ Config and Compat Maintenance** - Refreshed Cloudflare compatibility dates, worker config, and Pages secrets handling
