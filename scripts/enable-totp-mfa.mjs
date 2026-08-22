/**
 * One-time script to enable TOTP MFA provider via Firebase Admin SDK.
 * Run with: npm run enable-totp-mfa
 *
 * Requires app/config/admin-service.json (gitignored service account key).
 * Docs: https://firebase.google.com/docs/auth/web/totp-mfa#enable_totp_mfa
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = resolve(__dirname, '../app/config/admin-service.json');

let serviceAccount;
try {
	serviceAccount = require(serviceAccountPath);
} catch {
	console.error(`\n❌ Could not load service account key from:\n   ${serviceAccountPath}`);
	console.error('\nMake sure app/config/admin-service.json exists (it is gitignored).');
	process.exit(1);
}

if (getApps().length === 0) {
	initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();

console.log('\n🔑 Enabling TOTP MFA provider...');

try {
	await auth.projectConfigManager().updateProjectConfig({
		multiFactorConfig: {
			providerConfigs: [
				{
					state: 'ENABLED',
					totpProviderConfig: {
						adjacentIntervals: 0,
					},
				},
			],
		},
	});

	console.log('✅ TOTP MFA provider enabled successfully.');
	console.log('   adjacentIntervals: 0 (accepts only the current TOTP interval; no adjacent interval tolerance)');
} catch (err) {
	console.error('\n❌ Failed to enable TOTP MFA provider:');
	console.error(err?.message ?? err);
	process.exit(1);
}
