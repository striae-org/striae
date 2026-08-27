# Striae Release Notes - v10.2.6

**Release Date**: August 27, 2026
**Period**: August 25, 2026 - August 27, 2026
**Total Commits**: 14 (non-merge since the v10.2.5 release)

## Patch Release - Deployment GUI + Dependency Maintenance

## Summary

v10.2.6 introduces `npm run deploy-gui`, a local-only web GUI that wraps Striae's growing collection of deployment, configuration, testing, and maintenance scripts in a single browser-based interface. As the script inventory under `scripts/` has grown to cover environment configuration, key rotation, worker/Pages deployment, publishing, account/MFA utilities, and test suites, the GUI gives developers and contributors an easier, more discoverable way to manage Striae deployment and development without memorizing individual `npm run` commands or shell invocations. This release also restores the `tests/` directory to source control and refreshes a small set of root and worker dependencies.

![Striae Deploy GUI](https://striae.org/deploy-gui-screenshot.png)

## Detailed Changes

### Deployment GUI (New Feature)

- **`npm run deploy-gui`** - Added `scripts/deploy-gui/`, a dependency-free (`node:http` + `node:fs` only) local web server that exposes a whitelisted catalog of existing project scripts through a browser UI at `http://127.0.0.1:3737`. It is intentionally never wired into `deploy:all`, `build`, or CI — it is purely a developer convenience layer on top of scripts that already exist.
- **Action Groups** - Organizes the script inventory into logical groups: Setup (install root dependencies), Configuration (`deploy-config` and its `--update-env`, `--refresh-templates`, `--force-rotate-keys`, `--validate-only` variants, plus key registry upload), Workers (install/deploy per-worker or all workers, deploy worker secrets), Pages (deploy Pages secrets/frontend), Full Pipeline (`deploy:all`, redeploy-only), Publishing (npm/GitHub Packages, including dry runs), Account/MFA Utilities (TOTP enable/unenroll, account deletion), Tests (per-suite and full test runs), and Miscellaneous (license headers, compatibility dates, third-party license generation, and more).
- **Live Configuration Status** - Reads the current `.env` snapshot and key-pair state to show which secrets and generated keys are already configured before a script runs, so contributors can see deployment readiness at a glance.
- **Safety Posture** - Refuses to start when `NODE_ENV=production`, binds to `127.0.0.1` only, and requires a random per-process session token on every request so another localhost tab or page cannot drive it. All spawned commands come from a fixed script whitelist in `actions.mjs`, never from raw client input.
- **Interactive Prompt Handling** - `runner.mjs` precomputes the full ordered stdin answer batch for interactive scripts like `deploy-config.sh` up front from the `.env` snapshot and form submission, instead of trying to parse prompt output in real time, so answers are delivered reliably even when a script's prompts don't print visibly under piped stdio.
- **Cross-Platform Script Execution** - Worked around a Windows-specific Node `EINVAL` restriction on spawning `.cmd` files by re-invoking npm's own CLI via `node <npm_execpath>` for `npm run`-based actions, and requires the documented `npm run deploy-gui` entry point (rather than `node server.mjs` directly) on Windows so that variable is available.
- **New Root Scripts** - Added `npm run striae-install` (`npm install --legacy-peer-deps`) and `npm run striae-redeploy` (`bash ./scripts/deploy-all.sh --redeploy-only`) as first-class commands surfaced in the GUI's Setup and Full Pipeline groups.

### Test Suite Restoration

- **`tests/` Restored to Git** - Removed `tests/` from `.gitignore` and re-added the full existing test suite (app-level forensics, confirmations, case export/import, and security tests, plus per-worker data/audit/user/image/files tests) to source control so it is versioned and available to contributors going forward.

### Dependency and Compatibility Maintenance

- **Root Dependency Bumps** - Bumped root dependencies, including `wrangler` to `4.126.0`.
- **Worker Dependency Bumps** - Bumped dependencies across all six workers (`audit-worker`, `data-worker`, `files-worker`, `image-worker`, `lists-worker`, `pdf-worker`, `user-worker`) with matching `package-lock.json` refreshes.
- **Compatibility-Date Refresh** - Updated `compatibility_date` to the latest date in `wrangler.toml.example` and all worker `wrangler.jsonc.example` files.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.5.md
- **Commits Included**: 14 (non-merge commits from 2026-08-25 through 2026-08-27)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.6 focuses entirely on developer and contributor experience: the new deploy GUI makes Striae's growing script inventory easier to discover and run correctly, without changing any runtime behavior, API contracts, or storage formats for the deployed application itself.
