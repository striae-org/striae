# @striae-org/striae

Striae is a cloud-native forensic annotation application for firearms identification, built with React Router and Cloudflare Workers.

This npm package publishes the Striae application source for teams that run/develop their own Striae environment.

## Live Project

- Application: [https://striae.app](https://striae.app)
- Source repository: [https://github.com/striae-org/striae](https://github.com/striae-org/striae)
- Installation guide: [https://github.com/striae-org/striae/wiki/Installation-Guide](https://github.com/striae-org/striae/wiki/Installation-Guide)
- Releases: [https://github.com/striae-org/striae/releases](https://github.com/striae-org/striae/releases)
- Security policy: [https://github.com/striae-org/striae/security/policy](https://github.com/striae-org/striae/security/policy)

## What This Package Is

- A deployable source distribution of Striae app code.
- A package that includes worker examples and example configuration files.

## What This Package Is Not

- Not a small client SDK.
- Not a zero-config, ready-to-run desktop app.

## Striae Package Links

- npmjs: [https://www.npmjs.com/package/@striae-org/striae](https://www.npmjs.com/package/@striae-org/striae)
- GitHub Packages: [https://github.com/orgs/striae-org/packages/npm/package/striae](https://github.com/orgs/striae-org/packages/npm/package/striae)

## NPM Package Content Policy

This package intentionally includes only non-sensitive defaults and runtime source needed for setup.

Included:

- `app/` source (with `app/config-example/`)
- `functions/`, `public/`
- Worker package manifests
- Worker source files needed by the workers, including nested helper modules
- PDF worker example support files limited to `workers/pdf-worker/src/assets/generated-assets.example.ts` and `workers/pdf-worker/src/formats/format-striae.ts` (no extra PDF image assets or custom formats)
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

## License & IP

See [LICENSE](https://github.com/striae-org/striae/blob/master/LICENSE).

### Patent Notice

One or more methods, systems, or features of the Striae platform are the subject of a pending patent application. Open-source code made available by Striae is licensed under the Apache 2.0 license, which includes a patent license grant for the licensed code. No patent rights beyond those expressly granted by the applicable open-source license are conveyed by use of this platform. Additional details are available in the [NOTICE](https://github.com/striae-org/striae/blob/master/NOTICE) file.

## Support

- Support page: [https://www.striae.org/support](https://www.striae.org/support)
- Contact: [info@striae.org](mailto:info@striae.org)
