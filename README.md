# @striae/striae

Striae is a cloud-native forensic annotation application for firearms identification, built with Remix and Cloudflare Workers.

This npm package publishes the Striae application source and deployment scaffolding for teams that run their own Striae environment.

## Live Project

- Application: [https://www.striae.org](https://www.striae.org)
- Source repository: [https://github.com/striae-org/striae](https://github.com/striae-org/striae)
- Releases: [https://github.com/striae-org/striae/releases](https://github.com/striae-org/striae/releases)
- Security policy: [https://github.com/striae-org/striae/security/policy](https://github.com/striae-org/striae/security/policy)

## What This Package Is

- A deployable source distribution of Striae app code.
- A package that includes worker examples and example configuration files.

## What This Package Is Not

- Not a small client SDK.
- Not a zero-config, ready-to-run desktop app.

## Install

```bash
npm install @striae/striae
```

## First-Time Setup

1. Copy files from `app/config-example/` into `app/config/`.
2. Set your environment values in `.env` based on `.env.example`.
3. Create worker config files from each `wrangler.jsonc.example`.
4. Install dependencies and run locally.

## Common Scripts

```bash
npm run dev
npm run build
npm run deploy:all
npm run deploy-workers
npm run deploy-pages
npm run publish:npm
```

## NPM Package Content Policy

This package intentionally includes only non-sensitive defaults and runtime source needed for setup.

Included:

- `app/` source (with `app/config-example/`)
- `functions/`, `public/`, `scripts/`
- Worker package manifests
- Worker example source files (`workers/*/src/*.example.ts`)
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
