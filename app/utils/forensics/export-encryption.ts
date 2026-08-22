import paths from '~/config/config.json';

export const EXPORT_ENCRYPTION_VERSION = '1.0';
export const EXPORT_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';

export interface EncryptedFileEntry {
	filename: string;
	encryptedHash: string; // SHA256 of encrypted bytes (lowercase hex)
	iv: string; // base64url — per-file nonce
}

export interface EncryptionManifest {
	encryptionVersion: string;
	algorithm: string;
	keyId: string;
	wrappedKey: string; // base64url
	dataIv: string; // base64url — nonce for the data file
	encryptedFiles: EncryptedFileEntry[];
	encryptedImages?: EncryptedFileEntry[];
}

export interface EncryptedExportResult {
	ciphertext: Uint8Array;
	encryptedFiles: Uint8Array[];
	encryptionManifest: EncryptionManifest;
}

export interface PublicEncryptionKeyDetails {
	keyId: string | null;
	publicKeyPem: string | null;
}

type ManifestEncryptionConfig = {
	export_encryption_key_id?: string;
	export_encryption_public_key?: string;
	export_encryption_public_keys?: Record<string, string>;
};

function base64UrlEncode(value: Uint8Array): string {
	let binary = '';
	for (const byte of value) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

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

function normalizePemPublicKey(pem: string): string {
	return pem.replace(/\\n/g, '\n').trim();
}

function publicKeyPemToArrayBuffer(publicKeyPem: string): ArrayBuffer {
	const normalized = normalizePemPublicKey(publicKeyPem);
	const pemBody = normalized.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\s+/g, '');

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

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
	const key = await crypto.subtle.importKey(
		'spki',
		publicKeyPemToArrayBuffer(publicKeyPem),
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256',
		},
		false,
		['encrypt'],
	);

	return key;
}

export function getCurrentEncryptionPublicKeyDetails(): PublicEncryptionKeyDetails {
	const config = paths as unknown as ManifestEncryptionConfig;
	const configuredKeyId =
		typeof config.export_encryption_key_id === 'string' && config.export_encryption_key_id.trim().length > 0
			? config.export_encryption_key_id
			: null;

	if (configuredKeyId) {
		const configuredKey = getEncryptionPublicKey(configuredKeyId);
		if (configuredKey) {
			return {
				keyId: configuredKeyId,
				publicKeyPem: configuredKey,
			};
		}
	}

	const keyMap = config.export_encryption_public_keys;
	if (keyMap && typeof keyMap === 'object') {
		const firstConfiguredEntry = Object.entries(keyMap).find(([, value]) => typeof value === 'string' && value.trim().length > 0);

		if (firstConfiguredEntry) {
			return {
				keyId: firstConfiguredEntry[0],
				publicKeyPem: normalizePemPublicKey(firstConfiguredEntry[1]),
			};
		}
	}

	return {
		keyId: null,
		publicKeyPem:
			typeof config.export_encryption_public_key === 'string' && config.export_encryption_public_key.trim().length > 0
				? normalizePemPublicKey(config.export_encryption_public_key)
				: null,
	};
}

function getEncryptionPublicKey(keyId: string): string | null {
	const config = paths as unknown as ManifestEncryptionConfig;
	const keyMap = config.export_encryption_public_keys;

	if (keyMap && typeof keyMap === 'object') {
		const mappedKey = keyMap[keyId];
		if (typeof mappedKey === 'string' && mappedKey.trim().length > 0) {
			return normalizePemPublicKey(mappedKey);
		}
	}

	if (
		typeof config.export_encryption_key_id === 'string' &&
		config.export_encryption_key_id === keyId &&
		typeof config.export_encryption_public_key === 'string' &&
		config.export_encryption_public_key.trim().length > 0
	) {
		return normalizePemPublicKey(config.export_encryption_public_key);
	}

	return null;
}

/**
 * Generate a shared AES-256-GCM key for all exports in one batch
 */
export async function generateSharedAesKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey(
		{ name: 'AES-GCM', length: 256 },
		true, // extractable for wrapping
		['encrypt', 'decrypt'],
	);
}

/**
 * Encrypt plaintext data file with shared AES key
 */
export async function encryptDataWithSharedKey(plaintextString: string, sharedAesKey: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
	const plaintext = new TextEncoder().encode(plaintextString);

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, sharedAesKey, plaintext);

	return new Uint8Array(ciphertext);
}

/**
 * Encrypt a single file blob with shared AES key, return ciphertext and SHA256 hash
 */
export async function encryptImageWithSharedKey(
	imageBlob: Blob,
	sharedAesKey: CryptoKey,
	iv: Uint8Array,
): Promise<{ ciphertext: Uint8Array; hash: string }> {
	const imageBuffer = await imageBlob.arrayBuffer();
	const imageBytes = new Uint8Array(imageBuffer);

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, sharedAesKey, imageBytes);

	const ciphertextBytes = new Uint8Array(ciphertext);

	// Calculate SHA256 of encrypted bytes
	const hashBuffer = await crypto.subtle.digest('SHA-256', ciphertextBytes);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return {
		ciphertext: ciphertextBytes,
		hash: hash.toLowerCase(),
	};
}

/**
 * Wrap AES key with RSA-OAEP public key
 */
export async function wrapAesKeyWithPublicKey(aesKey: CryptoKey, publicKeyPem: string): Promise<string> {
	const rsaPublicKey = await importRsaOaepPublicKey(publicKeyPem);

	// Export the AES key to raw format
	const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

	// Wrap the raw AES key with RSA-OAEP
	const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, rawAesKey);

	return base64UrlEncode(new Uint8Array(wrappedKey));
}

/**
 * Encrypt export data file and all associated files with a shared AES-256 key
 * Returns ciphertext, encrypted file array, and encryption manifest
 */
export async function encryptExportDataWithAllImages(
	plaintextString: string,
	imageBlobs: Array<{ filename: string; blob: Blob }>,
	publicKeyPem: string,
	keyId: string,
): Promise<EncryptedExportResult> {
	// Generate shared AES-256 key
	const sharedAesKey = await generateSharedAesKey();

	// Generate a unique 96-bit IV for the data file
	const dataIv = crypto.getRandomValues(new Uint8Array(12));
	const dataIvBase64 = base64UrlEncode(dataIv);

	// Encrypt data file with its own IV
	const dataCiphertext = await encryptDataWithSharedKey(plaintextString, sharedAesKey, dataIv);

	// Encrypt all files — each with its own unique IV
	const encryptedFiles: Uint8Array[] = [];
	const encryptedFileEntries: EncryptedFileEntry[] = [];

	for (const { filename, blob } of imageBlobs) {
		const imageIv = crypto.getRandomValues(new Uint8Array(12));
		const imageIvBase64 = base64UrlEncode(imageIv);

		const { ciphertext, hash } = await encryptImageWithSharedKey(blob, sharedAesKey, imageIv);

		encryptedFiles.push(ciphertext);
		encryptedFileEntries.push({
			filename,
			encryptedHash: hash,
			iv: imageIvBase64,
		});
	}

	// Wrap shared AES key with RSA-OAEP
	const wrappedKeyBase64 = await wrapAesKeyWithPublicKey(sharedAesKey, publicKeyPem);

	const encryptionManifest: EncryptionManifest = {
		encryptionVersion: EXPORT_ENCRYPTION_VERSION,
		algorithm: EXPORT_ENCRYPTION_ALGORITHM,
		keyId,
		wrappedKey: wrappedKeyBase64,
		dataIv: dataIvBase64,
		encryptedFiles: encryptedFileEntries,
	};

	return {
		ciphertext: dataCiphertext,
		encryptedFiles,
		encryptionManifest,
	};
}

export function getEncryptedManifestEntries(manifest: EncryptionManifest): EncryptedFileEntry[] {
	if (Array.isArray(manifest.encryptedFiles)) {
		return manifest.encryptedFiles;
	}

	if (Array.isArray(manifest.encryptedImages)) {
		return manifest.encryptedImages;
	}

	return [];
}
