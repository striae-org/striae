/**
 * Admin script to permanently delete a user account via the user worker's delete endpoint.
 * Run with: npm run delete-account -- <uid> --confirm [--url <base-url>]
 *
 * The pages.dev URL is derived automatically from PAGES_PROJECT_NAME in .env.
 * Use --url to override (e.g. --url https://your-project.pages.dev).
 * The custom domain blocks automated requests via Cloudflare Bot Fight Mode.
 *
 * Requires:
 *   - app/config/admin-service.json (gitignored service account key)
 *   - app/config/firebase.ts (gitignored Firebase config, used for apiKey)
 *   - .env (PAGES_PROJECT_NAME used to construct the default pages.dev URL)
 *
 * This script creates a short-lived custom token for the target UID, exchanges it for a
 * Firebase ID token, then calls the Pages DELETE /api/user/:uid endpoint which runs the
 * full account deletion routine (KV, R2 files, R2 case data, Firebase Auth).
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Argument parsing ---

const USAGE = 'Usage: npm run delete-account -- <uid> --confirm [--url <base-url>]';

let uid = null;
let confirmed = false;
let urlOverride = null;

{
  const args = process.argv.slice(2);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--confirm') {
      confirmed = true;
      i++;
    } else if (arg === '--url') {
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        console.error('\n❌ --url requires a value (e.g. --url https://your-project.pages.dev)');
        console.error(USAGE);
        process.exit(1);
      }
      urlOverride = args[i + 1];
      i += 2;
    } else if (arg.startsWith('--')) {
      console.error(`\n❌ Unknown flag: ${arg}`);
      console.error(USAGE);
      process.exit(1);
    } else if (uid === null) {
      uid = arg;
      i++;
    } else {
      console.error(`\n❌ Unexpected argument: ${arg}`);
      console.error(USAGE);
      process.exit(1);
    }
  }
}

if (!uid) {
  console.error('\n❌ No UID provided.');
  console.error(`\n${USAGE}`);
  console.error('\n  --url  Override the pages.dev URL (e.g. https://your-project.pages.dev)');
  console.error('         Defaults to https://<PAGES_PROJECT_NAME>.pages.dev from .env');
  process.exit(1);
}

if (!confirmed) {
  console.error('\n❌ Missing --confirm flag.');
  console.error('\nThis operation permanently deletes the account and all associated data.');
  console.error('Re-run with --confirm to proceed:');
  console.error(`\n   npm run delete-account -- ${uid} --confirm\n`);
  process.exit(1);
}

// --- Load service account ---

const serviceAccountPath = resolve(__dirname, '../app/config/admin-service.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch {
  console.error(`\n❌ Could not load service account key from:\n   ${serviceAccountPath}`);
  console.error('\nMake sure app/config/admin-service.json exists (it is gitignored).');
  process.exit(1);
}

// --- Resolve app URL ---
// Default: derive from PAGES_PROJECT_NAME in .env → https://<name>.pages.dev
// Override: --url flag
// Fallback: interactive prompt

let appUrl;
if (urlOverride) {
  appUrl = urlOverride.replace(/\/+$/, '');
  console.log(`\nℹ️  Using URL: ${appUrl}`);
} else {
  let pagesProjectName = null;
  const envPath = resolve(__dirname, '../.env');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const match = envContent.match(/^PAGES_PROJECT_NAME=(.+)$/m);
    if (match && match[1].trim()) {
      pagesProjectName = match[1].trim();
    }
  } catch {
    // .env not found or unreadable — will fall through to prompt
  }

  if (pagesProjectName) {
    appUrl = `https://${pagesProjectName}.pages.dev`;
    console.log(`\nℹ️  Using derived pages.dev URL: ${appUrl}`);
  } else {
    console.warn('\n⚠️  Could not read PAGES_PROJECT_NAME from .env.');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    appUrl = await new Promise((res) => {
      rl.question(
        'Enter the pages.dev URL (e.g. https://<project>.pages.dev): ',
        (answer) => { rl.close(); res(answer.trim().replace(/\/+$/, '')); }
      );
    });
    if (!appUrl) {
      console.error('\n❌ No URL provided. Aborting.');
      process.exit(1);
    }
  }
}

// --- Load Firebase API key from firebase.ts ---

const firebaseTsPath = resolve(__dirname, '../app/config/firebase.ts');
let apiKey;
try {
  const firebaseTsContent = readFileSync(firebaseTsPath, 'utf8');
  const match = firebaseTsContent.match(/apiKey:\s*["']([^"']+)["']/);
  if (!match) {
    throw new Error('apiKey not found in firebase.ts');
  }
  apiKey = match[1];
  if (apiKey.startsWith('YOUR_')) {
    throw new Error('apiKey is still a placeholder value');
  }
} catch (err) {
  console.error(`\n❌ Could not read Firebase API key from:\n   ${firebaseTsPath}`);
  console.error('\nMake sure app/config/firebase.ts exists and contains a valid apiKey.');
  console.error(err?.message ?? err);
  process.exit(1);
}

// --- Initialize Firebase Admin ---

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();

// --- Verify user exists ---

console.log(`\n🔍 Fetching user record for UID: ${uid}...`);

let userRecord;
try {
  userRecord = await auth.getUser(uid);
} catch (err) {
  console.error(`\n❌ Could not fetch user record for UID: ${uid}`);
  console.error(err?.message ?? err);
  process.exit(1);
}

console.log(`\n⚠️  About to permanently delete account:`);
console.log(`   UID:   ${userRecord.uid}`);
console.log(`   Email: ${userRecord.email ?? '(no email)'}`);

// --- Create custom token and exchange for ID token ---

console.log('\n🔑 Obtaining ID token via custom token exchange...');

let customToken;
try {
  customToken = await auth.createCustomToken(uid);
} catch (err) {
  console.error('\n❌ Failed to create custom token:');
  console.error(err?.message ?? err);
  process.exit(1);
}

let idToken;
try {
  const signInResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  if (!signInResponse.ok) {
    const errorBody = await signInResponse.text();
    throw new Error(`Firebase REST sign-in failed (${signInResponse.status}): ${errorBody}`);
  }

  const signInData = await signInResponse.json();
  idToken = signInData.idToken;
  if (!idToken) {
    throw new Error('No idToken in sign-in response');
  }
} catch (err) {
  console.error('\n❌ Failed to exchange custom token for ID token:');
  console.error(err?.message ?? err);
  process.exit(1);
}

// --- Call the delete endpoint with streaming ---

const deleteUrl = `${appUrl}/api/user/${encodeURIComponent(uid)}?stream=true`;
console.log(`\n🗑️  Sending DELETE request to: ${deleteUrl}`);

let deleteResponse;
try {
  deleteResponse = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Accept': 'text/event-stream',
    },
  });
} catch (err) {
  console.error('\n❌ Network error during DELETE request:');
  console.error(err?.message ?? err);
  process.exit(1);
}

if (!deleteResponse.ok) {
  const body = await deleteResponse.text();
  console.error(`\n❌ DELETE request failed (${deleteResponse.status}): ${body}`);
  process.exit(1);
}

// --- Parse SSE stream ---

const contentType = deleteResponse.headers.get('content-type') ?? '';
const isStream = contentType.includes('text/event-stream');

if (!isStream) {
  // Non-streaming response (fallback)
  const result = await deleteResponse.json();
  if (result.success) {
    console.log('\n✅ Account deleted successfully.');
  } else {
    console.error('\n❌ Deletion reported failure:', result.message ?? result);
    process.exit(1);
  }
  process.exit(0);
}

// Stream processing
if (!deleteResponse.body) {
  console.error('\n❌ DELETE response has no body/stream. Cannot read SSE output.');
  process.exit(1);
}

const reader = deleteResponse.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let failed = false;
let completed = false;
let caseIndex = 0;

console.log('');

outer: while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    let event;
    try {
      event = JSON.parse(line.slice(6));
    } catch {
      continue;
    }

    switch (event.event) {
      case 'start':
        console.log(`   Starting deletion (${event.totalCases ?? 0} case(s) to remove)...`);
        break;
      case 'case-start':
        caseIndex++;
        console.log(`   [${caseIndex}/${event.totalCases}] Deleting case ${event.currentCaseNumber}...`);
        break;
      case 'case-complete':
        if (event.success === false) {
          console.error(`   [${event.completedCases}/${event.totalCases}] Case cleanup failed: ${event.message ?? 'Unknown error'}`);
        } else {
          console.log(`   [${event.completedCases}/${event.totalCases}] Case deleted.`);
        }
        break;
      case 'complete':
        completed = true;
        console.log('\n✅ Account deleted successfully.');
        break outer;
      case 'error':
        console.error(`\n❌ Deletion failed: ${event.message ?? 'Unknown error'}`);
        failed = true;
        break outer;
    }
  }
}

if (!completed && !failed) {
  console.error('\n❌ SSE stream ended without a completion event (possible network cut or worker crash).');
  process.exit(1);
}

process.exit(failed ? 1 : 0);
