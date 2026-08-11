# Striae - AI Coding Agent Instructions (Trimmed)

This file is intentionally concise. Keep only durable, high-signal rules that affect coding behavior.
For deep implementation details, use the wiki docs.

## Scope and Architecture Snapshot

- Frontend: React Router app in `app/`, deployed with Cloudflare Pages.
- Workers: `audit`, `data`, `image`, `lists`, `pdf`, and `user` in `workers/`.
- Data services: Firebase Auth plus Cloudflare KV, R2, and Images.
- Config sources:
  - App runtime: `app/config/config.json`
  - Example config: `app/config-example/`
  - Worker config: `workers/*/wrangler.jsonc` (JSONC, not TOML)
- Import alias: `~/` maps to `app/`.

## Highest-Priority Rules

1. Use centralized utilities for app data and permissions.
   - `app/utils/data/data-operations.ts`
   - `app/utils/data/permissions.ts`
   - `app/services/audit/audit.service.ts`
   - Avoid introducing direct worker `fetch` calls in `app/components` or `app/routes` unless extending these utility modules.
2. Validate permissions before case operations.
   - Read access: `canAccessCase`
   - Write access: `canModifyCase`
   - Create access: `canCreateCase`
   - Do not bypass validation with options like `skipValidation` unless explicitly required and documented.
3. Audit security-sensitive operations.
   - Case create/update/delete/export
   - Auth and MFA operations
   - Security violations and verification outcomes
4. Keep strict TypeScript safety.
   - Do not introduce `any` in production code.
   - Prefer shared types from `~/types` and use type guards when narrowing runtime data.

## UI and Styling Conventions

- Component organization:
  - Place components in `app/components/[feature]/`.
  - Use TypeScript interfaces for props.
  - Prefer named exports for components.
  - Use CSS Modules for component styling.
- Desktop-first policy:
  - Core app components in `app/components/` should not add mobile-first responsive behavior.
  - Mobile-responsive styling should be limited to public/auth/home routes.
- Theme tokens:
  - Use tokens defined in `app/components/theme-provider/theme.ts`.
  - Do not invent tokens (for example `--green` or `--gray`) unless added in theme definitions first.
- Global button hover behavior:
  - Shared hover lift is already defined in `app/styles/root.module.css`.
  - Do not duplicate `transform: translateY(-1px)` in component CSS.
- Indentation Style:
  - Use 1 tab character per indentation level.
  - Do not use spaces or mix for indentation.

## Worker Communication Expectations

- Use resilient worker communication patterns:
  - Check `response.ok` and return meaningful errors.
  - Handle failures per worker call to avoid cascading failures.
  - Use reasonable timeout/retry behavior for transient failures.
- Fail gracefully for secondary-service outages:
  - Audit failures should be logged but should not usually block core operations.

## Common Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run deploy:all
npm run deploy-workers
npm run deploy-workers:secrets
npm run deploy-pages
npm run publish:all
```

## Version and Release Workflow

When asked to bump to `vX.Y.Z`:

1. Identify non-merge commits since the previous release tag.
2. Bump version in `package.json` (for example `npm version patch|minor|major`) only if the version is not already at the desired version.
3. Create release notes at `release-notes/RELEASE_NOTES_vX.Y.Z.md`.
   - Include release date, covered period, and non-merge commit count. Use the previous release notes as a template. Don't rely on the previous git tag for context, as this is the development branch.
   - Summarize the release in a few sentences, then provide detailed sections for each major change.
   - Include a release statistics section with commit range, commit count, and CI status.
4. Update changelog in `.github/README.md`.
   - Add the newest release entry at the top of the Changelog section.
   - Link to the GitHub release tag URL.
5. Update supported version info in `.github/SECURITY.md` when applicable.
6. Run verification before publish:
   - `npm run build`
   - `npm run typecheck`
   - `npm run lint`
7. Trigger the GitHub Actions `Release and publish` workflow only when explicitly requested.

## Release Playbook (Tag-Based Publishing)

Use this checklist for release operations that publish to npm, GitHub Packages, and GitHub Releases.

- Confirm the package version in `package.json` matches the intended release version `vX.Y.Z`.
- Confirm the matching release notes file exists at `.github/release-notes/RELEASE_NOTES_vX.Y.Z.md`.
- Ensure the repo is on `master` and the working tree is clean before tagging.
- Commit release changes with a message like `Release vX.Y.Z`.
- Create a version tag exactly matching the package version:
  - `git tag vX.Y.Z`
- Push the release tag:
  - `git push origin vX.Y.Z`
- GitHub Actions will run the `Release and publish` workflow only for a tag push matching `v*.*.*`.
- The workflow enforces the following release gate:
  - tag format must be `vX.Y.Z`
  - package version in `package.json` must match the tag
  - the tag must point to the current `origin/master` HEAD
  - the working tree must be clean
- Before creating or pushing the release tag, run the local preflight checks and only proceed if they pass:
  - `npm run release:check`
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test` when the required secrets, config, and private files are available locally
- After the local preflight passes, the workflow will:
  - run `npm ci`
  - validate the release notes file
  - publish to npm using npm Trusted Publisher OIDC
  - publish to GitHub Packages
  - create the GitHub Release with the release-notes body
- Do not rely on a plain commit message alone; the workflow is tag-based, not commit-message-based.
- For manual local safety checks before tagging, run:
  - `npm run release:check`
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint`

## Source-of-Truth Docs

Use these for details that are intentionally not duplicated here:

- `../striae-wiki/wiki/striae.wiki/Home.md`
- `../striae-wiki/wiki/striae.wiki/Project-Overview.md`
- `../striae-wiki/wiki/striae.wiki/Installation-Guide.md`
- `../striae-wiki/wiki/striae.wiki/Environment-Variables-Setup.md`
- `../striae-wiki/wiki/striae.wiki/Architecture-Guide.md`
- `../striae-wiki/wiki/striae.wiki/Component-Guide.md`
- `../striae-wiki/wiki/striae.wiki/Utilities-Guide.md`
- `../striae-wiki/wiki/striae.wiki/API-Reference.md`
- `../striae-wiki/wiki/striae.wiki/Guide-Summaries.md`
- `../striae-wiki/wiki/striae.wiki/Security-Guide.md`
- `../striae-wiki/wiki/striae.wiki/Authenticated-Confirmation-System.md`
- `../striae-wiki/wiki/striae.wiki/Manifest-and-Confirmation-Signing.md`
- `../striae-wiki/wiki/striae.wiki/Export-Encryption.md`
- `../striae-wiki/wiki/striae.wiki/Data-at-Rest-Encryption.md`
- `../striae-wiki/wiki/striae.wiki/Encryption-Basics-and-Risks.md`
- `../striae-wiki/wiki/striae.wiki/Audit-Trail-System.md`
- `../striae-wiki/wiki/striae.wiki/PDF-Report-System.md`
- `../striae-wiki/wiki/striae.wiki/Error-Handling-Guide.md`
