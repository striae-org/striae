// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { deleteCase } from '../../../app/components/actions/case-manage/operations';
import {
	getCaseData,
	validateUserSession,
	removeUserCase,
	deleteCaseData,
	removeCaseConfirmationSummary,
} from '~/utils/data';
import { deleteFileWithoutAudit } from '../../../app/components/actions/case-manage/delete-helpers';
import { deleteOtherFile } from '../../../app/components/actions/other-files-manage';

vi.mock('~/utils/data', () => ({
	canCreateCase: vi.fn(),
	getUserCases: vi.fn(),
	getUserData: vi.fn(),
	validateUserSession: vi.fn(),
	addUserCase: vi.fn(),
	removeUserCase: vi.fn(),
	getCaseData: vi.fn(),
	updateCaseData: vi.fn(),
	deleteCaseData: vi.fn(),
	duplicateCaseData: vi.fn(),
	deleteFileAnnotations: vi.fn(),
	moveCaseConfirmationSummary: vi.fn(),
	removeCaseConfirmationSummary: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-manage/delete-helpers', () => ({
	deleteFileWithoutAudit: vi.fn(),
}));

vi.mock('../../../app/components/actions/other-files-manage', () => ({
	deleteOtherFile: vi.fn(),
}));

vi.mock('~/services/audit', () => ({
	auditService: {
		logCaseCreation: vi.fn(),
		logCaseRename: vi.fn(),
		logCaseDeletion: vi.fn(),
		logCaseArchive: vi.fn(),
		logEvent: vi.fn(),
	},
}));

function createUser(uid: string): User {
	return {
		uid,
		email: `${uid}@example.com`,
	} as User;
}

describe('deleteCase associated file cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(validateUserSession).mockResolvedValue({
			valid: true,
			reason: '',
		});

		vi.mocked(getCaseData).mockResolvedValue({
			createdAt: '2026-08-11T00:00:00.000Z',
			caseNumber: 'CASE-001',
			files: [
				{
					id: 'img-file-1',
					originalFilename: 'evidence-image.jpg',
					uploadedAt: '2026-08-11T00:00:00.000Z',
				},
			],
			otherFiles: [
				{
					id: 'associated-file-1',
					originalFilename: 'report.pdf',
					uploadedAt: '2026-08-11T00:00:00.000Z',
					contentType: 'application/pdf',
					byteLength: 2048,
				},
			],
			archived: false,
		});

		vi.mocked(deleteFileWithoutAudit).mockResolvedValue({
			imageMissing: false,
			fileName: 'evidence-image.jpg',
		});

		vi.mocked(deleteOtherFile).mockResolvedValue({
			fileMissing: false,
			fileName: 'report.pdf',
		});

		vi.mocked(removeUserCase).mockResolvedValue(undefined);
		vi.mocked(deleteCaseData).mockResolvedValue(undefined);
		vi.mocked(removeCaseConfirmationSummary).mockResolvedValue(undefined);
	});

	it('deletes associated non-image files as part of case deletion', async () => {
		const user = createUser('analyst-1');

		const result = await deleteCase(user, 'CASE-001');

		expect(result).toEqual({ missingImages: [] });

		expect(deleteFileWithoutAudit).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			'CASE-001',
			'img-file-1',
			expect.objectContaining({
				skipCaseDataUpdate: false,
				skipValidation: false,
			})
		);

		expect(deleteOtherFile).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			'CASE-001',
			'associated-file-1',
			'Case deletion cleanup',
			expect.objectContaining({
				suppressAudit: true,
				skipCaseDataUpdate: false,
				skipValidation: false,
			})
		);

		expect(removeUserCase).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			'CASE-001'
		);
		expect(deleteCaseData).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'analyst-1' }),
			'CASE-001',
			expect.objectContaining({ skipValidation: true })
		);
	});
});
