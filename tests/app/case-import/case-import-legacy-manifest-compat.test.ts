// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { User } from 'firebase/auth';
import type * as CaseImportValidationModule from '../../../app/components/actions/case-import/validation';
import { importCaseForReview } from '../../../app/components/actions/case-import/orchestrator';
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

vi.mock('../../../app/components/actions/case-import/validation', async () => {
	const actual = await vi.importActual<typeof CaseImportValidationModule>('../../../app/components/actions/case-import/validation');

	return {
		...actual,
		validateCaseExporterUidForImport: vi.fn(),
	};
});

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

async function createLegacyExportZip(): Promise<File> {
	const zip = new JSZip();
	zip.file('CASE-LEGACY-1_data.json', new Uint8Array([1, 2, 3, 4]));
	zip.file(
		'FORENSIC_MANIFEST.json',
		JSON.stringify({
			manifestVersion: '4.0',
			caseNumber: 'CASE-LEGACY-1',
			createdAt: '2026-08-11T00:00:00.000Z',
			dataHash: 'a'.repeat(64),
			manifestHash: 'b'.repeat(64),
			totalFiles: 3,
			imageHashes: {
				'images/legacy-image-img123.jpg': 'c'.repeat(64),
				'files/legacy-report-file123.pdf': 'd'.repeat(64),
			},
			signature: {
				algorithm: 'RSASSA-PSS-SHA-256',
				keyId: 'sig-key-legacy',
				signedAt: '2026-08-11T00:00:00.000Z',
				value: 'legacy-signature',
			},
		}),
	);
	zip.file(
		'ENCRYPTION_MANIFEST.json',
		JSON.stringify({
			encryptionVersion: '1.0',
			algorithm: 'RSA-OAEP-AES-256-GCM',
			keyId: 'enc-key-legacy',
			wrappedKey: 'wrapped-key',
			dataIv: 'data-iv',
			encryptedImages: [
				{ filename: 'images/legacy-image-img123.jpg', encryptedHash: 'e'.repeat(64), iv: 'iv-1' },
				{ filename: 'files/legacy-report-file123.pdf', encryptedHash: 'f'.repeat(64), iv: 'iv-2' },
			],
		}),
	);
	zip.file('images/legacy-image-img123.jpg', new Uint8Array([9, 9, 9]));
	zip.file('files/legacy-report-file123.pdf', new Uint8Array([8, 8, 8]));

	const zipBlob = await zip.generateAsync({ type: 'blob' });
	const zipSource = typeof zipBlob.arrayBuffer === 'function' ? await zipBlob.arrayBuffer() : zipBlob;
	return new File([zipSource], 'legacy-case.zip', { type: 'application/zip' });
}

describe('importCaseForReview legacy manifest compatibility', () => {
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
			signatureResult: { isValid: true, keyId: 'sig-key-legacy' },
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

	it('imports a legacy package using imageHashes and encryptedImages', async () => {
		const zipFile = await createLegacyExportZip();
		const user = createUser('legacy-analyst');
		const casePayload = {
			metadata: {
				caseNumber: 'CASE-LEGACY-1',
				exportDate: '2026-08-11T00:00:00.000Z',
				exportedByUid: 'legacy-exporter',
			},
			files: [
				{
					fileData: {
						id: 'img123',
						originalFilename: 'legacy-image.jpg',
						uploadedAt: '2026-08-11T00:00:00.000Z',
					},
				},
			],
			otherFiles: [
				{
					fileData: {
						id: 'file123',
						originalFilename: 'legacy-report.pdf',
						uploadedAt: '2026-08-11T00:00:00.000Z',
						contentType: 'application/pdf',
						byteLength: 128,
					},
				},
			],
		};

		vi.mocked(decryptExportBatch).mockResolvedValue({
			plaintext: JSON.stringify(casePayload),
			decryptedImages: {
				'images/legacy-image-img123.jpg': new Blob(['img-bytes'], { type: 'image/jpeg' }),
				'files/legacy-report-file123.pdf': new Blob(['pdf-bytes'], { type: 'application/pdf' }),
			},
		});

		vi.mocked(uploadImageBlob).mockResolvedValue({
			id: 'imported-img-id',
			originalFilename: 'legacy-image.jpg',
			uploadedAt: '2026-08-11T00:00:00.000Z',
		});

		vi.mocked(uploadOtherFileBlob).mockResolvedValue({
			id: 'imported-file-id',
			originalFilename: 'legacy-report.pdf',
			uploadedAt: '2026-08-11T00:00:00.000Z',
			contentType: 'application/pdf',
			byteLength: 128,
		});

		const result = await importCaseForReview(user, zipFile);

		expect(result.success).toBe(true);
		expect(result.filesImported).toBe(2);

		expect(decryptExportBatch).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'legacy-analyst' }),
			expect.objectContaining({
				encryptedImages: expect.arrayContaining([
					expect.objectContaining({ filename: 'images/legacy-image-img123.jpg' }),
					expect.objectContaining({ filename: 'files/legacy-report-file123.pdf' }),
				]),
			}),
			expect.any(String),
			expect.objectContaining({
				'images/legacy-image-img123.jpg': expect.any(String),
				'files/legacy-report-file123.pdf': expect.any(String),
			}),
		);

		expect(verifyCasePackageIntegrity).toHaveBeenCalledWith(
			expect.objectContaining({
				imageFiles: expect.objectContaining({
					'images/legacy-image-img123.jpg': expect.any(Blob),
					'files/legacy-report-file123.pdf': expect.any(Blob),
				}),
			}),
		);

		expect(storeCaseDataInR2).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'legacy-analyst' }),
			'CASE-LEGACY-1',
			expect.objectContaining({ metadata: expect.objectContaining({ caseNumber: 'CASE-LEGACY-1' }) }),
			[expect.objectContaining({ id: 'imported-img-id', originalFilename: 'legacy-image.jpg' })],
			[expect.objectContaining({ id: 'imported-file-id', originalFilename: 'legacy-report.pdf' })],
			expect.any(Map),
			expect.any(Object),
			false,
			undefined,
		);
	});
});
