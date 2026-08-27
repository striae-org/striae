/**
 * Tests for app/utils/forensics/audit-export-signature.ts
 *
 * Validates payload validation guards, canonical payload construction,
 * and audit export signature verification using ephemeral RSA-PSS keys.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  isValidAuditExportSigningPayload,
  createAuditExportSigningPayload,
  verifyAuditExportSignature,
  AUDIT_EXPORT_SIGNATURE_VERSION,
  type AuditExportSigningPayload,
} from '~/utils/forensics/audit-export-signature';
import {
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  type ForensicManifestSignature,
} from '~/utils/forensics/SHA256';

// ---------------------------------------------------------------------------
// Helpers
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

const FAKE_HASH = 'a'.repeat(64);

const validPayload: AuditExportSigningPayload = {
  signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
  exportFormat: 'json',
  exportType: 'trail',
  scopeType: 'case',
  scopeIdentifier: 'CASE-001',
  generatedAt: '2026-04-20T00:00:00.000Z',
  totalEntries: 42,
  hash: FAKE_HASH,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AUDIT_EXPORT_SIGNATURE_VERSION', () => {
  it('is 2.0', () => {
    expect(AUDIT_EXPORT_SIGNATURE_VERSION).toBe('2.0');
  });
});

describe('isValidAuditExportSigningPayload', () => {
  it('returns true for a valid payload', () => {
    expect(isValidAuditExportSigningPayload(validPayload)).toBe(true);
  });

  it('returns false for wrong signatureVersion', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, signatureVersion: '1.0' })).toBe(false);
  });

  it('returns false for wrong exportFormat', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidAuditExportSigningPayload({ ...validPayload, exportFormat: 'csv' as any })).toBe(false);
  });

  it('returns false for wrong exportType', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidAuditExportSigningPayload({ ...validPayload, exportType: 'summary' as any })).toBe(false);
  });

  it('returns false for invalid scopeType', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidAuditExportSigningPayload({ ...validPayload, scopeType: 'org' as any })).toBe(false);
  });

  it('accepts scopeType "user"', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, scopeType: 'user' })).toBe(true);
  });

  it('returns false for empty scopeIdentifier', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, scopeIdentifier: '   ' })).toBe(false);
  });

  it('returns false for invalid generatedAt date', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, generatedAt: 'not-a-date' })).toBe(false);
  });

  it('returns false for negative totalEntries', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, totalEntries: -1 })).toBe(false);
  });

  it('allows totalEntries of 0', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, totalEntries: 0 })).toBe(true);
  });

  it('returns false for invalid hash (not 64 hex chars)', () => {
    expect(isValidAuditExportSigningPayload({ ...validPayload, hash: 'tooshort' })).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isValidAuditExportSigningPayload({})).toBe(false);
  });
});

describe('createAuditExportSigningPayload', () => {
  it('returns a valid JSON string', () => {
    const result = createAuditExportSigningPayload(validPayload);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('is deterministic for the same input', () => {
    const p1 = createAuditExportSigningPayload(validPayload);
    const p2 = createAuditExportSigningPayload(validPayload);
    expect(p1).toBe(p2);
  });

  it('uppercases the hash field', () => {
    const result = JSON.parse(createAuditExportSigningPayload(validPayload));
    expect(result.hash).toBe(FAKE_HASH.toUpperCase());
  });

  it('preserves all required fields', () => {
    const result = JSON.parse(createAuditExportSigningPayload(validPayload));
    expect(result.signatureVersion).toBe(AUDIT_EXPORT_SIGNATURE_VERSION);
    expect(result.exportFormat).toBe('json');
    expect(result.exportType).toBe('trail');
    expect(result.scopeType).toBe('case');
    expect(result.scopeIdentifier).toBe('CASE-001');
    expect(result.totalEntries).toBe(42);
  });
});

describe('verifyAuditExportSignature', () => {
  let rsaKeyPair: CryptoKeyPair;
  let publicKeyPem: string;

  beforeAll(async () => {
    rsaKeyPair = await generateTestRsaPssKeyPair();
    publicKeyPem = await exportPublicKeyToPem(rsaKeyPair.publicKey);
  });

  async function buildSignature(payload: AuditExportSigningPayload): Promise<ForensicManifestSignature> {
    const canonicalPayload = createAuditExportSigningPayload(payload);
    const value = await signWithKey(canonicalPayload, rsaKeyPair.privateKey);
    return {
      algorithm: FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
      keyId: 'test-key-1',
      signedAt: new Date().toISOString(),
      value,
    };
  }

  it('returns isValid=true for a correctly signed payload', async () => {
    const sig = await buildSignature(validPayload);
    const result = await verifyAuditExportSignature(validPayload, sig, publicKeyPem);
    expect(result.isValid).toBe(true);
  });

  it('returns isValid=false when signature is missing', async () => {
    const result = await verifyAuditExportSignature(validPayload, undefined, publicKeyPem);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns isValid=false when payload is malformed', async () => {
    const sig = await buildSignature(validPayload);
    const result = await verifyAuditExportSignature({ signatureVersion: '2.0' }, sig, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when payload content is tampered', async () => {
    const sig = await buildSignature(validPayload);
    const tampered: AuditExportSigningPayload = { ...validPayload, totalEntries: 999 };
    const result = await verifyAuditExportSignature(tampered, sig, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when a wrong public key is used', async () => {
    const sig = await buildSignature(validPayload);
    const otherPair = await generateTestRsaPssKeyPair();
    const otherPem = await exportPublicKeyToPem(otherPair.publicKey);
    const result = await verifyAuditExportSignature(validPayload, sig, otherPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when no key is configured and none is passed', async () => {
    const sig = await buildSignature(validPayload);
    const result = await verifyAuditExportSignature(validPayload, sig);
    expect(result.isValid).toBe(false);
  });
});
