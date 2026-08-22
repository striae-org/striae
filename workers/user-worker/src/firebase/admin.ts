import { FIREBASE_IDENTITY_TOOLKIT_BASE_URL, GOOGLE_IDENTITY_TOOLKIT_SCOPE, GOOGLE_OAUTH_TOKEN_URL } from '../config';
import type { Env, FirebaseDeleteAccountErrorResponse, GoogleOAuthTokenResponse } from '../types';

const textEncoder = new TextEncoder();

function base64UrlEncode(value: string | Uint8Array): string {
	const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parsePkcs8PrivateKey(privateKey: string): ArrayBuffer {
	const normalizedKey = privateKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error('Firebase service account private key is invalid');
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

async function buildServiceAccountAssertion(env: Env): Promise<string> {
	const issuedAt = Math.floor(Date.now() / 1000);
	const header = {
		alg: 'RS256',
		typ: 'JWT',
	};
	const payload = {
		iss: env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
		scope: GOOGLE_IDENTITY_TOOLKIT_SCOPE,
		aud: GOOGLE_OAUTH_TOKEN_URL,
		iat: issuedAt,
		exp: issuedAt + 3600,
	};
	const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

	let signingKey: CryptoKey;

	try {
		signingKey = await crypto.subtle.importKey(
			'pkcs8',
			parsePkcs8PrivateKey(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY),
			{
				name: 'RSASSA-PKCS1-v1_5',
				hash: 'SHA-256',
			},
			false,
			['sign'],
		);
	} catch {
		throw new Error(
			'Invalid Firebase service account private key format. Use the service account JSON private_key value (PKCS8) and keep newline markers as \\n.',
		);
	}

	const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, signingKey, textEncoder.encode(unsignedToken));

	return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getGoogleAccessToken(env: Env): Promise<string> {
	const assertion = await buildServiceAccountAssertion(env);
	const body = new URLSearchParams({
		grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
		assertion,
	});

	const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});

	const tokenData = (await tokenResponse.json().catch(() => ({}))) as GoogleOAuthTokenResponse;
	if (!tokenResponse.ok || !tokenData.access_token) {
		const errorReason = tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`;
		throw new Error(`Failed to authorize Firebase admin deletion: ${errorReason}`);
	}

	return tokenData.access_token;
}

export async function deleteFirebaseAuthUser(env: Env, userUid: string): Promise<void> {
	if (!env.PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT_EMAIL || !env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
		throw new Error('Firebase Auth deletion is not configured in User Worker secrets');
	}

	const accessToken = await getGoogleAccessToken(env);
	const deleteResponse = await fetch(`${FIREBASE_IDENTITY_TOOLKIT_BASE_URL}/${encodeURIComponent(env.PROJECT_ID)}/accounts:delete`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ localId: userUid }),
	});

	if (deleteResponse.ok) {
		return;
	}

	const deleteErrorPayload = (await deleteResponse.json().catch(() => ({}))) as FirebaseDeleteAccountErrorResponse;
	const deleteErrorMessage = deleteErrorPayload.error?.message || '';

	if (deleteErrorMessage.includes('USER_NOT_FOUND')) {
		return;
	}

	throw new Error(
		deleteErrorMessage
			? `Firebase Auth deletion failed: ${deleteErrorMessage}`
			: `Firebase Auth deletion failed with status ${deleteResponse.status}`,
	);
}
