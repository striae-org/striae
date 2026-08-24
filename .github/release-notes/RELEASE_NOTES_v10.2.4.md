# Striae Release Notes - v10.2.4

**Release Date**: August 24, 2026
**Period**: August 24, 2026 (same-day)
**Total Commits**: 4 (non-merge since the v10.2.3 release)

## Patch Release - Patent Notice, CLA, and Contributor Signature Workflow

## Summary

v10.2.4 is a small, same-day legal/repository-hygiene patch. It adds patent-pending notices to `README.md`/`.github/README.md` and `NOTICE`, introduces an Individual Contributor License Agreement (CLA), and wires up a GitHub Actions workflow so contributors sign the CLA automatically via pull request comments. No application behavior, worker logic, or API contracts changed.

## Detailed Changes

### Patent Notice (Legal)

- **README Patent Notice** - Renamed the `License` section to `License & IP` in `README.md` and `.github/README.md`, linked directly to the `LICENSE` file, and added a `Patent Notice` subsection clarifying that one or more methods, systems, or features of the Striae platform are the subject of a pending patent application, that the Apache 2.0 license includes a patent license grant for the licensed code, and that no patent rights beyond those expressly granted are conveyed by use of the platform.
- **NOTICE Update** - Added a `Patent Pending` line to the top-level `NOTICE` file referencing Application No. 64/110,670 ("Software configured for forensic firearms verification", Utility under 35 U.S.C. 111(b)).

### Contributor License Agreement (Repository Hygiene)

- **New CLA Document** - Added `.github/CLA.md`, an Individual Contributor License Agreement covering copyright and patent license grants from contributors, retained ownership, representations, and a sign-off procedure via pull request comment.
- **CLA Assistant Workflow** - Added `.github/workflows/cla.yml` using `contributor-assistant/github-action@v2.6.1`, triggered on `issue_comment` and `pull_request_target` events, storing recorded signatures on the `cla-signatures` branch at `signatures/version1/cla.json`.
- **Contributing Guide Update** - `.github/CONTRIBUTING.md` now documents the CLA requirement and links to `CLA.md`, with the link updated to an absolute GitHub URL for correct resolution outside the repository root.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.3.md
- **Commits Included**: 4 (non-merge commits from 2026-08-24)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.4 is a legal-and-repository-hygiene-only patch with no changes to application behavior, worker logic, storage formats, or public APIs.
