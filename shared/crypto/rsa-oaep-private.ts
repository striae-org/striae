/**
 * RSA-OAEP + AES-256-GCM decrypt-side primitives.
 *
 * Handles private-key operations — worker-only, never import from app/.
 */

import { base64UrlDecode, base64UrlEncode } from './base64url';
import { createAesGcmKey, wrapAesKey } from './rsa-oaep-public';

export interface DataAtRestEnvelope {
	algorithm: string;
	encryptionVersion: string;
	keyId: string;
	dataIv: string;
	wrappedKey: string;
}

export interface EncryptBytesAtRestResult {
	ciphertext: Uint8Array;
	envelope: DataAtRestEnvelope;
}

export function parsePkcs8PrivateKey(privateKey: string, keyLabel = 'Encryption'): ArrayBuffer {
	const normalizedKey = privateKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error(`${keyLabel} private key is invalid`);
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

export async function importRsaOaepPrivateKey(privateKeyPem: string, keyLabel = 'Encryption'): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'pkcs8',
		parsePkcs8PrivateKey(privateKeyPem, keyLabel),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['decrypt'],
	);
}

export async function unwrapAesKey(wrappedKeyBase64: string, privateKeyPem: string, keyLabel = 'Encryption'): Promise<CryptoKey> {
	const rsaPrivateKey = await importRsaOaepPrivateKey(privateKeyPem, keyLabel);
	const wrappedKeyBytes = base64UrlDecode(wrappedKeyBase64);

	const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsaPrivateKey, wrappedKeyBytes as BufferSource);

	return crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
}

export function validateEnvelope(envelope: DataAtRestEnvelope, expectedAlgorithm: string, expectedEncryptionVersion: string): void {
	if (envelope.algorithm !== expectedAlgorithm) {
		throw new Error('Unsupported data-at-rest encryption algorithm');
	}

	if (envelope.encryptionVersion !== expectedEncryptionVersion) {
		throw new Error('Unsupported data-at-rest encryption version');
	}
}

export async function encryptBytesForStorage(
	plaintextBytes: ArrayBuffer,
	publicKeyPem: string,
	keyId: string,
	algorithm: string,
	encryptionVersion: string,
	keyLabel = 'Encryption',
): Promise<EncryptBytesAtRestResult> {
	const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
	const wrappedKey = await wrapAesKey(aesKey, publicKeyPem, keyLabel);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, plaintextBytes as BufferSource);

	return {
		ciphertext: new Uint8Array(encryptedBuffer),
		envelope: {
			algorithm,
			encryptionVersion,
			keyId,
			dataIv: base64UrlEncode(iv),
			wrappedKey,
		},
	};
}

export async function decryptBytesFromStorage(
	ciphertext: ArrayBuffer,
	envelope: DataAtRestEnvelope,
	privateKeyPem: string,
	keyLabel = 'Encryption',
): Promise<ArrayBuffer> {
	const aesKey = await unwrapAesKey(envelope.wrappedKey, privateKeyPem, keyLabel);
	const iv = base64UrlDecode(envelope.dataIv);

	return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);
}
