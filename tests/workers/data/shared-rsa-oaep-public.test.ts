// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for shared/crypto/rsa-oaep-public.ts
 *
 * Validates the encrypt-only primitives (PEM parsing, RSA-OAEP public key
 * import, AES key generation/wrapping) shared by the app and Workers.
 *
 * These run in the Cloudflare Workers miniflare environment (provides crypto.subtle).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseSpkiPublicKey, importRsaOaepPublicKey, createAesGcmKey, wrapAesKey } from '../../../shared/crypto/rsa-oaep-public';
import { base64UrlDecode } from '../../../shared/crypto/base64url';

async function generateRsaOaepKeyPair(modulusLength = 2048): Promise<CryptoKeyPair> {
	return crypto.subtle.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		},
		true,
		['encrypt', 'decrypt'],
	) as Promise<CryptoKeyPair>;
}

async function exportToSpkiPem(key: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('spki', key);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
	const lines = base64.match(/.{1,64}/g)!.join('\n');
	return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

describe('parseSpkiPublicKey', () => {
	it('throws the default "Encryption public key is invalid" message on empty input', () => {
		expect(() => parseSpkiPublicKey('')).toThrow('Encryption public key is invalid');
	});

	it('throws a custom keyLabel-prefixed message when provided', () => {
		expect(() => parseSpkiPublicKey('', 'User KV encryption')).toThrow('User KV encryption public key is invalid');
	});
});

describe.each([2048, 3072])('importRsaOaepPublicKey / createAesGcmKey / wrapAesKey (modulusLength=%i)', (modulusLength) => {
	let publicKeyPem: string;
	let privateKey: CryptoKey;

	beforeAll(async () => {
		const keyPair = await generateRsaOaepKeyPair(modulusLength);
		publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
		privateKey = keyPair.privateKey;
	});

	it('imports a valid SPKI public key PEM', async () => {
		const key = await importRsaOaepPublicKey(publicKeyPem);
		expect(key.type).toBe('public');
		expect(key.algorithm.name).toBe('RSA-OAEP');
	});

	it('wraps an AES key such that it can be unwrapped with the matching private key', async () => {
		const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
		const wrappedKeyBase64 = await wrapAesKey(aesKey, publicKeyPem);

		const wrappedBytes = base64UrlDecode(wrappedKeyBase64);
		const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrappedBytes as BufferSource);
		const unwrapped = await crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);

		// Prove it's the same key: encrypt with original, decrypt with unwrapped
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const plaintext = new TextEncoder().encode('round-trip check');
		const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
		const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, unwrapped, ciphertext);
		expect(new TextDecoder().decode(decrypted)).toBe('round-trip check');
	});

	it('produces a different wrapped key on each call (random AES key)', async () => {
		const aesKey1 = await createAesGcmKey();
		const aesKey2 = await createAesGcmKey();
		const wrapped1 = await wrapAesKey(aesKey1, publicKeyPem);
		const wrapped2 = await wrapAesKey(aesKey2, publicKeyPem);
		expect(wrapped1).not.toBe(wrapped2);
	});
});
