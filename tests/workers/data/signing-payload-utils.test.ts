// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for workers/data-worker/src/signing-payload-utils.ts
 *
 * Validates that:
 * - All create*SigningPayload functions are deterministic
 * - All isValid* type guards correctly accept/reject inputs
 * - Version constants have the expected values
 *
 * These run in the Cloudflare Workers miniflare environment.
 */

import { describe, it, expect } from 'vitest';
import {
  createManifestSigningPayload,
  createConfirmationSigningPayload,
  createAuditExportSigningPayload,
  isValidManifestPayload,
  isValidConfirmationPayload,
  isValidAuditExportPayload,
  FORENSIC_MANIFEST_VERSION,
  CONFIRMATION_SIGNATURE_VERSION,
  AUDIT_EXPORT_SIGNATURE_VERSION,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  type ForensicManifestPayload,
  type ConfirmationSigningPayload,
  type AuditExportSigningPayload,
} from '../../../workers/data-worker/src/signing-payload-utils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_HASH = 'a'.repeat(64);

const validManifest: ForensicManifestPayload = {
  caseNumber: 'CASE-001',
  dataHash: FAKE_HASH,
  fileHashes: { 'b.jpg': 'b'.repeat(64), 'a.jpg': 'a'.repeat(64) },
  manifestHash: 'c'.repeat(64),
  totalFiles: 2,
  createdAt: '2026-04-20T00:00:00.000Z',
};

const validConfirmation: ConfirmationSigningPayload = {
  metadata: {
    caseNumber: 'CASE-001',
    exportDate: '2026-04-20T00:00:00.000Z',
    exportedBy: 'uid-001',
    exportedByUid: 'uid-001',
    exportedByName: 'John Doe',
    exportedByCompany: 'Crime Lab',
    totalConfirmations: 1,
    version: '1.0',
    hash: FAKE_HASH,
  },
  confirmations: {
    'img-001.jpg': [
      {
        fullName: 'Jane Smith',
        badgeId: 'B001',
        timestamp: '2026-04-20T10:00:00.000Z',
        confirmationId: 'conf-abc',
        confirmedBy: 'uid-jane',
        confirmedByEmail: 'jane@example.com',
        confirmedByCompany: 'Crime Lab',
        confirmedAt: '2026-04-20T10:01:00.000Z',
      },
    ],
  },
};

const validAuditExport: AuditExportSigningPayload = {
  signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
  exportFormat: 'json',
  exportType: 'trail',
  scopeType: 'case',
  scopeIdentifier: 'CASE-001',
  generatedAt: '2026-04-20T00:00:00.000Z',
  totalEntries: 10,
  hash: FAKE_HASH,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('FORENSIC_MANIFEST_VERSION is 4.0', () => {
    expect(FORENSIC_MANIFEST_VERSION).toBe('4.0');
  });

  it('CONFIRMATION_SIGNATURE_VERSION is 3.0', () => {
    expect(CONFIRMATION_SIGNATURE_VERSION).toBe('3.0');
  });

  it('AUDIT_EXPORT_SIGNATURE_VERSION is 2.0', () => {
    expect(AUDIT_EXPORT_SIGNATURE_VERSION).toBe('2.0');
  });

  it('FORENSIC_MANIFEST_SIGNATURE_ALGORITHM is RSASSA-PSS-SHA-256', () => {
    expect(FORENSIC_MANIFEST_SIGNATURE_ALGORITHM).toBe('RSASSA-PSS-SHA-256');
  });
});

// ---------------------------------------------------------------------------
// isValidManifestPayload
// ---------------------------------------------------------------------------

describe('isValidManifestPayload', () => {
  it('returns true for a valid manifest', () => {
    expect(isValidManifestPayload(validManifest)).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(isValidManifestPayload({})).toBe(false);
  });

  it('returns false when dataHash is missing', () => {
    const { dataHash: _, ...rest } = validManifest;
    expect(isValidManifestPayload(rest)).toBe(false);
  });

  it('returns false when caseNumber is missing', () => {
    const { caseNumber: _, ...rest } = validManifest;
    expect(isValidManifestPayload(rest)).toBe(false);
  });

  it('returns false when dataHash is not 64 hex chars', () => {
    expect(isValidManifestPayload({ ...validManifest, dataHash: 'tooshort' })).toBe(false);
  });

  it('returns false when totalFiles is 0', () => {
    expect(isValidManifestPayload({ ...validManifest, totalFiles: 0 })).toBe(false);
  });

  it('returns false when fileHashes is missing', () => {
    const { fileHashes: _, ...rest } = validManifest;
    expect(isValidManifestPayload(rest)).toBe(false);
  });

  it('returns false when a fileHash value is invalid', () => {
    const invalid = { ...validManifest, fileHashes: { 'a.jpg': 'bad' } };
    expect(isValidManifestPayload(invalid)).toBe(false);
  });

  it('returns false when fileHashes is an array', () => {
    const invalid = { ...validManifest, fileHashes: ['a'.repeat(64)] as unknown as Record<string, string> };
    expect(isValidManifestPayload(invalid)).toBe(false);
  });

  it('returns false when imageHashes is an array', () => {
    const invalid = { ...validManifest, fileHashes: undefined, imageHashes: ['a'.repeat(64)] as unknown as Record<string, string> };
    expect(isValidManifestPayload(invalid)).toBe(false);
  });

	it('accepts a legacy manifest payload that still uses imageHashes', () => {
		expect(isValidManifestPayload({ ...validManifest, fileHashes: undefined, imageHashes: { 'a.jpg': 'a'.repeat(64) } })).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isValidConfirmationPayload
// ---------------------------------------------------------------------------

describe('isValidConfirmationPayload', () => {
  it('returns true for a valid confirmation payload', () => {
    expect(isValidConfirmationPayload(validConfirmation)).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(isValidConfirmationPayload({})).toBe(false);
  });

  it('returns false when metadata is missing', () => {
    const { metadata: _, ...rest } = validConfirmation;
    expect(isValidConfirmationPayload(rest)).toBe(false);
  });

  it('returns false when confirmations is missing', () => {
    const { confirmations: _, ...rest } = validConfirmation;
    expect(isValidConfirmationPayload(rest)).toBe(false);
  });

  it('returns false when hash is invalid', () => {
    const invalid = {
      ...validConfirmation,
      metadata: { ...validConfirmation.metadata, hash: 'invalid' },
    };
    expect(isValidConfirmationPayload(invalid)).toBe(false);
  });

  it('returns false when totalConfirmations is negative', () => {
    const invalid = {
      ...validConfirmation,
      metadata: { ...validConfirmation.metadata, totalConfirmations: -1 },
    };
    expect(isValidConfirmationPayload(invalid)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidAuditExportPayload
// ---------------------------------------------------------------------------

describe('isValidAuditExportPayload', () => {
  it('returns true for a valid audit export payload', () => {
    expect(isValidAuditExportPayload(validAuditExport)).toBe(true);
  });

  it('returns false for wrong version', () => {
    expect(isValidAuditExportPayload({ ...validAuditExport, signatureVersion: '1.0' })).toBe(false);
  });

  it('returns false for negative totalEntries', () => {
    expect(isValidAuditExportPayload({ ...validAuditExport, totalEntries: -1 })).toBe(false);
  });

  it('returns false for empty scopeIdentifier', () => {
    expect(isValidAuditExportPayload({ ...validAuditExport, scopeIdentifier: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createManifestSigningPayload
// ---------------------------------------------------------------------------

describe('createManifestSigningPayload', () => {
  it('returns valid JSON', () => {
    const result = createManifestSigningPayload(validManifest);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('is deterministic', () => {
    const p1 = createManifestSigningPayload(validManifest);
    const p2 = createManifestSigningPayload(validManifest);
    expect(p1).toBe(p2);
  });

  it('sorts fileHashes alphabetically', () => {
    const result = JSON.parse(createManifestSigningPayload(validManifest));
    const keys = Object.keys(result.fileHashes);
    expect(keys).toEqual([...keys].sort());
  });

  it('normalizes hashes to lowercase', () => {
    const manifest = { ...validManifest, dataHash: 'A'.repeat(64), manifestHash: 'B'.repeat(64) };
    const result = JSON.parse(createManifestSigningPayload(manifest));
    expect(result.dataHash).toBe('a'.repeat(64));
    expect(result.manifestHash).toBe('b'.repeat(64));
  });

  it('includes manifestVersion', () => {
    const result = JSON.parse(createManifestSigningPayload(validManifest));
    expect(result.manifestVersion).toBe(FORENSIC_MANIFEST_VERSION);
  });
});

// ---------------------------------------------------------------------------
// createConfirmationSigningPayload
// ---------------------------------------------------------------------------

describe('createConfirmationSigningPayload', () => {
  it('returns valid JSON', () => {
    const result = createConfirmationSigningPayload(validConfirmation);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('is deterministic', () => {
    const p1 = createConfirmationSigningPayload(validConfirmation);
    const p2 = createConfirmationSigningPayload(validConfirmation);
    expect(p1).toBe(p2);
  });

  it('uppercases the hash field', () => {
    const result = JSON.parse(createConfirmationSigningPayload(validConfirmation));
    expect(result.metadata.hash).toBe(FAKE_HASH.toUpperCase());
  });

  it('sorts confirmation image IDs alphabetically', () => {
    const data: ConfirmationSigningPayload = {
      ...validConfirmation,
      confirmations: {
        'z.jpg': validConfirmation.confirmations['img-001.jpg'],
        'a.jpg': validConfirmation.confirmations['img-001.jpg'],
      },
    };
    const result = JSON.parse(createConfirmationSigningPayload(data));
    const keys = Object.keys(result.confirmations);
    expect(keys).toEqual(['a.jpg', 'z.jpg']);
  });
});

// ---------------------------------------------------------------------------
// createAuditExportSigningPayload
// ---------------------------------------------------------------------------

describe('createAuditExportSigningPayload', () => {
  it('returns valid JSON', () => {
    const result = createAuditExportSigningPayload(validAuditExport);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('is deterministic', () => {
    const p1 = createAuditExportSigningPayload(validAuditExport);
    const p2 = createAuditExportSigningPayload(validAuditExport);
    expect(p1).toBe(p2);
  });

  it('uppercases the hash', () => {
    const result = JSON.parse(createAuditExportSigningPayload(validAuditExport));
    expect(result.hash).toBe(FAKE_HASH.toUpperCase());
  });
});
