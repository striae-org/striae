/**
 * Tests for shared/crypto/rsa-oaep-private.ts
 *
 * Validates the decrypt-side primitives (private key PEM parsing, RSA-OAEP
 * unwrap, generic bytes-at-rest encrypt/decrypt, envelope validation).
 *
 * These run in the Cloudflare Workers miniflare environment (provides crypto.subtle).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  parsePkcs8PrivateKey,
  unwrapAesKey,
  validateEnvelope,
  encryptBytesForStorage,
  decryptBytesFromStorage,
  type DataAtRestEnvelope,
} from '../../../shared/crypto/rsa-oaep-private';
import { wrapAesKey, createAesGcmKey } from '../../../shared/crypto/rsa-oaep-public';

const TEST_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const TEST_VERSION = '1.0';

async function generateRsaOaepKeyPair(modulusLength = 2048): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength,
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

describe('parsePkcs8PrivateKey', () => {
  it('throws the default "Encryption private key is invalid" message on empty input', () => {
    expect(() => parsePkcs8PrivateKey('')).toThrow('Encryption private key is invalid');
  });

  it('throws a custom keyLabel-prefixed message when provided', () => {
    expect(() => parsePkcs8PrivateKey('', 'User KV encryption')).toThrow('User KV encryption private key is invalid');
  });
});

describe('validateEnvelope', () => {
  const baseEnvelope: DataAtRestEnvelope = {
    algorithm: TEST_ALGORITHM,
    encryptionVersion: TEST_VERSION,
    keyId: 'key-1',
    dataIv: 'iv',
    wrappedKey: 'wrapped',
  };

  it('passes for matching algorithm and version', () => {
    expect(() => validateEnvelope(baseEnvelope, TEST_ALGORITHM, TEST_VERSION)).not.toThrow();
  });

  it('throws on algorithm mismatch', () => {
    expect(() => validateEnvelope({ ...baseEnvelope, algorithm: 'other' }, TEST_ALGORITHM, TEST_VERSION)).toThrow(
      'Unsupported data-at-rest encryption algorithm'
    );
  });

  it('throws on version mismatch', () => {
    expect(() => validateEnvelope({ ...baseEnvelope, encryptionVersion: '2.0' }, TEST_ALGORITHM, TEST_VERSION)).toThrow(
      'Unsupported data-at-rest encryption version'
    );
  });
});

describe.each([2048, 3072])('unwrapAesKey (modulusLength=%i)', (modulusLength) => {
  it('unwraps a key wrapped by wrapAesKey', async () => {
    const keyPair = await generateRsaOaepKeyPair(modulusLength);
    const publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
    const privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);

    const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
    const wrappedKeyBase64 = await wrapAesKey(aesKey, publicKeyPem);

    const unwrapped = await unwrapAesKey(wrappedKeyBase64, privateKeyPem);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('unwrap check');
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, unwrapped, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('unwrap check');
  });
});

describe.each([2048, 3072])('encryptBytesForStorage / decryptBytesFromStorage (modulusLength=%i)', (modulusLength) => {
  let publicKeyPem: string;
  let privateKeyPem: string;
  const TEST_KEY_ID = 'test-key-001';

  beforeAll(async () => {
    const keyPair = await generateRsaOaepKeyPair(modulusLength);
    publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
    privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
  });

  it('encrypts bytes and returns a well-formed envelope', async () => {
    const plaintext = new TextEncoder().encode(JSON.stringify({ case: 'TEST-001' }));
    const result = await encryptBytesForStorage(plaintext.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID, TEST_ALGORITHM, TEST_VERSION);

    expect(result.ciphertext).toBeInstanceOf(Uint8Array);
    expect(result.ciphertext.length).toBeGreaterThan(0);
    expect(result.envelope.algorithm).toBe(TEST_ALGORITHM);
    expect(result.envelope.encryptionVersion).toBe(TEST_VERSION);
    expect(result.envelope.keyId).toBe(TEST_KEY_ID);
    expect(typeof result.envelope.wrappedKey).toBe('string');
    expect(typeof result.envelope.dataIv).toBe('string');
  });

  it('round-trips arbitrary binary data', async () => {
    const original = crypto.getRandomValues(new Uint8Array(4096));
    const { ciphertext, envelope } = await encryptBytesForStorage(
      original.buffer as ArrayBuffer,
      publicKeyPem,
      TEST_KEY_ID,
      TEST_ALGORITHM,
      TEST_VERSION
    );
    const decrypted = await decryptBytesFromStorage(ciphertext.buffer as ArrayBuffer, envelope, privateKeyPem);
    expect(new Uint8Array(decrypted)).toEqual(original);
  });

  it('produces a different ciphertext/IV on each call', async () => {
    const plaintext = new TextEncoder().encode('same content');
    const r1 = await encryptBytesForStorage(plaintext.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID, TEST_ALGORITHM, TEST_VERSION);
    const r2 = await encryptBytesForStorage(plaintext.buffer as ArrayBuffer, publicKeyPem, TEST_KEY_ID, TEST_ALGORITHM, TEST_VERSION);
    expect(r1.envelope.dataIv).not.toBe(r2.envelope.dataIv);
    expect(Array.from(r1.ciphertext)).not.toEqual(Array.from(r2.ciphertext));
  });

  it('throws when decrypting with the wrong private key', async () => {
    const plaintext = new TextEncoder().encode('secret data');
    const { ciphertext, envelope } = await encryptBytesForStorage(
      plaintext.buffer as ArrayBuffer,
      publicKeyPem,
      TEST_KEY_ID,
      TEST_ALGORITHM,
      TEST_VERSION
    );

    const wrongPair = await generateRsaOaepKeyPair(modulusLength);
    const wrongPrivatePem = await exportToPkcs8Pem(wrongPair.privateKey);

    await expect(decryptBytesFromStorage(ciphertext.buffer as ArrayBuffer, envelope, wrongPrivatePem)).rejects.toThrow();
  });

  it('applies a custom keyLabel to the wrap/unwrap error path', async () => {
    await expect(
      encryptBytesForStorage(new Uint8Array(1).buffer, '', TEST_KEY_ID, TEST_ALGORITHM, TEST_VERSION, 'User KV encryption')
    ).rejects.toThrow('User KV encryption public key is invalid');
  });
});
