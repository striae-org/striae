import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { importConfirmationData } from '../../../app/components/actions/case-import/confirmation-import';
import { decryptExportBatch } from '~/utils/data';
import { checkExistingCase } from '../../../app/components/actions/case-manage';
import { extractConfirmationImportPackage } from '../../../app/components/actions/case-import/confirmation-package';
import {
	validateConfirmationHash,
	validateConfirmationSignatureFile,
	validateExporterUid,
} from '../../../app/components/actions/case-import/validation';
import { getVerificationPublicKey } from '~/utils/forensics';

vi.mock('~/utils/api', () => ({
	fetchDataApi: vi.fn(),
}));

vi.mock('~/utils/data', () => ({
	decryptExportBatch: vi.fn(),
	upsertFileConfirmationSummary: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-manage', () => ({
	checkExistingCase: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/confirmation-package', () => ({
	extractConfirmationImportPackage: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/validation', () => ({
	validateConfirmationHash: vi.fn(),
	validateConfirmationSignatureFile: vi.fn(),
	validateExporterUid: vi.fn(),
}));

vi.mock('~/utils/forensics', () => ({
	getVerificationPublicKey: vi.fn(),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		startWorkflow: vi.fn(),
		endWorkflow: vi.fn(),
		logConfirmationImport: vi.fn(async () => undefined),
	},
}));

function createMockUser(uid: string): User {
	return {
		uid,
		email: `${uid}@example.com`,
	} as User;
}

function buildConfirmationPayload(overrides?: {
	originalCaseOwnerUid?: string;
	exportedByUid?: string;
}): string {
	return JSON.stringify({
		metadata: {
			caseNumber: 'CASE-001',
			exportDate: '2026-08-04T00:00:00.000Z',
			exportedBy: 'reviewer@example.com',
			exportedByUid: overrides?.exportedByUid ?? 'reviewer-uid',
			exportedByName: 'Reviewer',
			exportedByCompany: 'Lab',
			totalConfirmations: 0,
			version: '1.0',
			hash: 'a'.repeat(64),
			...(overrides?.originalCaseOwnerUid !== undefined
				? { originalCaseOwnerUid: overrides.originalCaseOwnerUid }
				: {}),
		},
		confirmations: {},
	});
}

function arrangeCommonMocks(plaintext: string): void {
	vi.mocked(extractConfirmationImportPackage).mockResolvedValue({
		confirmationData: {
			metadata: {
				caseNumber: 'CASE-001',
				exportDate: '2026-08-04T00:00:00.000Z',
				exportedBy: 'reviewer@example.com',
				exportedByUid: 'reviewer-uid',
				exportedByName: 'Reviewer',
				exportedByCompany: 'Lab',
				totalConfirmations: 0,
				version: '1.0',
				hash: 'a'.repeat(64),
			},
			confirmations: {},
		},
		confirmationJsonContent: 'encrypted-placeholder',
		confirmationFileName: 'confirmation-data-CASE-001.json',
		encryptionManifest: {
			encryptionVersion: '1.0',
			algorithm: 'AES-GCM',
			keyId: 'key-1',
			wrappedKey: 'wrapped-key',
			dataIv: 'iv-1',
		},
		encryptedDataBase64: 'ciphertext',
	});

	vi.mocked(decryptExportBatch).mockResolvedValue({
		plaintext,
		decryptedImages: {},
	});
	vi.mocked(validateConfirmationHash).mockResolvedValue(true);
	vi.mocked(validateConfirmationSignatureFile).mockResolvedValue({
		isValid: true,
		keyId: 'sig-key-1',
		error: undefined,
	});
	vi.mocked(validateExporterUid).mockResolvedValue({
		exists: true,
		isSelf: false,
	});
	vi.mocked(getVerificationPublicKey).mockReturnValue(null);
}

describe('importConfirmationData owner enforcement', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fails closed when originalCaseOwnerUid is missing (no fallback to exportedByUid)', async () => {
		arrangeCommonMocks(
			buildConfirmationPayload({
				exportedByUid: 'reviewer-uid',
			})
		);

		const result = await importConfirmationData(
			createMockUser('owner-uid'),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toContain('missing owner identity metadata');
		expect(checkExistingCase).not.toHaveBeenCalled();
	});

	it('fails when originalCaseOwnerUid does not match authenticated user', async () => {
		arrangeCommonMocks(
			buildConfirmationPayload({
				originalCaseOwnerUid: 'different-owner',
				exportedByUid: 'reviewer-uid',
			})
		);

		const result = await importConfirmationData(
			createMockUser('owner-uid'),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toContain('can only be imported by the original case owner');
		expect(checkExistingCase).not.toHaveBeenCalled();
	});

	it('passes owner gate when originalCaseOwnerUid matches authenticated user', async () => {
		arrangeCommonMocks(
			buildConfirmationPayload({
				originalCaseOwnerUid: 'owner-uid',
				exportedByUid: 'reviewer-uid',
			})
		);
		vi.mocked(checkExistingCase).mockResolvedValue(null);

		const result = await importConfirmationData(
			createMockUser('owner-uid'),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(checkExistingCase).toHaveBeenCalledWith(expect.objectContaining({ uid: 'owner-uid' }), 'CASE-001');
		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toContain('does not exist in your case list');
	});

	it('rejects import when bundled PEM does not match trusted key for signature keyId', async () => {
		const signedPayload = JSON.stringify({
			metadata: {
				caseNumber: 'CASE-001',
				exportDate: '2026-08-04T00:00:00.000Z',
				exportedBy: 'reviewer@example.com',
				exportedByUid: 'reviewer-uid',
				exportedByName: 'Reviewer',
				exportedByCompany: 'Lab',
				totalConfirmations: 0,
				version: '1.0',
				hash: 'a'.repeat(64),
				originalCaseOwnerUid: 'owner-uid',
				signatureVersion: '1.0',
				signature: {
					algorithm: 'RSA-PSS-SHA256',
					keyId: 'sig-key-1',
					signedAt: '2026-08-04T00:00:00.000Z',
					value: 'signature-value',
				},
			},
			confirmations: {},
		});

		arrangeCommonMocks(signedPayload);

		vi.mocked(extractConfirmationImportPackage).mockResolvedValueOnce({
			confirmationData: {
				metadata: {
					caseNumber: 'CASE-001',
					exportDate: '2026-08-04T00:00:00.000Z',
					exportedBy: 'reviewer@example.com',
					exportedByUid: 'reviewer-uid',
					exportedByName: 'Reviewer',
					exportedByCompany: 'Lab',
					totalConfirmations: 0,
					version: '1.0',
					hash: 'a'.repeat(64),
				},
				confirmations: {},
			},
			confirmationJsonContent: 'encrypted-placeholder',
			confirmationFileName: 'confirmation-data-CASE-001.json',
			packagedVerificationPublicKeyPem: '-----BEGIN PUBLIC KEY-----\nPACKAGED\n-----END PUBLIC KEY-----',
			encryptionManifest: {
				encryptionVersion: '1.0',
				algorithm: 'AES-GCM',
				keyId: 'key-1',
				wrappedKey: 'wrapped-key',
				dataIv: 'iv-1',
			},
			encryptedDataBase64: 'ciphertext',
		});

		vi.mocked(getVerificationPublicKey).mockReturnValue(
			'-----BEGIN PUBLIC KEY-----\nTRUSTED\n-----END PUBLIC KEY-----'
		);

		const result = await importConfirmationData(
			createMockUser('owner-uid'),
			new File(['dummy'], 'confirmation.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(false);
		expect(result.errors?.[0]).toContain('Security validation failed');
		expect(checkExistingCase).not.toHaveBeenCalled();
	});
});
