/**
 * Symmetric AES-256-GCM encryption for key registry files stored in R2.
 *
 * Registry JSON is encrypted before upload and decrypted after fetch using
 * a shared REGISTRY_ENCRYPTION_KEY (32-byte key, base64-encoded in env).
 */

export interface EncryptedRegistryEnvelope {
  encrypted: true;
  algorithm: 'AES-256-GCM';
  version: '1.0';
  iv: string;
  ciphertext: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(encoded: string): Uint8Array {
  let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  if (pad === 2) padded += '==';
  else if (pad === 3) padded += '=';
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function importKeyFromBase64(keyBase64: string): Promise<CryptoKey> {
  const keyBytes = base64UrlDecode(keyBase64);
  if (keyBytes.length !== 32) {
    throw new Error(`Registry encryption key must be 32 bytes, got ${keyBytes.length}`);
  }
  return crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts registry JSON for storage in R2.
 */
export async function encryptRegistryJson(
  plaintextJson: string,
  keyBase64: string
): Promise<EncryptedRegistryEnvelope> {
  const key = await importKeyFromBase64(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(plaintextJson);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );

  return {
    encrypted: true,
    algorithm: 'AES-256-GCM',
    version: '1.0',
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(new Uint8Array(ciphertextBuffer))
  };
}

/**
 * Decrypts an encrypted registry envelope back to JSON.
 */
export async function decryptRegistryJson(
  envelope: EncryptedRegistryEnvelope,
  keyBase64: string
): Promise<string> {
  const key = await importKeyFromBase64(keyBase64);
  const iv = base64UrlDecode(envelope.iv);
  const ciphertext = base64UrlDecode(envelope.ciphertext);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(plaintextBuffer);
}

/**
 * Type guard to check if parsed JSON is an encrypted registry envelope.
 */
export function isEncryptedEnvelope(data: unknown): data is EncryptedRegistryEnvelope {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    obj.encrypted === true &&
    obj.algorithm === 'AES-256-GCM' &&
    obj.version === '1.0' &&
    typeof obj.iv === 'string' &&
    typeof obj.ciphertext === 'string'
  );
}
