// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { base64UrlDecode, base64UrlEncode } from '../../../shared/crypto/base64url';
import {
	encryptBytesForStorage,
	decryptBytesFromStorage,
	unwrapAesKey,
	type DataAtRestEnvelope,
	type EncryptBytesAtRestResult,
} from '../../../shared/crypto/rsa-oaep-private';

export { base64UrlDecode, base64UrlEncode };
export type { DataAtRestEnvelope };

const DATA_AT_REST_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const DATA_AT_REST_ENCRYPTION_VERSION = '1.0';

export async function encryptJsonForStorage(plaintextJson: string, publicKeyPem: string, keyId: string): Promise<EncryptBytesAtRestResult> {
	const plaintextBytes = new TextEncoder().encode(plaintextJson);

	return encryptBytesForStorage(
		plaintextBytes.buffer as ArrayBuffer,
		publicKeyPem,
		keyId,
		DATA_AT_REST_ENCRYPTION_ALGORITHM,
		DATA_AT_REST_ENCRYPTION_VERSION,
	);
}

export async function decryptJsonFromStorage(
	ciphertext: ArrayBuffer,
	envelope: DataAtRestEnvelope,
	privateKeyPem: string,
): Promise<string> {
	const plaintext = await decryptBytesFromStorage(ciphertext, envelope, privateKeyPem);

	return new TextDecoder().decode(plaintext);
}

/**
 * Decrypt data file (plaintext JSON)
 */
export async function decryptExportData(
	encryptedDataBase64: string,
	wrappedKeyBase64: string,
	ivBase64: string,
	privateKeyPem: string,
): Promise<string> {
	const aesKey = await unwrapAesKey(wrappedKeyBase64, privateKeyPem);
	const iv = base64UrlDecode(ivBase64);
	const ciphertext = base64UrlDecode(encryptedDataBase64);

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);

	return new TextDecoder().decode(plaintext);
}

/**
 * Decrypt a single image blob
 */
export async function decryptImageBlob(
	encryptedImageBase64: string,
	wrappedKeyBase64: string,
	ivBase64: string,
	privateKeyPem: string,
): Promise<Blob> {
	const aesKey = await unwrapAesKey(wrappedKeyBase64, privateKeyPem);
	const iv = base64UrlDecode(ivBase64);
	const ciphertext = base64UrlDecode(encryptedImageBase64);

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);

	// Return as blob (caller can determine MIME type from context)
	return new Blob([plaintext]);
}
