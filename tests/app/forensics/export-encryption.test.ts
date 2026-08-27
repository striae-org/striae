/**
 * Tests for app/utils/forensics/export-encryption.ts
 *
 * Validates round-trip encryption for case export payloads and images.
 * Uses ephemeral RSA key pairs generated at test runtime — no stored secrets.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateSharedAesKey,
  encryptDataWithSharedKey,
  encryptImageWithSharedKey,
  wrapAesKeyWithPublicKey,
  base64UrlDecode,
  EXPORT_ENCRYPTION_VERSION,
  EXPORT_ENCRYPTION_ALGORITHM,
} from '~/utils/forensics/export-encryption';

// ---------------------------------------------------------------------------
// Helpers: ephemeral RSA-OAEP key pair + AES unwrap (replicates worker logic)
// ---------------------------------------------------------------------------

async function generateTestRsaKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  ) as Promise<CryptoKeyPair>;
}

/** Export a CryptoKey public key to PEM format */
async function exportPublicKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const lines = base64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

/** Unwrap a base64url-encoded AES key using an RSA private key */
async function unwrapAesKey(wrappedBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const normalized = wrappedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const wrappedBytes = Uint8Array.from(atob(normalized + padding), (c) => c.charCodeAt(0));

  const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrappedBytes);
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, true, ['decrypt']);
}

/** Decrypt AES-GCM ciphertext bytes back to a string */
async function decryptAesGcm(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext as BufferSource);
  return new TextDecoder().decode(plaintext);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('export-encryption constants', () => {
  it('exports the correct version string', () => {
    expect(EXPORT_ENCRYPTION_VERSION).toBe('1.0');
  });

  it('exports the correct algorithm string', () => {
    expect(EXPORT_ENCRYPTION_ALGORITHM).toBe('RSA-OAEP-AES-256-GCM');
  });
});

describe('base64UrlDecode', () => {
  it('decodes a base64url string with no padding', () => {
    // "hello" → base64url = "aGVsbG8"
    const result = base64UrlDecode('aGVsbG8');
    expect(new TextDecoder().decode(result)).toBe('hello');
  });

  it('decodes a base64url string that would have padding', () => {
    // "hi" → base64 = "aGk=" → base64url = "aGk"
    const result = base64UrlDecode('aGk');
    expect(new TextDecoder().decode(result)).toBe('hi');
  });

  it('handles the - and _ characters correctly', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    const encoded = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });
});

describe('generateSharedAesKey', () => {
  it('generates an extractable AES-256-GCM key', async () => {
    const key = await generateSharedAesKey();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
    expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
    expect(key.extractable).toBe(true);
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
  });

  it('generates a unique key each call', async () => {
    const [k1, k2] = await Promise.all([generateSharedAesKey(), generateSharedAesKey()]);
    const [raw1, raw2] = await Promise.all([
      crypto.subtle.exportKey('raw', k1),
      crypto.subtle.exportKey('raw', k2),
    ]);
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
  });
});

describe('encryptDataWithSharedKey', () => {
  let aesKey: CryptoKey;

  beforeAll(async () => {
    aesKey = await generateSharedAesKey();
  });

  it('returns a non-empty Uint8Array', async () => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const result = await encryptDataWithSharedKey('test payload', aesKey, iv);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('round-trips: encrypt then decrypt yields original plaintext', async () => {
    const original = JSON.stringify({ case: 'TEST-001', files: ['a', 'b', 'c'] });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await encryptDataWithSharedKey(original, aesKey, iv);
    const decrypted = await decryptAesGcm(ciphertext, aesKey, iv);
    expect(decrypted).toBe(original);
  });

  it('round-trips for unicode content', async () => {
    const original = '{"note":"Ñoño 日本語 emoji 🔬"}';
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await encryptDataWithSharedKey(original, aesKey, iv);
    const decrypted = await decryptAesGcm(ciphertext, aesKey, iv);
    expect(decrypted).toBe(original);
  });

  it('different IVs produce different ciphertexts for the same plaintext', async () => {
    const plaintext = 'same content';
    const iv1 = crypto.getRandomValues(new Uint8Array(12));
    const iv2 = crypto.getRandomValues(new Uint8Array(12));
    const c1 = await encryptDataWithSharedKey(plaintext, aesKey, iv1);
    const c2 = await encryptDataWithSharedKey(plaintext, aesKey, iv2);
    expect(c1).not.toEqual(c2);
  });
});

describe('encryptImageWithSharedKey', () => {
  let aesKey: CryptoKey;

  beforeAll(async () => {
    aesKey = await generateSharedAesKey();
  });

  it('returns ciphertext and a lowercase 64-char hex hash', async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]); // PNG header
    const blob = new Blob([imageBytes], { type: 'image/png' });
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const result = await encryptImageWithSharedKey(blob, aesKey, iv);

    expect(result.ciphertext).toBeInstanceOf(Uint8Array);
    expect(result.ciphertext.length).toBeGreaterThan(0);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash is the SHA-256 of the ciphertext bytes', async () => {
    const imageBytes = crypto.getRandomValues(new Uint8Array(64));
    const blob = new Blob([imageBytes]);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const result = await encryptImageWithSharedKey(blob, aesKey, iv);

    const expectedHashBuffer = await crypto.subtle.digest('SHA-256', result.ciphertext as BufferSource);
    const expectedHash = Array.from(new Uint8Array(expectedHashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(result.hash).toBe(expectedHash);
  });

  it('round-trips: decrypt ciphertext yields original image bytes', async () => {
    const originalBytes = crypto.getRandomValues(new Uint8Array(256));
    const blob = new Blob([originalBytes]);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const { ciphertext } = await encryptImageWithSharedKey(blob, aesKey, iv);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);
    expect(new Uint8Array(plaintext)).toEqual(originalBytes);
  });
});

describe('wrapAesKeyWithPublicKey', () => {
  let rsaKeyPair: CryptoKeyPair;
  let publicKeyPem: string;

  beforeAll(async () => {
    rsaKeyPair = await generateTestRsaKeyPair();
    publicKeyPem = await exportPublicKeyToPem(rsaKeyPair.publicKey);
  });

  it('returns a non-empty base64url string', async () => {
    const aesKey = await generateSharedAesKey();
    const wrapped = await wrapAesKeyWithPublicKey(aesKey, publicKeyPem);
    expect(typeof wrapped).toBe('string');
    expect(wrapped.length).toBeGreaterThan(0);
    expect(wrapped).not.toMatch(/[+/=]/); // base64url has no +, /, or =
  });

  it('wrapped key can be decrypted back with the RSA private key', async () => {
    const aesKey = await generateSharedAesKey();
    const originalRaw = await crypto.subtle.exportKey('raw', aesKey);

    const wrapped = await wrapAesKeyWithPublicKey(aesKey, publicKeyPem);
    const unwrapped = await unwrapAesKey(wrapped, rsaKeyPair.privateKey);
    const recoveredRaw = await crypto.subtle.exportKey('raw', unwrapped);

    expect(new Uint8Array(recoveredRaw)).toEqual(new Uint8Array(originalRaw));
  });

  it('full round-trip: encrypt data → wrap key → unwrap key → decrypt data', async () => {
    const original = '{"forensic":"case-data","files":[]}';
    const aesKey = await generateSharedAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await encryptDataWithSharedKey(original, aesKey, iv);
    const wrappedKey = await wrapAesKeyWithPublicKey(aesKey, publicKeyPem);

    // Decrypt
    const recoveredKey = await unwrapAesKey(wrappedKey, rsaKeyPair.privateKey);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, recoveredKey, ciphertext as BufferSource);

    expect(new TextDecoder().decode(plaintext)).toBe(original);
  });

  it('throws on an invalid PEM public key', async () => {
    const aesKey = await generateSharedAesKey();
    await expect(wrapAesKeyWithPublicKey(aesKey, 'not-a-pem')).rejects.toThrow();
  });
});
