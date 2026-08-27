import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { User } from 'firebase/auth';
import type * as ForensicsModule from '~/utils/forensics';
import { buildArchivePackage } from '../../../app/components/actions/case-manage/archive-package-builder';

vi.mock('../../../app/components/actions/image-manage', () => ({
	getImageUrl: vi.fn(),
}));

vi.mock('../../../app/components/actions/other-files-manage', () => ({
	getOtherFileUrl: vi.fn(),
}));

vi.mock('~/utils/data', () => ({
	signForensicManifest: vi.fn(),
}));

vi.mock('~/utils/forensics', async () => {
	const actual = await vi.importActual<typeof ForensicsModule>('~/utils/forensics');
	return {
		...actual,
		generateForensicManifestSecure: vi.fn(),
		encryptExportDataWithAllImages: vi.fn(),
		getCurrentEncryptionPublicKeyDetails: vi.fn(),
		getCurrentPublicSigningKeyDetails: vi.fn(),
		getVerificationPublicKey: vi.fn(),
		createPublicSigningKeyFileName: vi.fn((keyId?: string | null) => `striae-public-signing-key-${keyId ?? 'current'}.pem`),
	};
});

vi.mock('~/services/audit/audit-export-signing', () => ({
	signAuditExport: vi.fn(),
}));

vi.mock('~/services/audit/audit-query-helpers', () => ({
	generateAuditSummary: vi.fn(() => ({ totalEvents: 1 })),
	sortAuditEntriesNewestFirst: vi.fn((entries) => entries),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		getAuditEntriesForUser: vi.fn(),
	},
}));

import { getImageUrl } from '../../../app/components/actions/image-manage';
import { getOtherFileUrl } from '../../../app/components/actions/other-files-manage';
import { signForensicManifest } from '~/utils/data';
import {
	encryptExportDataWithAllImages,
	generateForensicManifestSecure,
	getCurrentEncryptionPublicKeyDetails,
	getCurrentPublicSigningKeyDetails,
	getVerificationPublicKey,
} from '~/utils/forensics';
import { signAuditExport } from '~/services/audit/audit-export-signing';
import { auditService } from '~/services/audit';

function createUser(): User {
	return { uid: 'user-1', email: 'user@example.com' } as User;
}

describe('buildArchivePackage associated file coverage', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(getImageUrl).mockResolvedValue({
			url: 'blob:image',
			blob: new Uint8Array([1, 2, 3, 4]) as unknown as Blob,
			revoke: vi.fn(),
			urlType: 'blob',
		});

		vi.mocked(getOtherFileUrl).mockResolvedValue({
			url: 'blob:file',
			blob: new Uint8Array([5, 6, 7, 8]) as unknown as Blob,
			revoke: vi.fn(),
			urlType: 'blob',
		});

		vi.mocked(generateForensicManifestSecure).mockResolvedValue({
			caseNumber: 'CASE-ARCHIVE-1',
			dataHash: 'a'.repeat(64),
			fileHashes: {
				'images/bullet-img-1.jpg': 'b'.repeat(64),
				'files/report-file-1.pdf': 'c'.repeat(64),
			},
			manifestHash: 'd'.repeat(64),
			totalFiles: 3,
			createdAt: '2026-08-11T00:00:00.000Z',
		});

		vi.mocked(signForensicManifest).mockResolvedValue({
			manifestVersion: '4.0',
			signature: {
				algorithm: 'RSASSA-PSS-SHA-256',
				keyId: 'sig-key-1',
				signedAt: '2026-08-11T00:00:00.000Z',
				value: 'signed-value',
			},
		});

		vi.mocked(getCurrentPublicSigningKeyDetails).mockReturnValue({
			keyId: 'sig-key-1',
			publicKeyPem: '-----BEGIN PUBLIC KEY-----\nCURRENT\n-----END PUBLIC KEY-----',
		});

		vi.mocked(getVerificationPublicKey).mockReturnValue('-----BEGIN PUBLIC KEY-----\nVERIFY\n-----END PUBLIC KEY-----');

		vi.mocked(auditService.getAuditEntriesForUser).mockResolvedValue([
			{ id: 'audit-1', timestamp: '2026-08-11T00:00:00.000Z', action: 'case-archive', result: 'success' } as never,
		]);

		vi.mocked(signAuditExport).mockResolvedValue({
			signatureMetadata: {
				signatureVersion: '2.0',
				exportFormat: 'json',
				exportType: 'trail',
				scopeType: 'case',
				scopeIdentifier: 'CASE-ARCHIVE-1',
				generatedAt: '2026-08-11T00:00:00.000Z',
				totalEntries: 1,
				hash: 'e'.repeat(64),
			},
			signature: {
				algorithm: 'RSASSA-PSS-SHA-256',
				keyId: 'audit-key-1',
				signedAt: '2026-08-11T00:00:00.000Z',
				value: 'audit-sig',
			},
		});

		vi.mocked(getCurrentEncryptionPublicKeyDetails).mockReturnValue({
			keyId: 'enc-key-1',
			publicKeyPem: '-----BEGIN PUBLIC KEY-----\nENC\n-----END PUBLIC KEY-----',
		});

		vi.mocked(encryptExportDataWithAllImages).mockResolvedValue({
			ciphertext: new TextEncoder().encode('encrypted-case-data'),
			encryptedFiles: [
				new TextEncoder().encode('enc-image'),
				new TextEncoder().encode('enc-file'),
				new TextEncoder().encode('enc-audit-trail'),
				new TextEncoder().encode('enc-audit-signature'),
			],
			encryptionManifest: {
				encryptionVersion: '1.0',
				algorithm: 'RSA-OAEP-AES-256-GCM',
				keyId: 'enc-key-1',
				wrappedKey: 'wrapped-key',
				dataIv: 'data-iv',
				encryptedFiles: [
					{ filename: 'images/bullet-img-1.jpg', encryptedHash: '1'.repeat(64), iv: 'iv-1' },
					{ filename: 'files/report-file-1.pdf', encryptedHash: '2'.repeat(64), iv: 'iv-2' },
					{ filename: 'audit/case-audit-trail.json', encryptedHash: '3'.repeat(64), iv: 'iv-3' },
					{ filename: 'audit/case-audit-signature.json', encryptedHash: '4'.repeat(64), iv: 'iv-4' },
				],
			},
		});
	});

	it('writes non-image files into the forensic and encryption manifests and documents them in the package', async () => {
		const result = await buildArchivePackage({
			user: createUser(),
			caseNumber: 'CASE-ARCHIVE-1',
			caseJsonContent: JSON.stringify({ metadata: { caseNumber: 'CASE-ARCHIVE-1' } }),
			files: [
				{ fileData: { id: 'img-1', originalFilename: 'bullet.jpg', uploadedAt: '2026-08-11T00:00:00.000Z' }, hasAnnotations: false },
			],
			otherFiles: [
				{ fileData: { id: 'file-1', originalFilename: 'report.pdf', uploadedAt: '2026-08-11T00:00:00.000Z', contentType: 'application/pdf', byteLength: 123 } },
			],
			auditConfig: {
				startDate: '2026-08-10T00:00:00.000Z',
				endDate: '2026-08-11T00:00:00.000Z',
			},
			readmeConfig: {
				archivedAt: '2026-08-11T00:00:00.000Z',
				archivedByDisplay: 'Analyst',
				archiveReason: 'Review complete',
			},
		});

		const zipSource = typeof (result.zipBlob as Blob).arrayBuffer === 'function'
			? await (result.zipBlob as Blob).arrayBuffer()
			: result.zipBlob;
		const zip = await JSZip.loadAsync(zipSource);
		const forensicManifest = JSON.parse(await zip.file('FORENSIC_MANIFEST.json')!.async('text')) as { fileHashes: Record<string, string> };
		const encryptionManifest = JSON.parse(await zip.file('ENCRYPTION_MANIFEST.json')!.async('text')) as { encryptedFiles: Array<{ filename: string }> };
		const readme = await zip.file('README.txt')!.async('text');

		expect(forensicManifest.fileHashes).toEqual(
			expect.objectContaining({
				'images/bullet-img-1.jpg': 'b'.repeat(64),
				'files/report-file-1.pdf': 'c'.repeat(64),
			})
		);

		expect(encryptionManifest.encryptedFiles.map((entry) => entry.filename)).toEqual(
			expect.arrayContaining(['images/bullet-img-1.jpg', 'files/report-file-1.pdf'])
		);

		expect(readme).toContain('files/ folder with exported associated non-image files (encrypted)');
		expect(readme).toContain('ENCRYPTION_MANIFEST.json with encryption metadata and encrypted file hashes');
	});
});
