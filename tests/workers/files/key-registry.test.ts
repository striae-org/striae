/**
 * Tests for workers/files-worker/src/security/key-registry.ts
 *
 * Validates the R2-backed key registry fetch + candidate fallback chain used
 * when decrypting stored files.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { decryptBinaryWithRegistry } from '../../../workers/files-worker/src/security/key-registry';
import { encryptBinaryForStorage } from '../../../workers/files-worker/src/encryption-utils';
import { encryptRegistryJson } from '../../../shared/registry/registry-encryption';
import type { Env } from '../../../workers/files-worker/src/types';

function createMockR2Bucket(content: string | null): R2Bucket {
  return {
    get: async () =>
      content === null
        ? null
        : ({
            text: async () => content,
          } as unknown as R2ObjectBody),
    put: async () => ({} as R2Object),
    delete: async () => {},
    list: async () => ({ objects: [], truncated: false, delimitedPrefixes: [] } as unknown as R2Objects),
    head: async () => null,
    createMultipartUpload: async () => ({} as R2MultipartUpload),
    resumeMultipartUpload: () => ({} as R2MultipartUpload),
  } as unknown as R2Bucket;
}

function generateTestKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of keyBytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createEncryptedMockR2Bucket(registryJson: string, key: string): Promise<R2Bucket> {
  const envelope = await encryptRegistryJson(registryJson, key);
  return createMockR2Bucket(JSON.stringify(envelope));
}

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

function buildEnv(overrides: Partial<Env> & { STRIAE_CONFIG?: R2Bucket }): Env {
  return {
    STRIAE_FILES: {} as R2Bucket,
    STRIAE_CONFIG: createMockR2Bucket(null),
    REGISTRY_ENCRYPTION_KEY: 'placeholder',
    DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'placeholder',
    DATA_AT_REST_ENCRYPTION_KEY_ID: 'placeholder',
    ...overrides,
  } as Env;
}

describe('decryptBinaryWithRegistry', () => {
  let testKey: string;
  let publicKeyPem: string;
  let privateKeyPem: string;

  beforeAll(async () => {
    testKey = generateTestKey();
    const keyPair = await generateRsaOaepKeyPair();
    publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
    privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
  });

  it('decrypts using the record key id when present in the registry', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'active-key',
      keys: { 'active-key': privateKeyPem },
    });

    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    const original = crypto.getRandomValues(new Uint8Array(256));
    const { ciphertext, envelope } = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, 'active-key');

    const decrypted = await decryptBinaryWithRegistry(ciphertext.buffer as ArrayBuffer, envelope, env);
    expect(new Uint8Array(decrypted)).toEqual(original);
  });

  it('falls back to the active registry key when the record key id is stale', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'active-key',
      keys: { 'active-key': privateKeyPem },
    });

    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    const original = crypto.getRandomValues(new Uint8Array(64));
    const { ciphertext, envelope } = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, 'stale-key-id');

    const decrypted = await decryptBinaryWithRegistry(ciphertext.buffer as ArrayBuffer, envelope, env);
    expect(new Uint8Array(decrypted)).toEqual(original);
  });

  it('throws after exhausting all candidates when none can decrypt', async () => {
    const wrongPair = await generateRsaOaepKeyPair();
    const wrongPrivatePem = await exportToPkcs8Pem(wrongPair.privateKey);

    const registryJson = JSON.stringify({
      activeKeyId: 'active-key',
      keys: { 'active-key': wrongPrivatePem },
    });

    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    const original = crypto.getRandomValues(new Uint8Array(32));
    const { ciphertext, envelope } = await encryptBinaryForStorage(original.buffer as ArrayBuffer, publicKeyPem, 'active-key');

    await expect(decryptBinaryWithRegistry(ciphertext.buffer as ArrayBuffer, envelope, env)).rejects.toThrow(
      'Failed to decrypt stored file after'
    );
  });
});
