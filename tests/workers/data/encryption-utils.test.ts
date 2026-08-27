/**
 * Tests for workers/data-worker/src/encryption-utils.ts
 *
 * Validates data-at-rest JSON encryption/decryption round-trips and
 * base64url encoding utilities.
 *
 * These run in the Cloudflare Workers miniflare environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptJsonForStorage,
  decryptJsonFromStorage,
  decryptExportData,
  base64UrlEncode,
  base64UrlDecode,
} from '../../../workers/data-worker/src/encryption-utils';

// ---------------------------------------------------------------------------
// Helpers: generate an ephemeral RSA-OAEP key pair and export to PEM
// ---------------------------------------------------------------------------

async function generateRsaOaepKeyPair(): Promise<CryptoKeyPair> {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('base64UrlEncode / base64UrlDecode', () => {
  it('round-trips arbitrary bytes', () => {
    const original = crypto.getRandomValues(new Uint8Array(64));
    const encoded = base64UrlEncode(original);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('encoded string contains no +, /, or = characters', () => {
    const bytes = new Uint8Array(48).fill(0xff);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('encodes and decodes empty byte array', () => {
    const empty = new Uint8Array(0);
    const encoded = base64UrlEncode(empty);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(empty);
  });

  it('decode handles base64url characters - and _', () => {
    // bytes that produce + and / in standard base64
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    const standardBase64 = btoa(String.fromCharCode(...bytes));
    const base64url = standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = base64UrlDecode(base64url);
    expect(decoded).toEqual(bytes);
  });
});

describe('encryptJsonForStorage / decryptJsonFromStorage', () => {
  let publicKeyPem: string;
  let privateKeyPem: string;
  const TEST_KEY_ID = 'test-key-001';

  beforeAll(async () => {
    const keyPair = await generateRsaOaepKeyPair();
    publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
    privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
  });

  it('encrypts a simple JSON string and returns ciphertext + envelope', async () => {
    const plaintext = JSON.stringify({ case: 'TEST-001' });
    const result = await encryptJsonForStorage(plaintext, publicKeyPem, TEST_KEY_ID);

    expect(result.ciphertext).toBeInstanceOf(Uint8Array);
    expect(result.ciphertext.length).toBeGreaterThan(0);
    expect(result.envelope.algorithm).toBe('RSA-OAEP-AES-256-GCM');
    expect(result.envelope.encryptionVersion).toBe('1.0');
    expect(result.envelope.keyId).toBe(TEST_KEY_ID);
    expect(typeof result.envelope.wrappedKey).toBe('string');
    expect(typeof result.envelope.dataIv).toBe('string');
  });

  it('decrypts back to the original JSON string', async () => {
    const original = JSON.stringify({ case: 'TEST-001', files: ['a', 'b'] });
    const { ciphertext, envelope } = await encryptJsonForStorage(original, publicKeyPem, TEST_KEY_ID);
    const decrypted = await decryptJsonFromStorage(ciphertext.buffer as ArrayBuffer, envelope, privateKeyPem);
    expect(decrypted).toBe(original);
  });

  it('round-trips a large JSON payload', async () => {
    const largeObject = {
      caseNumber: 'LARGE-001',
      files: Array.from({ length: 100 }, (_, i) => ({
        id: `file-${i}`,
        name: `image-${i}.jpg`,
        hash: 'a'.repeat(64),
      })),
    };
    const original = JSON.stringify(largeObject);
    const { ciphertext, envelope } = await encryptJsonForStorage(original, publicKeyPem, TEST_KEY_ID);
    const decrypted = await decryptJsonFromStorage(ciphertext.buffer as ArrayBuffer, envelope, privateKeyPem);
    expect(decrypted).toBe(original);
  });

  it('round-trips a payload with unicode characters', async () => {
    const original = JSON.stringify({ note: 'Ñoño 日本語 🔬 forensics' });
    const { ciphertext, envelope } = await encryptJsonForStorage(original, publicKeyPem, TEST_KEY_ID);
    const decrypted = await decryptJsonFromStorage(ciphertext.buffer as ArrayBuffer, envelope, privateKeyPem);
    expect(decrypted).toBe(original);
  });

  it('produces a different ciphertext on each call (random IV)', async () => {
    const plaintext = '{"same": "content"}';
    const r1 = await encryptJsonForStorage(plaintext, publicKeyPem, TEST_KEY_ID);
    const r2 = await encryptJsonForStorage(plaintext, publicKeyPem, TEST_KEY_ID);
    expect(r1.envelope.dataIv).not.toBe(r2.envelope.dataIv);
    expect(Array.from(r1.ciphertext)).not.toEqual(Array.from(r2.ciphertext));
  });

  it('throws when decrypting with the wrong private key', async () => {
    const original = '{"secret": "data"}';
    const { ciphertext, envelope } = await encryptJsonForStorage(original, publicKeyPem, TEST_KEY_ID);

    // Generate a different key pair for the wrong private key
    const wrongPair = await generateRsaOaepKeyPair();
    const wrongPrivatePem = await exportToPkcs8Pem(wrongPair.privateKey);

    await expect(
      decryptJsonFromStorage(ciphertext.buffer as ArrayBuffer, envelope, wrongPrivatePem)
    ).rejects.toThrow();
  });
});

describe('decryptExportData', () => {
  let publicKeyPem: string;
  let privateKeyPem: string;

  beforeAll(async () => {
    const keyPair = await generateRsaOaepKeyPair();
    publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
    privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
  });

  /**
   * Simulate what the app does during export encryption:
   * - generateSharedAesKey → encryptDataWithSharedKey → wrapAesKeyWithPublicKey
   * Then feed the base64url-encoded results into decryptExportData.
   */
  async function simulateExportEncrypt(
    plaintext: string
  ): Promise<{ encryptedDataBase64: string; wrappedKeyBase64: string; ivBase64: string }> {
    const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(plaintext))
    );

    // Wrap the AES key with the RSA public key
    const rsaPublicKey = await crypto.subtle.importKey(
      'spki',
      (() => {
        const pem = publicKeyPem.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace(/\s+/g, '');
        const binary = atob(pem);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      })(),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
    const rawAes = await crypto.subtle.exportKey('raw', aesKey);
    const wrappedKey = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, rawAes));

    return {
      encryptedDataBase64: base64UrlEncode(ciphertext),
      wrappedKeyBase64: base64UrlEncode(wrappedKey),
      ivBase64: base64UrlEncode(iv),
    };
  }

  it('decrypts export data produced by the app-side encryption', async () => {
    const original = JSON.stringify({ caseNumber: 'EXP-001', exportDate: '2026-04-20' });
    const { encryptedDataBase64, wrappedKeyBase64, ivBase64 } = await simulateExportEncrypt(original);

    const decrypted = await decryptExportData(encryptedDataBase64, wrappedKeyBase64, ivBase64, privateKeyPem);
    expect(decrypted).toBe(original);
  });
});
