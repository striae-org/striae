// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { importConfirmationData } from '../../../app/components/actions/case-import/confirmation-import';
import { fetchDataApi } from '~/utils/api';
import { decryptExportBatch, getCaseData, updateCaseData } from '~/utils/data';
import { checkExistingCase } from '../../../app/components/actions/case-manage';
import { extractConfirmationImportPackage } from '../../../app/components/actions/case-import/confirmation-package';
import { verifyConfirmationAuditTrail } from '../../../app/components/actions/confirmation-audit-bundle';
import {
	validateConfirmationHash,
	validateConfirmationSignatureFile,
	validateExporterUid,
} from '../../../app/components/actions/case-import/validation';

vi.mock('~/utils/api', () => ({
	fetchDataApi: vi.fn(),
}));

vi.mock('~/utils/data', () => ({
	decryptExportBatch: vi.fn(),
	upsertFileConfirmationSummary: vi.fn(async () => undefined),
	getCaseData: vi.fn(),
	updateCaseData: vi.fn(async () => undefined),
}));

vi.mock('../../../app/components/actions/case-manage', () => ({
	checkExistingCase: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/confirmation-package', () => ({
	extractConfirmationImportPackage: vi.fn(),
}));

vi.mock('../../../app/components/actions/confirmation-audit-bundle', () => ({
	verifyConfirmationAuditTrail: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/validation', () => ({
	validateConfirmationHash: vi.fn(),
	validateConfirmationSignatureFile: vi.fn(),
	validateExporterUid: vi.fn(),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		startWorkflow: vi.fn(),
		endWorkflow: vi.fn(),
		logConfirmationImport: vi.fn(async () => undefined),
	},
}));

const OWNER_UID = 'owner-uid';
const CASE_NUMBER = 'CASE-001';
const AUDIT_CIPHERTEXT = 'audit-ciphertext';

function createUser(uid: string): User {
	return { uid, email: `${uid}@example.com` } as User;
}

function buildConfirmationJson(): string {
	return JSON.stringify({
		metadata: {
			caseNumber: CASE_NUMBER,
			exportDate: '2026-08-04T00:00:00.000Z',
			exportedBy: 'reviewer@example.com',
			exportedByUid: 'reviewer-uid',
			exportedByName: 'Reviewer',
			exportedByCompany: 'Lab',
			exportedByBadgeId: 'R-42',
			totalConfirmations: 1,
			version: '1.0',
			hash: 'a'.repeat(64),
			originalExportCreatedAt: '2026-08-01T00:00:00.000Z',
			originalCaseOwnerUid: OWNER_UID,
			signature: {
				algorithm: 'RSA-PSS',
				keyId: 'sig-key-1',
				signedAt: '2026-08-04T00:00:00.000Z',
				value: 'sig',
			},
		},
		confirmations: {
			'img-1': [
				{
					fullName: 'Reviewer',
					badgeId: 'R-42',
					timestamp: '2026-08-04T00:00:00.000Z',
					confirmationId: 'confirm-1',
					confirmedBy: 'reviewer-uid',
					confirmedByEmail: 'reviewer@example.com',
					confirmedByCompany: 'Lab',
					confirmedAt: '2026-08-04T00:00:00.000Z',
				},
			],
		},
	});
}

const ENCRYPTION_MANIFEST = {
	encryptionVersion: '1.0',
	algorithm: 'AES-GCM',
	keyId: 'key-1',
	wrappedKey: 'wrapped-key',
	dataIv: 'iv-1',
};

interface PackageOverrides {
	includeAuditBundle?: boolean;
}

function arrangeHappyPath(confirmationJson: string, overrides?: PackageOverrides): void {
	const includeAuditBundle = overrides?.includeAuditBundle ?? true;

	vi.mocked(extractConfirmationImportPackage).mockResolvedValue({
		confirmationData: JSON.parse(confirmationJson),
		confirmationJsonContent: 'encrypted-placeholder',
		confirmationFileName: 'confirmation-data-CASE-001.json',
		encryptionManifest: { ...ENCRYPTION_MANIFEST },
		encryptedDataBase64: 'confirmation-ciphertext',
		...(includeAuditBundle
			? {
					auditBundleEncryptedDataBase64: AUDIT_CIPHERTEXT,
					auditBundleEncryptionManifest: { ...ENCRYPTION_MANIFEST },
				}
			: {}),
	});

	vi.mocked(decryptExportBatch).mockImplementation(async (_user, _manifest, base64) => {
		if (base64 === AUDIT_CIPHERTEXT) {
			return { plaintext: 'signed-audit-json', decryptedImages: {} };
		}
		return { plaintext: confirmationJson, decryptedImages: {} };
	});

	vi.mocked(validateConfirmationHash).mockResolvedValue(true);
	vi.mocked(validateConfirmationSignatureFile).mockResolvedValue({
		isValid: true,
		keyId: 'sig-key-1',
		error: undefined,
	});
	vi.mocked(validateExporterUid).mockResolvedValue({ exists: true, isSelf: false });
	vi.mocked(checkExistingCase).mockResolvedValue({ caseNumber: CASE_NUMBER } as never);

	vi.mocked(fetchDataApi).mockImplementation(async (_user, path: string, options?: { method?: string }) => {
		const method = options?.method ?? 'GET';
		if (path.endsWith(`/${CASE_NUMBER}/data.json`) && method === 'GET') {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					files: [{ id: 'img-1', originalFilename: 'evidence.png' }],
					archived: false,
				}),
			} as never;
		}
		if (path.includes('/img-1/data.json') && method === 'GET') {
			return { ok: true, status: 200, json: async () => ({}) } as never;
		}
		if (path.includes('/img-1/data.json') && method === 'PUT') {
			return { ok: true, status: 200, json: async () => ({}) } as never;
		}
		return { ok: false, status: 404, json: async () => ({}) } as never;
	});

	vi.mocked(verifyConfirmationAuditTrail).mockResolvedValue({
		entries: [
			{
				entryId: 'entry-1',
				timestamp: '2026-08-04T00:00:00.000Z',
				userId: 'reviewer-uid',
				userEmail: 'reviewer@example.com',
				action: 'confirmation-create',
				result: 'success',
				details: { caseNumber: CASE_NUMBER, validationErrors: [] },
			},
			{
				entryId: 'entry-2',
				timestamp: '2026-08-04T01:00:00.000Z',
				userId: 'reviewer-uid',
				userEmail: 'reviewer@example.com',
				action: 'confirmation-export',
				result: 'success',
				details: { caseNumber: CASE_NUMBER, validationErrors: [] },
			},
		],
		exportTimestamp: '2026-08-04T02:00:00.000Z',
		totalEntries: 2,
		scopeIdentifier: CASE_NUMBER,
		auditTrailCaseNumber: CASE_NUMBER,
	});
}

describe('importConfirmationData audit-trail merge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('merges the reviewer audit trail into the live case on a successful import', async () => {
		arrangeHappyPath(buildConfirmationJson());
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			createdAt: '2026-07-01T00:00:00.000Z',
			isReadOnly: false,
			confirmationAuditTrails: [],
		} as never);

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.confirmationsImported).toBe(1);
		expect(verifyConfirmationAuditTrail).toHaveBeenCalledWith('signed-audit-json');
		expect(updateCaseData).toHaveBeenCalledTimes(1);

		const [, caseNumberArg, updatedCaseData] = vi.mocked(updateCaseData).mock.calls[0];
		expect(caseNumberArg).toBe(CASE_NUMBER);
		const bundles = (updatedCaseData as { confirmationAuditTrails?: unknown[] }).confirmationAuditTrails;
		expect(bundles).toHaveLength(1);
		expect(bundles?.[0]).toMatchObject({
			source: 'confirmation-bundle',
			reviewingExaminerUid: 'reviewer-uid',
			reviewingExaminerName: 'Reviewer',
			reviewingExaminerBadgeId: 'R-42',
			exportTimestamp: '2026-08-04T02:00:00.000Z',
			totalEntries: 2,
		});
	});

	it('does not merge when no audit bundle is present in the package', async () => {
		arrangeHappyPath(buildConfirmationJson(), { includeAuditBundle: false });
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [],
		} as never);

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(verifyConfirmationAuditTrail).not.toHaveBeenCalled();
		expect(updateCaseData).not.toHaveBeenCalled();
	});

	it('skips duplicate merges for the same reviewer + export timestamp', async () => {
		arrangeHappyPath(buildConfirmationJson());
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [
				{
					source: 'confirmation-bundle',
					importedAt: '2026-08-04T03:00:00.000Z',
					reviewingExaminerUid: 'reviewer-uid',
					exportTimestamp: '2026-08-04T02:00:00.000Z',
					entries: [],
				},
			],
		} as never);

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(verifyConfirmationAuditTrail).toHaveBeenCalledTimes(1);
		expect(updateCaseData).not.toHaveBeenCalled();
	});

	it('does not fail the import when audit-trail verification throws', async () => {
		arrangeHappyPath(buildConfirmationJson());
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [],
		} as never);
		vi.mocked(verifyConfirmationAuditTrail).mockRejectedValue(new Error('bad signature'));

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.confirmationsImported).toBe(1);
		expect(updateCaseData).not.toHaveBeenCalled();
	});

	it('does not merge when signed audit scopeIdentifier targets a different case', async () => {
		arrangeHappyPath(buildConfirmationJson());
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [],
		} as never);
		vi.mocked(verifyConfirmationAuditTrail).mockResolvedValueOnce({
			entries: [],
			exportTimestamp: '2026-08-04T02:00:00.000Z',
			totalEntries: 0,
			scopeIdentifier: 'CASE-999',
			auditTrailCaseNumber: CASE_NUMBER,
		});

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.confirmationsImported).toBe(1);
		expect(verifyConfirmationAuditTrail).toHaveBeenCalledTimes(1);
		expect(updateCaseData).not.toHaveBeenCalled();
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'Failed to merge reviewer audit trail into case audit trail:',
			expect.objectContaining({
				message: expect.stringContaining('signed scope case "CASE-999" does not match target case "CASE-001"')
			})
		);
		consoleWarnSpy.mockRestore();
	});

	it('does not merge when signed audit scope fields are missing', async () => {
		arrangeHappyPath(buildConfirmationJson());
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [],
		} as never);
		vi.mocked(verifyConfirmationAuditTrail).mockResolvedValueOnce({
			entries: [],
			exportTimestamp: '2026-08-04T02:00:00.000Z',
			totalEntries: 0,
		});

		const result = await importConfirmationData(
			createUser(OWNER_UID),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.confirmationsImported).toBe(1);
		expect(verifyConfirmationAuditTrail).toHaveBeenCalledTimes(1);
		expect(updateCaseData).not.toHaveBeenCalled();
	});
});
