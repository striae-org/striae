export function base64UrlDecode(value: string): Uint8Array {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
	const decoded = atob(normalized + padding);
	const bytes = new Uint8Array(decoded.length);

	for (let i = 0; i < decoded.length; i += 1) {
		bytes[i] = decoded.charCodeAt(i);
	}

	return bytes;
}

export function base64UrlEncode(value: Uint8Array): string {
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

const DATA_AT_REST_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const DATA_AT_REST_ENCRYPTION_VERSION = '1.0';

export interface DataAtRestEnvelope {
	algorithm: string;
	encryptionVersion: string;
	keyId: string;
	dataIv: string;
	wrappedKey: string;
}

interface EncryptJsonAtRestResult {
	ciphertext: Uint8Array;
	envelope: DataAtRestEnvelope;
}

function parseSpkiPublicKey(publicKey: string): ArrayBuffer {
	const normalizedKey = publicKey
		.trim()
		.replace(/^['"]|['"]$/g, '')
		.replace(/\\n/g, '\n');

	const pemBody = normalizedKey.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\s+/g, '');

	if (!pemBody) {
		throw new Error('Encryption public key is invalid');
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
		throw new Error('Encryption private key is invalid');
	}

	const binary = atob(pemBody);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}

/**
 * Import RSA private key from PKCS8 PEM format
 */
async function importRsaOaepPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
	const key = await crypto.subtle.importKey(
		'pkcs8',
		parsePkcs8PrivateKey(privateKeyPem),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['decrypt'],
	);

	return key;
}

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
	const key = await crypto.subtle.importKey(
		'spki',
		parseSpkiPublicKey(publicKeyPem),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['encrypt'],
	);

	return key;
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

/**
 * Decrypt AES key from RSA-OAEP wrapped form
 */
async function unwrapAesKey(wrappedKeyBase64: string, privateKeyPem: string): Promise<CryptoKey> {
	const rsaPrivateKey = await importRsaOaepPrivateKey(privateKeyPem);
	const wrappedKeyBytes = base64UrlDecode(wrappedKeyBase64);

	const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, rsaPrivateKey, wrappedKeyBytes as BufferSource);

	return crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptJsonForStorage(plaintextJson: string, publicKeyPem: string, keyId: string): Promise<EncryptJsonAtRestResult> {
	const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
	const wrappedKey = await wrapAesKey(aesKey, publicKeyPem);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const plaintextBytes = new TextEncoder().encode(plaintextJson);
	const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, plaintextBytes as BufferSource);

	return {
		ciphertext: new Uint8Array(encryptedBuffer),
		envelope: {
			algorithm: DATA_AT_REST_ENCRYPTION_ALGORITHM,
			encryptionVersion: DATA_AT_REST_ENCRYPTION_VERSION,
			keyId,
			dataIv: base64UrlEncode(iv),
			wrappedKey,
		},
	};
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
