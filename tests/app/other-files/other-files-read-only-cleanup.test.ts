import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { deleteOtherFile } from '../../../app/components/actions/other-files-manage';
import { fetchFilesApi } from '~/utils/api';
import { getCaseData } from '~/utils/data';

vi.mock('~/utils/api', () => ({
	fetchFilesApi: vi.fn(),
}));

vi.mock('~/utils/data', () => ({
	canModifyCase: vi.fn(),
	canUploadFile: vi.fn(),
	getCaseData: vi.fn(),
	updateCaseData: vi.fn(),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		logEvent: vi.fn(),
		logFileDeletion: vi.fn(),
	},
}));

describe('deleteOtherFile read-only cleanup', () => {
	it('deletes the stored associated file for internal read-only case cleanup', async () => {
		const user = { uid: 'reviewer-1', email: 'reviewer@example.com' } as User;
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: 'CASE-001',
			createdAt: '2026-08-16T00:00:00.000Z',
			isReadOnly: true,
			files: [],
			otherFiles: [{
				id: 'associated-file-1',
				originalFilename: 'review-report.pdf',
				uploadedAt: '2026-08-16T00:00:00.000Z',
				contentType: 'application/pdf',
				byteLength: 2048,
			}],
		});
		vi.mocked(fetchFilesApi).mockResolvedValue(new Response(null, { status: 204 }));

		await expect(deleteOtherFile(user, 'CASE-001', 'associated-file-1', undefined, {
			skipValidation: true,
			skipCaseDataUpdate: true,
			suppressAudit: true,
		})).resolves.toEqual({
			fileMissing: false,
			fileName: 'review-report.pdf',
		});

		expect(fetchFilesApi).toHaveBeenCalledWith(
			user,
			'/associated-file-1',
			{ method: 'DELETE' }
		);
	});
});