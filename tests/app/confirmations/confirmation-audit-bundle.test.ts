// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { ValidationAuditEntry } from '~/types';
import type * as ForensicsModule from '~/utils/forensics';

vi.mock('~/services/audit/audit-export-signing', () => ({
	signAuditExport: vi.fn(),
}));

// Keep the real calculateSHA256Secure so hash integrity is exercised end-to-end;
// only stub the signature verification boundary.
vi.mock('~/utils/forensics', async (importOriginal) => {
	const actual = await importOriginal<typeof ForensicsModule>();
	return {
		...actual,
		verifyAuditExportSignature: vi.fn(),
	};
});

import { signAuditExport } from '~/services/audit/audit-export-signing';
import { verifyAuditExportSignature } from '~/utils/forensics';
import {
	buildSignedConfirmationAuditTrail,
	verifyConfirmationAuditTrail,
} from '../../../app/components/actions/confirmation-audit-bundle';

function createUser(uid: string): User {
	return { uid, email: `${uid}@example.com` } as User;
}

function makeEntry(overrides?: Partial<ValidationAuditEntry>): ValidationAuditEntry {
	return {
		entryId: 'entry-1',
		timestamp: '2026-08-05T00:00:00.000Z',
		userId: 'reviewer-uid',
		userEmail: 'reviewer@example.com',
		action: 'confirmation-import',
		result: 'success',
		details: {
			caseNumber: 'CASE-001',
			validationErrors: [],
		},
		...overrides,
	};
}

function arrangeSigningMocks(): void {
	vi.mocked(signAuditExport).mockImplementation(async (payload) => ({
		signatureMetadata: {
			signatureVersion: '1.0',
			exportFormat: 'json',
			exportType: 'trail',
			scopeType: 'case',
			scopeIdentifier: 'CASE-001',
			generatedAt: payload.generatedAt,
			totalEntries: payload.totalEntries,
			hash: payload.hash,
		},
		signature: {
			algorithm: 'RSA-PSS',
			keyId: 'sig-key-1',
			signedAt: '2026-08-05T00:00:00.000Z',
			value: 'signature-value',
		},
	}));

	vi.mocked(verifyAuditExportSignature).mockResolvedValue({
		isValid: true,
		keyId: 'sig-key-1',
	});
}

describe('confirmation audit bundle build/verify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		arrangeSigningMocks();
	});

	it('round-trips: a signed trail verifies and returns the original entries', async () => {
		const entries = [
			makeEntry({ timestamp: '2026-08-05T00:00:00.000Z', action: 'confirmation-import' }),
			makeEntry({ timestamp: '2026-08-06T00:00:00.000Z', action: 'confirmation-create' }),
		];

		const signedJson = await buildSignedConfirmationAuditTrail(
			createUser('reviewer-uid'),
			'CASE-001',
			entries
		);

		const verified = await verifyConfirmationAuditTrail(signedJson, 'pem');

		expect(verified.entries).toHaveLength(2);
		expect(verified.totalEntries).toBe(2);
		expect(verified.scopeIdentifier).toBe('CASE-001');
		expect(verified.auditTrailCaseNumber).toBe('CASE-001');
		expect(new Set(verified.entries.map((entry) => entry.action))).toEqual(
			new Set(['confirmation-import', 'confirmation-create'])
		);
		expect(verifyAuditExportSignature).toHaveBeenCalledTimes(1);
	});

	it('fails integrity verification when a bundled entry is tampered with', async () => {
		const signedJson = await buildSignedConfirmationAuditTrail(
			createUser('reviewer-uid'),
			'CASE-001',
			[makeEntry()]
		);

		const parsed = JSON.parse(signedJson);
		parsed.auditTrail.entries[0].result = 'failure';
		const tampered = JSON.stringify(parsed, null, 2);

		await expect(verifyConfirmationAuditTrail(tampered, 'pem')).rejects.toThrow(
			/failed integrity verification/i
		);
		expect(verifyAuditExportSignature).not.toHaveBeenCalled();
	});

	it('fails when the signature verification boundary rejects the payload', async () => {
		const signedJson = await buildSignedConfirmationAuditTrail(
			createUser('reviewer-uid'),
			'CASE-001',
			[makeEntry()]
		);

		vi.mocked(verifyAuditExportSignature).mockResolvedValueOnce({
			isValid: false,
			error: 'bad signature',
		});

		await expect(verifyConfirmationAuditTrail(signedJson, 'pem')).rejects.toThrow(
			/signature verification failed/i
		);
	});

	it('rejects malformed bundle JSON', async () => {
		await expect(verifyConfirmationAuditTrail('not-json', 'pem')).rejects.toThrow(
			/not valid JSON/i
		);
	});

	it('rejects a structurally invalid bundle (missing auditTrail entries)', async () => {
		const malformed = JSON.stringify({ metadata: { scopeIdentifier: 'CASE-001' } });
		await expect(verifyConfirmationAuditTrail(malformed, 'pem')).rejects.toThrow(
			/malformed/i
		);
	});
});
