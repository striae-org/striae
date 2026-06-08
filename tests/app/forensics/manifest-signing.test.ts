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
  dataHash: FAKE_HASH_A,
  imageHashes: { 'image-b.jpg': FAKE_HASH_B, 'image-a.jpg': FAKE_HASH_A },
  manifestHash: 'c'.repeat(64),
  totalFiles: 2,
  createdAt: '2026-04-20T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('FORENSIC_MANIFEST_VERSION is 3.0', () => {
    expect(FORENSIC_MANIFEST_VERSION).toBe('3.0');
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

  it('sorts imageHashes keys alphabetically', () => {
    const manifest: ForensicManifestData = {
      ...sampleManifestData,
      imageHashes: { 'z-image.jpg': FAKE_HASH_B, 'a-image.jpg': FAKE_HASH_A },
    };
    const payload = JSON.parse(createManifestSigningPayload(manifest));
    const keys = Object.keys(payload.imageHashes);
    expect(keys).toEqual(['a-image.jpg', 'z-image.jpg']);
  });

  it('produces same canonical output regardless of original key order', () => {
    const m1: ForensicManifestData = {
      ...sampleManifestData,
      imageHashes: { 'b.jpg': FAKE_HASH_B, 'a.jpg': FAKE_HASH_A },
    };
    const m2: ForensicManifestData = {
      ...sampleManifestData,
      imageHashes: { 'a.jpg': FAKE_HASH_A, 'b.jpg': FAKE_HASH_B },
    };
    expect(createManifestSigningPayload(m1)).toBe(createManifestSigningPayload(m2));
  });

  it('normalizes hashes to lowercase', () => {
    const manifest: ForensicManifestData = {
      ...sampleManifestData,
      dataHash: 'A'.repeat(64),
      imageHashes: { 'img.jpg': 'B'.repeat(64) },
      manifestHash: 'C'.repeat(64),
    };
    const payload = JSON.parse(createManifestSigningPayload(manifest));
    expect(payload.dataHash).toBe('a'.repeat(64));
    expect(payload.imageHashes['img.jpg']).toBe('b'.repeat(64));
    expect(payload.manifestHash).toBe('c'.repeat(64));
  });

  it('accepts a custom manifest version', () => {
    const payload = JSON.parse(createManifestSigningPayload(sampleManifestData, '2.0'));
    expect(payload.manifestVersion).toBe('2.0');
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

  it('sorts imageHashes in the returned object', () => {
    const input: ForensicManifestData = {
      ...sampleManifestData,
      imageHashes: { 'z.jpg': FAKE_HASH_B, 'a.jpg': FAKE_HASH_A },
    };
    const result = extractForensicManifestData(input);
    expect(Object.keys(result!.imageHashes)).toEqual(['a.jpg', 'z.jpg']);
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

  async function buildSignedManifest(data: ForensicManifestData): Promise<SignedForensicManifest> {
    const payload = createManifestSigningPayload(data);
    const value = await signWithKey(payload, rsaKeyPair.privateKey);
    return {
      ...data,
      manifestVersion: FORENSIC_MANIFEST_VERSION,
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

  it('returns isValid=false for a tampered imageHash', async () => {
    const signed = await buildSignedManifest(sampleManifestData);
    const tampered: SignedForensicManifest = {
      ...signed,
      imageHashes: { ...signed.imageHashes, 'image-a.jpg': 'e'.repeat(64) },
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
