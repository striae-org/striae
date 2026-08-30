// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for workers/image-worker/src/encryption-utils.ts
 *
 * Validates data-at-rest binary encryption/decryption round-trips.
 *
 * These run in the Cloudflare Workers miniflare environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { encryptBinaryForStorage, decryptBinaryFromStorage, validateEnvelope } from '../../../workers/image-worker/src/encryption-utils';

async function generateRsaOaepKeyPair(): Promise<CryptoKeyPair> {
	return crypto.subtle.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		},
		true,
		['encrypt', 'decrypt'],
	) as Promise<CryptoKeyPair>;
}

async function exportToPkcs8Pem(key: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('pkcs8', key);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
	const lines = base64.match(/.{1,64}/g)!.join('\n');
	return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

async function exportToSpkiPem(key: CryptoKey): Promise<string> {
	const exported = await crypto.subtle.exportKey('spki', key);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
	const lines = base64.match(/.{1,64}/g)!.join('\n');
	return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

describe('encryptBinaryForStorage / decryptBinaryFromStorage', () => {
	let publicKeyPem: string;
	let privateKeyPem: string;
	const TEST_KEY_ID = 'test-key-001';

	beforeAll(async () => {
		const keyPair = await generateRsaOaepKeyPair();
		publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
		privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
	});

	it('encrypts binary data and returns a well-formed envelope', async () => {
		const original = crypto.getRandomValues(new Uint8Array(2048));
		const result = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID);

		expect(result.ciphertext).toBeInstanceOf(Uint8Array);
		expect(result.ciphertext.length).toBeGreaterThan(0);
		expect(result.envelope.algorithm).toBe('RSA-OAEP-AES-256-GCM');
		expect(result.envelope.encryptionVersion).toBe('1.0');
		expect(result.envelope.keyId).toBe(TEST_KEY_ID);
	});

	it('round-trips arbitrary binary data', async () => {
		const original = crypto.getRandomValues(new Uint8Array(8192));
		const { ciphertext, envelope } = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID);
		const decrypted = await decryptBinaryFromStorage(ciphertext.buffer as ArrayBuffer, envelope, privateKeyPem);
		expect(new Uint8Array(decrypted)).toEqual(original);
	});

	it('throws when decrypting with the wrong private key', async () => {
		const original = crypto.getRandomValues(new Uint8Array(64));
		const { ciphertext, envelope } = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID);

		const wrongPair = await generateRsaOaepKeyPair();
		const wrongPrivatePem = await exportToPkcs8Pem(wrongPair.privateKey);

		await expect(decryptBinaryFromStorage(ciphertext.buffer as ArrayBuffer, envelope, wrongPrivatePem)).rejects.toThrow();
	});

	it('rejects an envelope with an unsupported algorithm', () => {
		expect(() =>
			validateEnvelope({
				algorithm: 'AES-256-GCM',
				encryptionVersion: '1.0',
				keyId: TEST_KEY_ID,
				dataIv: 'iv',
				wrappedKey: 'wrapped',
			}),
		).toThrow('Unsupported data-at-rest encryption algorithm');
	});

	it('rejects an envelope with an unsupported version', () => {
		expect(() =>
			validateEnvelope({
				algorithm: 'RSA-OAEP-AES-256-GCM',
				encryptionVersion: '2.0',
				keyId: TEST_KEY_ID,
				dataIv: 'iv',
				wrappedKey: 'wrapped',
			}),
		).toThrow('Unsupported data-at-rest encryption version');
	});
});
