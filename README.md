# @striae-org/striae

Striae is a cloud-native forensic annotation application for firearms identification, built with React Router and Cloudflare Workers.

This npm package publishes the Striae application source and deployment scaffolding for teams that run their own Striae environment.

## Live Project

- Application: [https://striae.app](https://striae.app)
- Source repository: [https://github.com/striae-org/striae](https://github.com/striae-org/striae)
- Releases: [https://github.com/striae-org/striae/releases](https://github.com/striae-org/striae/releases)
- Security policy: [https://github.com/striae-org/striae/security/policy](https://github.com/striae-org/striae/security/policy)

## What This Package Is

- A deployable source distribution of Striae app code.
- A package that includes worker examples and example configuration files.

## What This Package Is Not

- Not a small client SDK.
- Not a zero-config, ready-to-run desktop app.

## npm Package, Installation, and Full Deployment

**Striae Package Links**

- npmjs: [https://www.npmjs.com/package/@striae-org/striae](https://www.npmjs.com/package/@striae-org/striae)
- GitHub Packages: [https://github.com/orgs/striae-org/packages/npm/package/striae](https://github.com/orgs/striae-org/packages/npm/package/striae)

1) Install the latest package:

```bash
npm i @striae-org/striae
```

2) Copy the package scaffold into the project root

```bash
cp -R node_modules/@striae-org/striae/. .
```

3) Reinstall using Striae's own package.json (includes dev deps like wrangler/react-router)

```bash
rm -rf node_modules package-lock.json
npm install
```

4) Prepare Firebase admin credentials (required before deploy-config can pass)

```bash
mkdir -p app/config
cp -f app/config-example/admin-service.json app/config/admin-service.json
```

5) Replace `app/config/admin-service.json` with your actual Firebase service account JSON

6) Authenticate Cloudflare CLI

```bash
npx wrangler login
```

7) Run guided config + full deployment

```bash
npm run deploy:all
```

## NPM Package Content Policy

This package intentionally includes only non-sensitive defaults and runtime source needed for setup.

Included:

- `app/` source (with `app/config-example/`)
- `functions/`, `public/`, `scripts/`
- Worker package manifests
- Worker source files except runtime entry files (`workers/*/src/*.ts` and excluding `workers/*/src/*worker.ts`)
- Worker example Wrangler configs (`workers/*/wrangler.jsonc.example`)
- Project-level example and build config (`.env.example`, `wrangler.toml.example`, `tsconfig.json`, etc.)

Excluded (by design):

- Real runtime config under `app/config/`
- Real worker config files (for example `workers/*/wrangler.jsonc`)
- Local secrets and machine-specific files
- Extra repository metadata not required for npm consumers

## Security Notes

- Do not commit secrets to `app/config/`, `.env`, or worker config files.
- Use only example files as templates and provide real values in your own private environment.
- Review release notes for security updates before deployment.

## License

See `LICENSE` and `NOTICE`.

## Support

- Support page: [https://www.striae.org/support](https://www.striae.org/support)
- Contact: [info@striae.org](mailto:info@striae.org)
