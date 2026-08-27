import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { CaseExportData } from '~/types';
import { importCaseForReview } from '../../../app/components/actions/case-import/orchestrator';
import { parseImportZip } from '../../../app/components/actions/case-import/zip-processing';
import { decryptExportBatch } from '~/utils/data/operations/signing-operations';
import { verifyCasePackageIntegrity } from '~/utils/forensics';
import { checkExistingCase, validateCaseNumber } from '../../../app/components/actions/case-manage';
import { uploadImageBlob, uploadOtherFileBlob } from '../../../app/components/actions/case-import/image-operations';
import {
	addReadOnlyCaseToUser,
	checkReadOnlyCaseExists,
	deleteReadOnlyCase,
	listReadOnlyCases,
	storeCaseDataInR2,
} from '../../../app/components/actions/case-import/storage-operations';
import { importAnnotations } from '../../../app/components/actions/case-import/annotation-import';
import { validateCaseExporterUidForImport } from '../../../app/components/actions/case-import/validation';

vi.mock('../../../app/components/actions/case-import/zip-processing', () => ({
	parseImportZip: vi.fn(),
}));

vi.mock('~/utils/data/operations/signing-operations', () => ({
	decryptExportBatch: vi.fn(),
}));

vi.mock('~/utils/forensics', () => ({
	verifyCasePackageIntegrity: vi.fn(),
	getVerificationPublicKey: vi.fn(() => null),
}));

vi.mock('../../../app/components/actions/case-manage', () => ({
	checkExistingCase: vi.fn(),
	validateCaseNumber: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/image-operations', () => ({
	uploadImageBlob: vi.fn(),
	uploadOtherFileBlob: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/storage-operations', () => ({
	checkReadOnlyCaseExists: vi.fn(),
	deleteReadOnlyCase: vi.fn(),
	storeCaseDataInR2: vi.fn(),
	addReadOnlyCaseToUser: vi.fn(),
	removeReadOnlyCase: vi.fn(),
	listReadOnlyCases: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/annotation-import', () => ({
	importAnnotations: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-import/validation', () => ({
	validateCaseExporterUidForImport: vi.fn(),
}));

vi.mock('../../../app/components/actions/other-files-manage', () => ({
	deleteOtherFile: vi.fn(),
}));

vi.mock('../../../app/components/actions/image-manage', () => ({
	deleteFile: vi.fn(),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		startWorkflow: vi.fn(),
		endWorkflow: vi.fn(),
		logCaseImport: vi.fn(async () => undefined),
	},
}));

function createUser(uid: string): User {
	return {
		uid,
		email: `${uid}@example.com`,
	} as User;
}

function createManifest(): Record<string, unknown> {
	return {
		encryptionVersion: '1.0',
		algorithm: 'AES-GCM',
		keyId: 'enc-key-1',
		wrappedKey: 'wrapped-key',
		dataIv: 'iv-1',
		encryptedFiles: [],
	};
}

function createEncryptedPlaceholderCaseData(): CaseExportData {
	return {
		metadata: {
			caseNumber: 'ENCRYPTED',
			caseCreatedDate: '2026-08-11T00:00:00.000Z',
			exportDate: '2026-08-11T00:00:00.000Z',
			exportedBy: 'exporter@example.com',
			exportedByUid: 'exporter-uid',
			exportedByName: 'Exporter',
			exportedByCompany: 'Lab',
			striaeExportSchemaVersion: '1.0',
			totalFiles: 1,
		},
		files: [],
	};
}

function createForensicManifest() {
	return {
		manifestVersion: '4.0',
		createdAt: '2026-08-11T00:00:00.000Z',
		dataHash: 'a'.repeat(64),
		manifestHash: 'b'.repeat(64),
		totalFiles: 2,
		fileHashes: {
			'images/ballistic__imgid123.jpg': 'c'.repeat(64),
			'files/report__fileid123.pdf': 'd'.repeat(64),
		},
		signature: {
			algorithm: 'RSASSA-PSS-SHA-256',
			keyId: 'sig-key-1',
			signedAt: '2026-08-11T00:00:00.000Z',
			value: 'sig-value',
		},
	};
}

describe('importCaseForReview associated file coverage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateCaseNumber).mockReturnValue(true);
		vi.mocked(checkExistingCase).mockResolvedValue(null);
		vi.mocked(checkReadOnlyCaseExists).mockResolvedValue(null);
		vi.mocked(deleteReadOnlyCase).mockResolvedValue(true);
		vi.mocked(listReadOnlyCases).mockResolvedValue([]);
		vi.mocked(importAnnotations).mockResolvedValue(0);
		vi.mocked(addReadOnlyCaseToUser).mockResolvedValue(undefined);
		vi.mocked(storeCaseDataInR2).mockResolvedValue(undefined);
		vi.mocked(validateCaseExporterUidForImport).mockResolvedValue({
			exists: true,
			isSelf: false,
			isArchivedExport: false,
			allowArchivedSelfImport: false,
		});
		vi.mocked(verifyCasePackageIntegrity).mockResolvedValue({
			isValid: true,
			signatureResult: { isValid: true, keyId: 'sig-key-1' },
			integrityResult: {
				isValid: true,
				dataValid: true,
				imageValidation: {},
				manifestValid: true,
				errors: [],
				summary: 'ok',
			},
			bundledAuditVerification: null,
		});
	});

	it('imports mixed images and associated files and stores both sets', async () => {
		const user = createUser('analyst-1');
		const casePayload = {
			metadata: {
				caseNumber: 'CASE-001',
				exportDate: '2026-08-11T00:00:00.000Z',
				exportedByUid: 'exporter-1',
			},
			files: [
				{
					fileData: {
						id: 'imgid123',
						originalFilename: 'ballistic.jpg',
						uploadedAt: '2026-08-11T00:00:00.000Z',
					},
				},
			],
			otherFiles: [
				{
					fileData: {
						id: 'fileid123',
						originalFilename: 'report.pdf',
						uploadedAt: '2026-08-11T00:00:00.000Z',
						contentType: 'application/pdf',
						byteLength: 128,
					},
				},
			],
		};

		vi.mocked(parseImportZip).mockResolvedValue({
			caseData: createEncryptedPlaceholderCaseData(),
			imageIdMapping: { 'ballistic__imgid123.jpg': 'imgid123' },
			isArchivedExport: false,
			bundledAuditFiles: undefined,
			metadata: { forensicManifest: createForensicManifest() },
			cleanedContent: '',
			packagedVerificationPublicKeyPem: undefined,
			encryptionManifest: createManifest(),
			encryptedDataBase64: 'ciphertext',
			encryptedFiles: {
				'images/ballistic__imgid123.jpg': 'abc',
				'files/report__fileid123.pdf': 'def',
			},
			isEncrypted: true,
			dataFileName: 'case-001_data.json',
		});

		vi.mocked(decryptExportBatch).mockResolvedValue({
			plaintext: JSON.stringify(casePayload),
			decryptedImages: {
				'images/ballistic__imgid123.jpg': new Blob(['img-bytes'], { type: 'image/jpeg' }),
				'files/report__fileid123.pdf': new Blob(['pdf-bytes'], { type: 'application/pdf' }),
			},
		});

		vi.mocked(uploadImageBlob).mockResolvedValue({
			id: 'new-img-id',
			originalFilename: 'ballistic.jpg',
			uploadedAt: '2026-08-11T00:00:00.000Z',
		});

		vi.mocked(uploadOtherFileBlob).mockResolvedValue({
			id: 'new-file-id',
			originalFilename: 'report.pdf',
			uploadedAt: '2026-08-11T00:00:00.000Z',
			contentType: 'application/pdf',
			byteLength: 128,
		});

		const result = await importCaseForReview(
			user,
			new File(['zip-content'], 'case.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.filesImported).toBe(2);

		expect(uploadImageBlob).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			expect.any(Blob),
			'ballistic.jpg',
			'2026-08-11T00:00:00.000Z',
			expect.any(Function)
		);

		expect(uploadOtherFileBlob).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			expect.any(Blob),
			'report.pdf',
			'2026-08-11T00:00:00.000Z',
			expect.any(Function)
		);

		expect(verifyCasePackageIntegrity).toHaveBeenCalledWith(
			expect.objectContaining({
				imageFiles: expect.objectContaining({
					'images/ballistic__imgid123.jpg': expect.any(Blob),
					'files/report__fileid123.pdf': expect.any(Blob),
				}),
			})
		);

		expect(storeCaseDataInR2).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			'CASE-001',
			expect.objectContaining({ metadata: expect.objectContaining({ caseNumber: 'CASE-001' }) }),
			[
				expect.objectContaining({ id: 'new-img-id', originalFilename: 'ballistic.jpg' }),
			],
			[
				expect.objectContaining({ id: 'new-file-id', originalFilename: 'report.pdf' }),
			],
			expect.any(Map),
			expect.any(Object),
			false,
			undefined
		);
	});

	it('imports associated-files-only packages without requiring image uploads', async () => {
		const user = createUser('analyst-2');
		const casePayload = {
			metadata: {
				caseNumber: 'CASE-ONLY-FILES',
				exportDate: '2026-08-11T00:00:00.000Z',
				exportedByUid: 'exporter-2',
			},
			files: [],
			otherFiles: [
				{
					fileData: {
						id: 'fileid999',
						originalFilename: 'notes.txt',
						uploadedAt: '2026-08-11T00:00:00.000Z',
						contentType: 'text/plain',
						byteLength: 64,
					},
				},
			],
		};

		vi.mocked(parseImportZip).mockResolvedValue({
			caseData: createEncryptedPlaceholderCaseData(),
			imageIdMapping: {},
			isArchivedExport: false,
			bundledAuditFiles: undefined,
			metadata: { forensicManifest: createForensicManifest() },
			cleanedContent: '',
			packagedVerificationPublicKeyPem: undefined,
			encryptionManifest: createManifest(),
			encryptedDataBase64: 'ciphertext',
			encryptedFiles: {
				'files/notes__fileid999.txt': 'xyz',
			},
			isEncrypted: true,
			dataFileName: 'case-only-files_data.json',
		});

		vi.mocked(decryptExportBatch).mockResolvedValue({
			plaintext: JSON.stringify(casePayload),
			decryptedImages: {
				'files/notes__fileid999.txt': new Blob(['notes'], { type: 'text/plain' }),
			},
		});

		vi.mocked(uploadOtherFileBlob).mockResolvedValue({
			id: 'new-file-only-id',
			originalFilename: 'notes.txt',
			uploadedAt: '2026-08-11T00:00:00.000Z',
			contentType: 'text/plain',
			byteLength: 64,
		});

		const result = await importCaseForReview(
			user,
			new File(['zip-content'], 'case-only-files.zip', { type: 'application/zip' })
		);

		expect(result.success).toBe(true);
		expect(result.filesImported).toBe(1);
		expect(uploadImageBlob).not.toHaveBeenCalled();

		expect(uploadOtherFileBlob).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-2' }),
			expect.any(Blob),
			'notes.txt',
			'2026-08-11T00:00:00.000Z',
			expect.any(Function)
		);

		expect(storeCaseDataInR2).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-2' }),
			'CASE-ONLY-FILES',
			expect.objectContaining({ metadata: expect.objectContaining({ caseNumber: 'CASE-ONLY-FILES' }) }),
			[],
			[
				expect.objectContaining({ id: 'new-file-only-id', originalFilename: 'notes.txt' }),
			],
			expect.any(Map),
			expect.any(Object),
			false,
			undefined
		);
	});
});
