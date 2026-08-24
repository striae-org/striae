// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * RSA-OAEP + AES-256-GCM encrypt-side primitives.
 *
 * Encrypt-only — never touches a private key — so this module is safe to
 * import from the frontend app as well as Cloudflare Workers. Private-key
 * operations (decrypt/unwrap) live in ./rsa-oaep-private.ts, which must never
 * be imported from app/.
 */

import { base64UrlEncode } from './base64url';

export function parseSpkiPublicKey(publicKey: string, keyLabel = 'Encryption'): ArrayBuffer {
	const normalizedKey = publicKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error(`${keyLabel} public key is invalid`);
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

export async function importRsaOaepPublicKey(publicKeyPem: string, keyLabel = 'Encryption'): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'spki',
		parseSpkiPublicKey(publicKeyPem, keyLabel),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['encrypt'],
	);
}

export async function createAesGcmKey(usages: KeyUsage[] = ['encrypt', 'decrypt']): Promise<CryptoKey> {
	return crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		usages,
	) as Promise<CryptoKey>;
}

export async function wrapAesKey(aesKey: CryptoKey, publicKeyPem: string, keyLabel = 'Encryption'): Promise<string> {
	const rsaPublicKey = await importRsaOaepPublicKey(publicKeyPem, keyLabel);
	const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
	const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, rawAesKey as BufferSource);

	return base64UrlEncode(new Uint8Array(wrappedKey));
}
