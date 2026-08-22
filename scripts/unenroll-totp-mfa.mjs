/**
 * Admin script to unenroll a user's TOTP MFA factor via Firebase Admin SDK.
 * Run with: npm run unenroll-totp-mfa -- <uid>
 *
 * Requires app/config/admin-service.json (gitignored service account key).
 * Docs: https://firebase.google.com/docs/auth/admin/manage-users#unenroll_a_user_from_mfa
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const uid = process.argv[2];

if (!uid) {
	console.error('\n❌ No UID provided.');
	console.error('\nUsage: npm run unenroll-totp-mfa -- <uid>');
	process.exit(1);
}

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

console.log(`\n🔍 Fetching MFA factors for UID: ${uid}...`);

let userRecord;
try {
	userRecord = await auth.getUser(uid);
} catch (err) {
	console.error(`\n❌ Could not fetch user record for UID: ${uid}`);
	console.error(err?.message ?? err);
	process.exit(1);
}

const enrolledFactors = userRecord.multiFactor?.enrolledFactors ?? [];
const totpFactors = enrolledFactors.filter((f) => f.factorId === 'totp');
const remainingFactors = enrolledFactors.filter((f) => f.factorId !== 'totp');

if (totpFactors.length === 0) {
	console.log(`\nℹ️  No TOTP MFA factors found for UID: ${uid}`);
	console.log('   Nothing to unenroll.');
	process.exit(0);
}

console.log(`\n   Found ${totpFactors.length} TOTP factor(s):`);
for (const factor of totpFactors) {
	console.log(`   - ${factor.uid}  (displayName: ${factor.displayName ?? 'n/a'}, enrolled: ${factor.enrollmentTime})`);
}

try {
	await auth.updateUser(uid, {
		multiFactor: {
			enrolledFactors: remainingFactors,
		},
	});

	console.log(`\n✅ Successfully unenrolled ${totpFactors.length} TOTP factor(s) for UID: ${uid}`);
	console.log('   The user will need to re-enroll TOTP on their next login.');
} catch (err) {
	console.error(`\n❌ Failed to unenroll TOTP factor(s) for UID: ${uid}`);
	console.error(err?.message ?? err);
	process.exit(1);
}
