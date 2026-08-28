// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { deleteReadOnlyCase } from '../../../app/components/actions/case-import/storage-operations';
import { fetchDataApi } from '~/utils/api';
import {
	getUserReadOnlyCases,
	removeCaseConfirmationSummary,
	updateUserData,
} from '~/utils/data';
import { deleteOtherFile } from '../../../app/components/actions/other-files-manage';

vi.mock('~/utils/api', () => ({
	fetchDataApi: vi.fn(),
}));

vi.mock('~/utils/data', () => ({
	getUserReadOnlyCases: vi.fn(),
	removeCaseConfirmationSummary: vi.fn(),
	updateUserData: vi.fn(),
	validateUserSession: vi.fn(),
}));

vi.mock('../../../app/components/actions/image-manage', () => ({
	deleteFile: vi.fn(),
}));

vi.mock('../../../app/components/actions/other-files-manage', () => ({
	deleteOtherFile: vi.fn(),
}));

describe('read-only case associated-file cleanup', () => {
	it('deletes associated files before clearing an imported review case', async () => {
		const user = { uid: 'reviewer-1', email: 'reviewer@example.com' } as User;
		vi.mocked(fetchDataApi)
			.mockResolvedValueOnce(new Response(JSON.stringify({
				files: [],
				otherFiles: [{
					id: 'associated-file-1',
					originalFilename: 'review-report.pdf',
					uploadedAt: '2026-08-16T00:00:00.000Z',
					contentType: 'application/pdf',
					byteLength: 2048,
				}],
			}), { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.mocked(deleteOtherFile).mockResolvedValue({
			fileMissing: false,
			fileName: 'review-report.pdf',
		});
		vi.mocked(getUserReadOnlyCases).mockResolvedValue([
			{
				caseNumber: 'CASE-001',
				importedAt: '2026-08-16T00:00:00.000Z',
				originalExportDate: '2026-08-15T00:00:00.000Z',
				originalExportedBy: 'examiner@example.com',
				isReadOnly: true,
			},
		]);
		vi.mocked(updateUserData).mockResolvedValue({
			uid: 'reviewer-1',
			email: 'reviewer@example.com',
			firstName: 'Reviewer',
			lastName: 'One',
			company: 'Striae Labs',
			permitted: true,
			cases: [],
			createdAt: '2026-08-16T00:00:00.000Z',
		});
		vi.mocked(removeCaseConfirmationSummary).mockResolvedValue(undefined);

		await expect(deleteReadOnlyCase(user, 'CASE-001')).resolves.toBe(true);

		expect(deleteOtherFile).toHaveBeenCalledWith(
			user,
			'CASE-001',
			'associated-file-1',
			'Read-only case clearing - associated files cleanup',
			expect.objectContaining({
				skipValidation: true,
				skipCaseDataUpdate: true,
				suppressAudit: true,
			})
		);
		expect(fetchDataApi).toHaveBeenLastCalledWith(
			user,
			'/reviewer-1/CASE-001/data.json',
			{ method: 'DELETE' }
		);
	});
});