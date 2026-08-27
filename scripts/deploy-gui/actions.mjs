// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Whitelist registry of every action the deploy GUI is allowed to run. This is the ONLY
 * place command/argv arrays are constructed — server.mjs and runner.mjs must never build a
 * command from raw client input. Every entry's argv is either a fixed constant array or
 * built from validated, typed form fields (never a raw shell string).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function bashScript(relativePath, flags = []) {
	return { cmd: 'bash', args: [`./${relativePath}`, ...flags] };
}

function npmRun(scriptName) {
	return { cmd: NPM_CMD, args: ['run', scriptName] };
}

function nodeScript(relativePath, args = []) {
	return { cmd: 'node', args: [`./${relativePath}`, ...args] };
}

function requireField(fields, name) {
	const value = fields?.[name];
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`Missing required field: ${name}`);
	}
	return value.trim();
}

export const ACTIONS = [
	// --- Configuration ---
	{
		id: 'deploy-config',
		label: 'Configure environment (deploy-config)',
		description: 'Interactive setup: creates/updates .env and regenerates worker/app config files.',
		group: 'Configuration',
		interactive: true,
		destructive: false,
		confirmType: null,
		build: () => bashScript('scripts/deploy-config.sh'),
	},
	{
		id: 'deploy-config-update-env',
		label: 'Reset .env from template (--update-env)',
		description: 'Backs up the current .env, resets it from .env.example, and re-prompts for every value.',
		group: 'Configuration',
		interactive: true,
		destructive: true,
		confirmType: 'type-to-confirm',
		envUpdateEnv: true,
		build: () => bashScript('scripts/deploy-config.sh', ['--update-env']),
	},
	{
		id: 'deploy-config-refresh-templates',
		label: 'Refresh templates (--refresh-templates)',
		description: 'Regenerates worker wrangler.jsonc/toml, firebase.ts, and config.json from templates, reapplying current .env values.',
		group: 'Configuration',
		interactive: true,
		destructive: false,
		confirmType: 'simple',
		build: () => bashScript('scripts/deploy-config.sh', ['--refresh-templates']),
	},
	{
		id: 'deploy-config-rotate-keys',
		label: 'Rotate all encryption keys (--force-rotate-keys)',
		description: 'Regenerates every signing/encryption key pair without prompting. Can invalidate prior signatures/encrypted data.',
		group: 'Configuration',
		interactive: true,
		destructive: true,
		confirmType: 'type-to-confirm',
		envForceRotateKeys: true,
		build: () => bashScript('scripts/deploy-config.sh', ['--force-rotate-keys']),
	},
	{
		id: 'deploy-config-validate-only',
		label: 'Validate configuration (--validate-only)',
		description: 'Checks the current .env and generated config files without modifying anything.',
		group: 'Configuration',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => bashScript('scripts/deploy-config.sh', ['--validate-only']),
	},
	{
		id: 'upload-registries',
		label: 'Upload key registries to R2',
		description: 'Encrypts and uploads key registry JSON files to the config R2 bucket.',
		group: 'Configuration',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => bashScript('scripts/upload-registries.sh'),
	},

	// --- Workers ---
	{
		id: 'install-workers',
		label: 'Install worker dependencies',
		description: 'Runs npm install in every worker directory.',
		group: 'Workers',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => bashScript('scripts/install-workers.sh'),
	},
	{
		id: 'deploy-workers',
		label: 'Deploy all workers',
		description: 'Deploys all 7 Cloudflare Workers.',
		group: 'Workers',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun('deploy-workers'),
	},
	...['audit', 'data', 'image', 'files', 'pdf', 'lists', 'user'].map((name) => ({
		id: `deploy-workers-${name}`,
		label: `Deploy ${name} worker`,
		description: `Deploys only the ${name} worker.`,
		group: 'Workers',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun(`deploy-workers:${name}`),
	})),
	{
		id: 'deploy-workers-secrets',
		label: 'Deploy worker secrets',
		description: 'Pushes secret values from .env to each worker via wrangler.',
		group: 'Workers',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => bashScript('scripts/deploy-worker-secrets.sh'),
	},

	// --- Pages ---
	{
		id: 'deploy-pages-secrets',
		label: 'Deploy Pages secrets',
		description: 'Pushes Pages environment variables from .env.',
		group: 'Pages',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => bashScript('scripts/deploy-pages-secrets.sh'),
	},
	{
		id: 'deploy-pages',
		label: 'Deploy Pages frontend',
		description: 'Builds and deploys the frontend to Cloudflare Pages.',
		group: 'Pages',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => bashScript('scripts/deploy-pages.sh'),
	},

	// --- Full Pipeline ---
	{
		id: 'deploy-all',
		label: 'Full deployment (deploy:all)',
		description: 'Runs the entire pipeline: config (--refresh-templates, prompts for values), workers, registries, secrets, pages.',
		group: 'Full Pipeline',
		interactive: true,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => bashScript('scripts/deploy-all.sh'),
	},
	{
		id: 'striae-redeploy',
		label: 'Redeploy existing config',
		description: 'Re-runs the deployment pipeline without regenerating configuration.',
		group: 'Full Pipeline',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => bashScript('scripts/deploy-all.sh', ['--redeploy-only']),
	},

	// --- Publishing ---
	{
		id: 'publish-npm-dry-run',
		label: 'Publish to npm (dry run)',
		description: 'Dry-run publish to the npm registry — no changes made.',
		group: 'Publishing',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('publish:npm:dry-run'),
	},
	{
		id: 'publish-npm',
		label: 'Publish to npm',
		description: 'Publishes the package to the public npm registry.',
		group: 'Publishing',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => npmRun('publish:npm'),
	},
	{
		id: 'publish-github-dry-run',
		label: 'Publish to GitHub Packages (dry run)',
		description: 'Dry-run publish to GitHub Packages — no changes made.',
		group: 'Publishing',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('publish:github:dry-run'),
	},
	{
		id: 'publish-github',
		label: 'Publish to GitHub Packages',
		description: 'Publishes the package to GitHub Packages.',
		group: 'Publishing',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => npmRun('publish:github'),
	},
	{
		id: 'publish-all-dry-run',
		label: 'Publish everywhere (dry run)',
		description: 'Dry-run publish to both npm and GitHub Packages.',
		group: 'Publishing',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('publish:all:dry-run'),
	},
	{
		id: 'publish-all',
		label: 'Publish everywhere',
		description: 'Publishes the package to both npm and GitHub Packages.',
		group: 'Publishing',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => npmRun('publish:all'),
	},

	// --- Account / MFA Utilities ---
	{
		id: 'enable-totp-mfa',
		label: 'Enable TOTP MFA provider',
		description: 'One-time Firebase project config change enabling TOTP MFA.',
		group: 'Account / MFA Utilities',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => nodeScript('scripts/enable-totp-mfa.mjs'),
	},
	{
		id: 'unenroll-totp-mfa',
		label: 'Unenroll a user from TOTP MFA',
		description: 'Removes TOTP MFA factors for a given Firebase user UID.',
		group: 'Account / MFA Utilities',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		fields: [{ name: 'uid', label: 'Firebase user UID', type: 'text', required: true }],
		build: (fields) => nodeScript('scripts/unenroll-totp-mfa.mjs', ['--', requireField(fields, 'uid')]),
	},
	{
		id: 'delete-account',
		label: 'Delete a user account',
		description: 'Permanently deletes a user account (KV, R2 files, case data, Firebase Auth).',
		group: 'Account / MFA Utilities',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		fields: [
			{ name: 'uid', label: 'Firebase user UID', type: 'text', required: true },
			{ name: 'url', label: 'Override base URL (optional)', type: 'text', required: false },
		],
		build: (fields) => {
			const uid = requireField(fields, 'uid');
			const args = ['--', uid, '--confirm'];
			if (fields?.url?.trim()) args.push('--url', fields.url.trim());
			return nodeScript('scripts/delete-account.mjs', args);
		},
	},

	// --- Tests ---
	{
		id: 'test-all',
		label: 'Run all tests',
		description: 'Runs the full test suite (app + all worker test suites).',
		group: 'Tests',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('test'),
	},
	{
		id: 'test-app',
		label: 'Run app tests',
		description: 'Runs the frontend app test suite.',
		group: 'Tests',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('test:app'),
	},
	...['data', 'audit', 'user', 'image', 'files'].map((name) => ({
		id: `test-workers-${name}`,
		label: `Run ${name} worker tests`,
		description: `Runs the test suite for the ${name} worker.`,
		group: 'Tests',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun(`test:workers:${name}`),
	})),
	{
		id: 'test-coverage',
		label: 'Run app tests with coverage',
		description: 'Runs the frontend app test suite and generates a coverage report.',
		group: 'Tests',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('test:coverage'),
	},

	// --- Miscellaneous ---
	{
		id: 'generate-third-party-licenses',
		label: 'Generate third-party licenses',
		description: 'Regenerates THIRD_PARTY_LICENSES.md from current dependencies.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('generate:third-party-licenses'),
	},
	{
		id: 'update-versions',
		label: 'Update markdown versions',
		description: 'Updates version references in markdown documentation.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('update-versions'),
	},
	{
		id: 'update-compatibility-dates',
		label: 'Update Workers compatibility dates',
		description: 'Bumps the compatibility_date in wrangler configs across all workers.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun('update-compatibility-dates'),
	},
	{
		id: 'add-license-headers',
		label: 'Add license headers',
		description: 'Inserts missing SPDX license headers across tracked source files.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun('add-license-headers'),
	},
	{
		id: 'check-license-headers',
		label: 'Check license headers',
		description: 'Verifies license headers without modifying any files.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('check-license-headers'),
	},
	{
		id: 'format',
		label: 'Format code (prettier --write)',
		description: 'Reformats source files in place with Prettier.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun('format'),
	},
	{
		id: 'format-check',
		label: 'Check formatting',
		description: 'Verifies formatting without modifying any files.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('format:check'),
	},
	{
		id: 'lint',
		label: 'Lint',
		description: 'Runs ESLint and the license header check.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('lint'),
	},
	{
		id: 'typecheck',
		label: 'Typecheck',
		description: 'Runs react-router typegen and tsc.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('typecheck'),
	},
	{
		id: 'release-check',
		label: 'Check release notes exist',
		description: 'Verifies release notes exist for the current package version.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('release:check'),
	},
	{
		id: 'security-admin-service-guard',
		label: 'Run admin-service security guard',
		description: 'Checks that the Firebase admin service key is not present in build output.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: false,
		confirmType: null,
		build: () => npmRun('security:admin-service-guard'),
	},
	{
		id: 'clean',
		label: 'Clean build artifacts',
		description: 'Removes build output and local caches (build/, node_modules/.cache, .cache).',
		group: 'Miscellaneous',
		interactive: false,
		destructive: true,
		confirmType: 'simple',
		build: () => npmRun('clean'),
	},
	{
		id: 'strip-modules',
		label: 'Strip all node_modules',
		description: 'Removes node_modules from the root and every worker directory.',
		group: 'Miscellaneous',
		interactive: false,
		destructive: true,
		confirmType: 'type-to-confirm',
		build: () => npmRun('strip-modules'),
	},
];

export function findAction(id) {
	const action = ACTIONS.find((a) => a.id === id);
	if (!action) throw new Error(`Unknown action id: ${id}`);
	return action;
}

/** Metadata safe to expose to the client — never includes build() or raw argv construction. */
export function publicActionList() {
	return ACTIONS.map(({ id, label, description, group, interactive, destructive, confirmType, fields }) => ({
		id,
		label,
		description,
		group,
		interactive,
		destructive,
		confirmType,
		fields: fields ?? null,
	}));
}
