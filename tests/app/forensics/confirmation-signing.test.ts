/**
 * Tests for app/utils/forensics/confirmation-signature.ts
 *
 * Validates canonical payload construction and signature verification for
 * confirmation export packages. Uses ephemeral RSA-PSS keys.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createConfirmationSigningPayload,
  verifyConfirmationSignature,
  CONFIRMATION_SIGNATURE_VERSION,
} from '~/utils/forensics/confirmation-signature';
import {
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
} from '~/utils/forensics/SHA256';
import type { ConfirmationImportData } from '~/types';

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

const FAKE_HASH = 'f'.repeat(64);

const sampleEntry = {
  fullName: 'Jane Smith',
  badgeId: 'B001',
  timestamp: '2026-04-20T10:00:00.000Z',
  confirmationId: 'conf-abc-123',
  confirmedBy: 'uid-jane',
  confirmedByEmail: 'jane@example.com',
  confirmedByCompany: 'ACME Forensics',
  confirmedAt: '2026-04-20T10:01:00.000Z',
};

const sampleConfirmationData: ConfirmationImportData = {
  metadata: {
    caseNumber: 'CASE-001',
    exportDate: '2026-04-20T00:00:00.000Z',
    exportedBy: 'uid-exporter',
    exportedByUid: 'uid-exporter',
    exportedByName: 'John Doe',
    exportedByCompany: 'ACME Forensics',
    totalConfirmations: 1,
    version: '1.0',
    hash: FAKE_HASH,
    signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
  },
  confirmations: {
    'image-001.jpg': [sampleEntry],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CONFIRMATION_SIGNATURE_VERSION', () => {
  it('is 3.0', () => {
    expect(CONFIRMATION_SIGNATURE_VERSION).toBe('3.0');
  });
});

describe('createConfirmationSigningPayload', () => {
  it('returns a valid JSON string', () => {
    const payload = createConfirmationSigningPayload(sampleConfirmationData);
    expect(() => JSON.parse(payload)).not.toThrow();
  });

  it('is deterministic for the same input', () => {
    const p1 = createConfirmationSigningPayload(sampleConfirmationData);
    const p2 = createConfirmationSigningPayload(sampleConfirmationData);
    expect(p1).toBe(p2);
  });

  it('includes the signatureVersion in the payload', () => {
    const payload = JSON.parse(createConfirmationSigningPayload(sampleConfirmationData));
    expect(payload.signatureVersion).toBe(CONFIRMATION_SIGNATURE_VERSION);
  });

  it('uppercases the hash field', () => {
    const payload = JSON.parse(createConfirmationSigningPayload(sampleConfirmationData));
    expect(payload.metadata.hash).toBe(FAKE_HASH.toUpperCase());
  });

  it('sorts imageIds alphabetically', () => {
    const data: ConfirmationImportData = {
      ...sampleConfirmationData,
      confirmations: {
        'z-image.jpg': [sampleEntry],
        'a-image.jpg': [sampleEntry],
      },
    };
    const payload = JSON.parse(createConfirmationSigningPayload(data));
    const keys = Object.keys(payload.confirmations);
    expect(keys).toEqual(['a-image.jpg', 'z-image.jpg']);
  });

  it('produces same payload regardless of confirmations key insertion order', () => {
    const d1: ConfirmationImportData = {
      ...sampleConfirmationData,
      confirmations: { 'b.jpg': [sampleEntry], 'a.jpg': [sampleEntry] },
    };
    const d2: ConfirmationImportData = {
      ...sampleConfirmationData,
      confirmations: { 'a.jpg': [sampleEntry], 'b.jpg': [sampleEntry] },
    };
    expect(createConfirmationSigningPayload(d1)).toBe(createConfirmationSigningPayload(d2));
  });

  it('omits exportedByBadgeId when includeExportedByBadgeId is false', () => {
    const data: ConfirmationImportData = {
      ...sampleConfirmationData,
      metadata: { ...sampleConfirmationData.metadata, exportedByBadgeId: 'B999' },
    };
    const payload = JSON.parse(createConfirmationSigningPayload(data, CONFIRMATION_SIGNATURE_VERSION, { includeExportedByBadgeId: false }));
    expect(payload.metadata.exportedByBadgeId).toBeUndefined();
  });
});

describe('verifyConfirmationSignature', () => {
  let rsaKeyPair: CryptoKeyPair;
  let publicKeyPem: string;

  beforeAll(async () => {
    rsaKeyPair = await generateTestRsaPssKeyPair();
    publicKeyPem = await exportPublicKeyToPem(rsaKeyPair.publicKey);
  });

  async function buildSignedConfirmation(
    data: ConfirmationImportData
  ): Promise<ConfirmationImportData> {
    const payload = createConfirmationSigningPayload(data);
    const value = await signWithKey(payload, rsaKeyPair.privateKey);
    return {
      ...data,
      metadata: {
        ...data.metadata,
        signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
        signature: {
          algorithm: FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
          keyId: 'test-key-1',
          signedAt: new Date().toISOString(),
          value,
        },
      },
    };
  }

  it('returns isValid=true for a correctly signed confirmation', async () => {
    const signed = await buildSignedConfirmation(sampleConfirmationData);
    const result = await verifyConfirmationSignature(signed, publicKeyPem);
    expect(result.isValid).toBe(true);
  });

  it('returns isValid=false when signature is missing', async () => {
    const result = await verifyConfirmationSignature(sampleConfirmationData);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns isValid=false when signatureVersion is wrong', async () => {
    const signed = await buildSignedConfirmation(sampleConfirmationData);
    const tampered: ConfirmationImportData = {
      ...signed,
      metadata: { ...signed.metadata, signatureVersion: '1.0' },
    };
    const result = await verifyConfirmationSignature(tampered, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when confirmation content is tampered', async () => {
    const signed = await buildSignedConfirmation(sampleConfirmationData);
    const tampered: ConfirmationImportData = {
      ...signed,
      metadata: { ...signed.metadata, caseNumber: 'TAMPERED-999' },
    };
    const result = await verifyConfirmationSignature(tampered, publicKeyPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when a wrong public key is used', async () => {
    const signed = await buildSignedConfirmation(sampleConfirmationData);
    const otherPair = await generateTestRsaPssKeyPair();
    const otherPem = await exportPublicKeyToPem(otherPair.publicKey);
    const result = await verifyConfirmationSignature(signed, otherPem);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when no key configured and none passed', async () => {
    const signed = await buildSignedConfirmation(sampleConfirmationData);
    const result = await verifyConfirmationSignature(signed);
    expect(result.isValid).toBe(false);
  });
});
