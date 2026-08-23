import { base64UrlDecode, base64UrlEncode } from '../../../shared/crypto/base64url';
import { createAesGcmKey, wrapAesKey } from '../../../shared/crypto/rsa-oaep-public';
import {
	unwrapAesKey,
	encryptBytesForStorage,
	decryptBytesFromStorage,
	type DataAtRestEnvelope,
	type EncryptBytesAtRestResult,
} from '../../../shared/crypto/rsa-oaep-private';

export type { DataAtRestEnvelope };

export interface UserKvEncryptedRecord {
	algorithm: string;
	encryptionVersion: string;
	keyId: string;
	dataIv: string;
	wrappedKey: string;
	ciphertext: string;
}

const USER_KV_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const USER_KV_ENCRYPTION_VERSION = '1.0';
const DATA_AT_REST_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const DATA_AT_REST_ENCRYPTION_VERSION = '1.0';

// All user-worker crypto (both user-kv and data-at-rest envelopes) shares this key label for error text.
const KEY_LABEL = 'User KV encryption';

function isEncryptedRecord(value: unknown): value is UserKvEncryptedRecord {
	const candidate = value as Partial<UserKvEncryptedRecord> | null;
	return Boolean(
		candidate &&
		typeof candidate === 'object' &&
		typeof candidate.algorithm === 'string' &&
		typeof candidate.encryptionVersion === 'string' &&
		typeof candidate.keyId === 'string' &&
		typeof candidate.dataIv === 'string' &&
		typeof candidate.wrappedKey === 'string' &&
		typeof candidate.ciphertext === 'string',
	);
}

export function tryParseEncryptedRecord(serializedValue: string): UserKvEncryptedRecord | null {
	let parsed: unknown;

	try {
		parsed = JSON.parse(serializedValue) as unknown;
	} catch {
		return null;
	}

	if (!isEncryptedRecord(parsed)) {
		return null;
	}

	return parsed;
}

export function validateEncryptedRecord(record: UserKvEncryptedRecord): void {
	if (record.algorithm !== USER_KV_ENCRYPTION_ALGORITHM) {
		throw new Error('Unsupported user KV encryption algorithm');
	}

	if (record.encryptionVersion !== USER_KV_ENCRYPTION_VERSION) {
		throw new Error('Unsupported user KV encryption version');
	}
}

export async function encryptJsonForUserKv(plaintextJson: string, publicKeyPem: string, keyId: string): Promise<string> {
	const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
	const wrappedKey = await wrapAesKey(aesKey, publicKeyPem, KEY_LABEL);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const plaintextBytes = new TextEncoder().encode(plaintextJson);
	const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, plaintextBytes as BufferSource);

	const encryptedRecord: UserKvEncryptedRecord = {
		algorithm: USER_KV_ENCRYPTION_ALGORITHM,
		encryptionVersion: USER_KV_ENCRYPTION_VERSION,
		keyId,
		dataIv: base64UrlEncode(iv),
		wrappedKey,
		ciphertext: base64UrlEncode(new Uint8Array(ciphertextBuffer)),
	};

	return JSON.stringify(encryptedRecord);
}

export async function decryptJsonFromUserKv(record: UserKvEncryptedRecord, privateKeyPem: string): Promise<string> {
	const aesKey = await unwrapAesKey(record.wrappedKey, privateKeyPem, KEY_LABEL);
	const iv = base64UrlDecode(record.dataIv);
	const ciphertext = base64UrlDecode(record.ciphertext);

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);

	return new TextDecoder().decode(plaintext);
}

export async function decryptJsonFromStorage(
	ciphertext: ArrayBuffer,
	envelope: DataAtRestEnvelope,
	privateKeyPem: string,
): Promise<string> {
	const plaintext = await decryptBytesFromStorage(ciphertext, envelope, privateKeyPem, KEY_LABEL);

	return new TextDecoder().decode(plaintext);
}

export type EncryptedForStorage = EncryptBytesAtRestResult;

export async function encryptJsonForStorage(plaintextJson: string, publicKeyPem: string, keyId: string): Promise<EncryptedForStorage> {
	const plaintextBytes = new TextEncoder().encode(plaintextJson);

	return encryptBytesForStorage(
		plaintextBytes.buffer as ArrayBuffer,
		publicKeyPem,
		keyId,
		DATA_AT_REST_ENCRYPTION_ALGORITHM,
		DATA_AT_REST_ENCRYPTION_VERSION,
		KEY_LABEL,
	);
}

