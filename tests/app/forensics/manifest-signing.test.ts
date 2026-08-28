// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for app/utils/forensics/SHA256.ts
 *
 * Validates SHA-256 hashing, canonical manifest payload construction,
 * and forensic manifest signature verification using ephemeral RSA-PSS keys.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  calculateSHA256,
  createManifestSigningPayload,
  verifyForensicManifestSignature,
  extractForensicManifestData,
  FORENSIC_MANIFEST_LEGACY_VERSION,
  FORENSIC_MANIFEST_VERSION,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  type ForensicManifestData,
  type SignedForensicManifest,
} from '~/utils/forensics/SHA256';
import paths from '~/config/config.json';

// ---------------------------------------------------------------------------
// Helpers: ephemeral RSA-PSS key pair
// ---------------------------------------------------------------------------

async function generateTestRsaPssKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function exportPublicKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const lines = base64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Signs a payload string using RSA-PSS-SHA-256 with salt length 32 */
async function signWithKey(payload: string, privateKey: CryptoKey): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: 'RSA-PSS', saltLength: 32 },
    privateKey,
    new TextEncoder().encode(payload)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_HASH_A = 'a'.repeat(64);
const FAKE_HASH_B = 'b'.repeat(64);

const sampleManifestData: ForensicManifestData = {
  caseNumber: 'CASE-001',
  dataHash: FAKE_HASH_A,
  fileHashes: { 'files/file-b.pdf': FAKE_HASH_B, 'images/image-a.jpg': FAKE_HASH_A },
  manifestHash: 'c'.repeat(64),
  totalFiles: 2,
  createdAt: '2026-04-20T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('FORENSIC_MANIFEST_VERSION is 4.0', () => {
    expect(FORENSIC_MANIFEST_VERSION).toBe('4.0');
  });

  it('FORENSIC_MANIFEST_LEGACY_VERSION is 3.0', () => {
    expect(FORENSIC_MANIFEST_LEGACY_VERSION).toBe('3.0');
  });

  it('FORENSIC_MANIFEST_SIGNATURE_ALGORITHM is RSASSA-PSS-SHA-256', () => {
    expect(FORENSIC_MANIFEST_SIGNATURE_ALGORITHM).toBe('RSASSA-PSS-SHA-256');
  });
});

describe('calculateSHA256', () => {
  it('returns a 64-character lowercase hex string', async () => {
    const hash = await calculateSHA256('hello');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns known hash for "hello"', async () => {
    const hash = await calculateSHA256('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('empty string produces a known hash', async () => {
    const hash = await calculateSHA256('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('same input always produces same output', async () => {
    const [h1, h2] = await Promise.all([calculateSHA256('striae'), calculateSHA256('striae')]);
    expect(h1).toBe(h2);
  });

  it('different inputs produce different hashes', async () => {
    const [h1, h2] = await Promise.all([calculateSHA256('foo'), calculateSHA256('bar')]);
    expect(h1).not.toBe(h2);
  });

  it('throws for null input', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(calculateSHA256(null as any)).rejects.toThrow();
  });

  it('throws for undefined input', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(calculateSHA256(undefined as any)).rejects.toThrow();
  });
});

describe('createManifestSigningPayload', () => {
  it('returns a JSON string', () => {
    const payload = createManifestSigningPayload(sampleManifestData);
    expect(() => JSON.parse(payload)).not.toThrow();
  });

  it('is deterministic for the same input', () => {
    const p1 = createManifestSigningPayload(sampleManifestData);
    const p2 = createManifestSigningPayload(sampleManifestData);
    expect(p1).toBe(p2);
  });

  it('includes the manifest version', () => {
    const payload = JSON.parse(createManifestSigningPayload(sampleManifestData));
    expect(payload.manifestVersion).toBe(FORENSIC_MANIFEST_VERSION);
  });

  it('includes caseNumber in v4 payloads', () => {
    const payload = JSON.parse(createManifestSigningPayload(sampleManifestData));
    expect(payload.caseNumber).toBe(sampleManifestData.caseNumber);
  });

  it('sorts fileHashes keys alphabetically', () => {
    const manifest: ForensicManifestData = {
      ...sampleManifestData,
      fileHashes: { 'z-image.jpg': FAKE_HASH_B, 'a-image.jpg': FAKE_HASH_A },
    };
    const payload = JSON.parse(createManifestSigningPayload(manifest));
    const keys = Object.keys(payload.fileHashes);
    expect(keys).toEqual(['a-image.jpg', 'z-image.jpg']);
  });

  it('produces same canonical output regardless of original key order', () => {
    const m1: ForensicManifestData = {
      ...sampleManifestData,
      fileHashes: { 'b.jpg': FAKE_HASH_B, 'a.jpg': FAKE_HASH_A },
    };
    const m2: ForensicManifestData = {
      ...sampleManifestData,
      fileHashes: { 'a.jpg': FAKE_HASH_A, 'b.jpg': FAKE_HASH_B },
    };
    expect(createManifestSigningPayload(m1)).toBe(createManifestSigningPayload(m2));
  });

  it('normalizes hashes to lowercase', () => {
    const manifest: ForensicManifestData = {
      ...sampleManifestData,
      dataHash: 'A'.repeat(64),
      fileHashes: { 'img.jpg': 'B'.repeat(64) },
      manifestHash: 'C'.repeat(64),
    };
    const payload = JSON.parse(createManifestSigningPayload(manifest));
    expect(payload.dataHash).toBe('a'.repeat(64));
    expect(payload.fileHashes['img.jpg']).toBe('b'.repeat(64));
    expect(payload.manifestHash).toBe('c'.repeat(64));
  });

  it('accepts the legacy manifest version', () => {
    const legacyManifest: ForensicManifestData = {
      dataHash: sampleManifestData.dataHash,
      fileHashes: sampleManifestData.fileHashes,
      manifestHash: sampleManifestData.manifestHash,
      totalFiles: sampleManifestData.totalFiles,
      createdAt: sampleManifestData.createdAt,
    };

    const payload = JSON.parse(createManifestSigningPayload(legacyManifest, FORENSIC_MANIFEST_LEGACY_VERSION));
    expect(payload.manifestVersion).toBe(FORENSIC_MANIFEST_LEGACY_VERSION);
    expect(payload.caseNumber).toBeUndefined();
  });

  it('throws when v4 payload is missing caseNumber', () => {
    const manifestWithoutCase: ForensicManifestData = {
      dataHash: sampleManifestData.dataHash,
      fileHashes: sampleManifestData.fileHashes,
      manifestHash: sampleManifestData.manifestHash,
      totalFiles: sampleManifestData.totalFiles,
      createdAt: sampleManifestData.createdAt,
    };

    expect(() => createManifestSigningPayload(manifestWithoutCase, FORENSIC_MANIFEST_VERSION)).toThrow();
  });
});

describe('extractForensicManifestData', () => {
  it('returns null for an empty object', () => {
    expect(extractForensicManifestData({})).toBeNull();
  });

  it('returns null when dataHash is missing', () => {
    const { dataHash: _, ...rest } = sampleManifestData;
    expect(extractForensicManifestData(rest as Partial<SignedForensicManifest>)).toBeNull();
  });

  it('returns null when totalFiles is 0', () => {
    expect(
      extractForensicManifestData({ ...sampleManifestData, totalFiles: 0 })
    ).toBeNull();
  });

  it('returns a normalized ForensicManifestData for a valid input', () => {
    const result = extractForensicManifestData(sampleManifestData);
    expect(result).not.toBeNull();
    expect(result!.totalFiles).toBe(2);
    expect(result!.dataHash).toBe(FAKE_HASH_A);
  });

  it('sorts fileHashes in the returned object', () => {
    const input: ForensicManifestData = {
      ...sampleManifestData,
      fileHashes: { 'z.jpg': FAKE_HASH_B, 'a.jpg': FAKE_HASH_A },
    };
    const result = extractForensicManifestData(input);
    expect(Object.keys(result!.fileHashes)).toEqual(['a.jpg', 'z.jpg']);
  });

  it('accepts a legacy manifest that still uses imageHashes', () => {
    const legacyResult = extractForensicManifestData({
      caseNumber: 'CASE-LEGACY',
      dataHash: FAKE_HASH_A,
      imageHashes: { 'image-a.jpg': FAKE_HASH_A },
      manifestHash: 'c'.repeat(64),
      totalFiles: 2,
      createdAt: '2026-04-20T00:00:00.000Z',
      manifestVersion: '4.0',
    } as Partial<SignedForensicManifest>);

    expect(legacyResult?.fileHashes).toEqual({ 'image-a.jpg': FAKE_HASH_A });
  });
});

describe('verifyForensicManifestSignature', () => {
  let rsaKeyPair: CryptoKeyPair;
  let publicKeyPem: string;
  const mutableConfig = paths as unknown as {
    manifest_signing_key_id?: string;
    manifest_signing_public_key?: string;
    manifest_signing_public_keys?: Record<string, string>;
  };
  const originalConfig = {
    manifest_signing_key_id: mutableConfig.manifest_signing_key_id,
    manifest_signing_public_key: mutableConfig.manifest_signing_public_key,
    manifest_signing_public_keys: mutableConfig.manifest_signing_public_keys
      ? { ...mutableConfig.manifest_signing_public_keys }
      : undefined,
  };

  beforeAll(async () => {
    rsaKeyPair = await generateTestRsaPssKeyPair();
    publicKeyPem = await exportPublicKeyToPem(rsaKeyPair.publicKey);
  });

  afterAll(() => {
    mutableConfig.manifest_signing_key_id = originalConfig.manifest_signing_key_id;
    mutableConfig.manifest_signing_public_key = originalConfig.manifest_signing_public_key;
    mutableConfig.manifest_signing_public_keys = originalConfig.manifest_signing_public_keys;
  });

  async function buildSignedManifest(
    data: ForensicManifestData,
    manifestVersion: string = FORENSIC_MANIFEST_VERSION
  ): Promise<SignedForensicManifest> {
    const payload = createManifestSigningPayload(data, manifestVersion);
    const value = await signWithKey(payload, rsaKeyPair.privateKey);
    return {
      ...data,
      manifestVersion,
      signature: {
        algorithm: FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
        keyId: 'test-key-1',
        signedAt: new Date().toISOString(),
        value,
      },
    };
  }

  it('returns isValid=true for a correctly signed manifest', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const result = await verifyForensicManifestSignature(signed, publicKeyPem);
    expect(result.isValid).toBe(true);
  });

  it('returns isValid=false when signature is missing', async () => {
    const result = await verifyForensicManifestSignature(sampleManifestData);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns isValid=false for a tampered dataHash', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const tampered: SignedForensicManifest = {
      ...signed,
      dataHash: 'd'.repeat(64),
    };
    const result = await verifyForensicManifestSignature(tampered, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false for a tampered fileHash', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const tampered: SignedForensicManifest = {
      ...signed,
      fileHashes: { ...signed.fileHashes, 'images/image-a.jpg': 'e'.repeat(64) },
    };
    const result = await verifyForensicManifestSignature(tampered, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false for a wrong manifest version', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const wrongVersion: SignedForensicManifest = { ...signed, manifestVersion: '2.0' };
    const result = await verifyForensicManifestSignature(wrongVersion, publicKeyPem);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/2\.0/);
  });

  it('verifies a legacy v3.0 manifest signed without caseNumber', async () => {
    const legacyManifest: ForensicManifestData = {
      dataHash: sampleManifestData.dataHash,
      fileHashes: sampleManifestData.fileHashes,
      manifestHash: sampleManifestData.manifestHash,
      totalFiles: sampleManifestData.totalFiles,
      createdAt: sampleManifestData.createdAt,
    };

    const signedLegacy = await buildSignedManifest(legacyManifest, FORENSIC_MANIFEST_LEGACY_VERSION);
    const result = await verifyForensicManifestSignature(signedLegacy, publicKeyPem);
    expect(result.isValid).toBe(true);
  });

  it('returns isValid=false when v4 caseNumber is tampered', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const tampered: SignedForensicManifest = {
      ...signed,
      caseNumber: 'CASE-TAMPERED',
    };
    const result = await verifyForensicManifestSignature(tampered, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when a wrong public key is used', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const otherPair = await generateTestRsaPssKeyPair();
    const otherPem = await exportPublicKeyToPem(otherPair.publicKey);
    const result = await verifyForensicManifestSignature(signed, otherPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when no key is configured and no key is passed', async () => {
    // No verificationPublicKeyPem, and test-config.json has empty key maps
    const signed = await buildSignedManifest(sampleManifestData);
    const result = await verifyForensicManifestSignature(signed);
    expect(result.isValid).toBe(false);
  });

  it('falls back to other configured public keys when keyId lookup misses', async () => {
    const payload = createManifestSigningPayload(sampleManifestData);
    const signatureValue = await signWithKey(payload, rsaKeyPair.privateKey);

    const signed: SignedForensicManifest = {
      ...sampleManifestData,
      manifestVersion: FORENSIC_MANIFEST_VERSION,
      signature: {
        algorithm: FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
        keyId: 'missing-key-id',
        signedAt: new Date().toISOString(),
        value: signatureValue,
      },
    };

    mutableConfig.manifest_signing_key_id = 'configured-key';
    mutableConfig.manifest_signing_public_key = '';
    mutableConfig.manifest_signing_public_keys = {
      'known-key': publicKeyPem,
    };

    const result = await verifyForensicManifestSignature(signed);
    expect(result.isValid).toBe(true);
  });
});
