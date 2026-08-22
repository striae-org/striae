export interface UserKvEncryptedRecord {
	algorithm: string;
	encryptionVersion: string;
	keyId: string;
	dataIv: string;
	wrappedKey: string;
	ciphertext: string;
}

export interface DataAtRestEnvelope {
	algorithm: string;
	encryptionVersion: string;
	keyId: string;
	dataIv: string;
	wrappedKey: string;
}

const USER_KV_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const USER_KV_ENCRYPTION_VERSION = '1.0';
const DATA_AT_REST_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const DATA_AT_REST_ENCRYPTION_VERSION = '1.0';

function base64UrlDecode(value: string): Uint8Array {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
	const decoded = atob(normalized + padding);
	const bytes = new Uint8Array(decoded.length);

	for (let index = 0; index < decoded.length; index += 1) {
		bytes[index] = decoded.charCodeAt(index);
	}

	return bytes;
}

function base64UrlEncode(value: Uint8Array): string {
	let binary = '';
	const chunkSize = 8192;

	for (let i = 0; i < value.length; i += chunkSize) {
		const chunk = value.subarray(i, Math.min(i + chunkSize, value.length));
		for (let j = 0; j < chunk.length; j += 1) {
			binary += String.fromCharCode(chunk[j]);
		}
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseSpkiPublicKey(publicKey: string): ArrayBuffer {
	const normalizedKey = publicKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error('User KV encryption public key is invalid');
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

function parsePkcs8PrivateKey(privateKey: string): ArrayBuffer {
	const normalizedKey = privateKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error('User KV encryption private key is invalid');
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

async function importRsaOaepPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'pkcs8',
		parsePkcs8PrivateKey(privateKeyPem),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['decrypt'],
	);
}

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'spki',
		parseSpkiPublicKey(publicKeyPem),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['encrypt'],
	);
}

async function createAesGcmKey(usages: KeyUsage[]): Promise<CryptoKey> {
	return crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		usages,
	) as Promise<CryptoKey>;
}

async function wrapAesKey(aesKey: CryptoKey, publicKeyPem: string): Promise<string> {
	const rsaPublicKey = await importRsaOaepPublicKey(publicKeyPem);
	const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
	const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, rawAesKey as BufferSource);

	return base64UrlEncode(new Uint8Array(wrappedKey));
}

async function unwrapAesKey(wrappedKeyBase64: string, privateKeyPem: string): Promise<CryptoKey> {
	const rsaPrivateKey = await importRsaOaepPrivateKey(privateKeyPem);
	const wrappedKeyBytes = base64UrlDecode(wrappedKeyBase64);

	const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsaPrivateKey, wrappedKeyBytes as BufferSource);

	return crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
}

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
	const wrappedKey = await wrapAesKey(aesKey, publicKeyPem);
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
	const aesKey = await unwrapAesKey(record.wrappedKey, privateKeyPem);
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
	const aesKey = await unwrapAesKey(envelope.wrappedKey, privateKeyPem);
	const iv = base64UrlDecode(envelope.dataIv);

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);

	return new TextDecoder().decode(plaintext);
}

export interface EncryptedForStorage {
	ciphertext: Uint8Array;
	envelope: DataAtRestEnvelope;
}

export async function encryptJsonForStorage(plaintextJson: string, publicKeyPem: string, keyId: string): Promise<EncryptedForStorage> {
	const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
	const wrappedKey = await wrapAesKey(aesKey, publicKeyPem);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const plaintextBytes = new TextEncoder().encode(plaintextJson);
	const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, plaintextBytes as BufferSource);

	return {
		ciphertext: new Uint8Array(ciphertextBuffer),
		envelope: {
			algorithm: DATA_AT_REST_ENCRYPTION_ALGORITHM,
			encryptionVersion: DATA_AT_REST_ENCRYPTION_VERSION,
			keyId,
			dataIv: base64UrlEncode(iv),
			wrappedKey,
		},
	};
}
