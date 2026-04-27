# Striae Release Notes - v7.1.1

**Release Date**: April 27, 2026
**Period**: April 25, 2026 through April 27, 2026
**Total Commits**: 3 (non-merge after the v7.1.0 bump)

## Patch Release - Manual Account Deletion Script and Maintenance

## Summary

v7.1.1 adds a manual account deletion script with streaming output to support operator-driven account cleanup workflows. This release also includes a code review follow-up pass on the deletion script and general dependency bumps with compatibility date refreshes across all workers.

## Detailed Changes

### Manual Account Deletion Script

- Added `scripts/delete-account.mjs` — a Node.js script that performs a complete, operator-driven account deletion using the Firebase Admin SDK and Cloudflare worker APIs. The script uses streaming output to provide real-time progress feedback during deletion.
- Registered the script as `npm run delete-account` in `package.json`.
- Applied a code review follow-up pass (`dcf9623e`) expanding error handling, improving output formatting, and refining the streaming behavior for robustness.

### Maintenance

- Bumped app and worker dependencies and refreshed Cloudflare compatibility dates across all worker `wrangler.jsonc.example` files and `wrangler.toml.example`.

## Release Statistics

- **Baseline**: `.github/release-notes/RELEASE_NOTES_v7.1.0.md`
- **Commits Included**: 3 (non-merge commits after `v7.1.0` on 04/25/2026)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v7.1.1 is a focused patch delivering the manual account deletion tooling and routine maintenance. The deletion script gives operators a reliable, observable path for account cleanup without requiring direct database access.
