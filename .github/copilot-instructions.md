# Striae - AI Coding Agent Instructions (Trimmed)

This file is intentionally concise. Keep only durable, high-signal rules that affect coding behavior.
For deep implementation details, use the wiki docs.

## Scope and Architecture Snapshot

- Frontend: React Router app in `app/`, deployed with Cloudflare Pages.
- Workers: `user`, `image`, `pdf`, `data`, `keys`, and `audit` in `workers/`.
- Data services: Firebase Auth plus Cloudflare KV, R2, and Images.
- Config sources:
  - App runtime: `app/config/config.json`
  - Example config: `app/config-example/`
  - Worker config: `workers/*/wrangler.jsonc` (JSONC, not TOML)
- Import alias: `~/` maps to `app/`.

## Highest-Priority Rules

1. Use centralized utilities for app data and permissions.
   - `app/utils/data-operations.ts`
   - `app/utils/permissions.ts`
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
7. Publish with `npm run publish:all` only when explicitly requested.

## Source-of-Truth Docs

Use these for details that are intentionally not duplicated here:

- `wiki/striae.wiki/Architecture-Guide.md`
- `wiki/striae.wiki/API-Reference.md`
- `wiki/striae.wiki/Security-Guide.md`
