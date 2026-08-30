// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { exportCaseData } from '../../../app/components/actions/case-export/core-export';

vi.mock('~/utils/data', () => ({
	getCaseData: vi.fn(),
	getUserData: vi.fn(),
}));

vi.mock('../../../app/components/actions/image-manage', () => ({
	fetchFiles: vi.fn(),
}));

vi.mock('../../../app/components/actions/other-files-manage', () => ({
	fetchOtherFiles: vi.fn(),
}));

vi.mock('../../../app/components/actions/notes-manage', () => ({
	getNotes: vi.fn(),
}));

vi.mock('../../../app/components/actions/case-manage', () => ({
	validateCaseNumber: vi.fn(),
}));

import { getCaseData, getUserData } from '~/utils/data';
import { fetchFiles } from '../../../app/components/actions/image-manage';
import { fetchOtherFiles } from '../../../app/components/actions/other-files-manage';
import { getNotes } from '../../../app/components/actions/notes-manage';
import { validateCaseNumber } from '../../../app/components/actions/case-manage';

function createUser(): User {
	return { uid: 'user-1', email: 'user@example.com' } as User;
}

describe('exportCaseData magnification annotation detection', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(validateCaseNumber).mockReturnValue(true);

		vi.mocked(getCaseData).mockResolvedValue({
			createdAt: '2026-08-11T00:00:00.000Z',
			caseNumber: 'CASE-MAG-1',
			files: [],
		} as never);

		vi.mocked(getUserData).mockResolvedValue({
			uid: 'user-1',
			firstName: 'Ada',
			lastName: 'Lovelace',
			company: 'Striae Labs',
		} as never);

		vi.mocked(fetchOtherFiles).mockResolvedValue([]);
	});

	it('marks a file as having annotations when only leftMagnification/rightMagnification is set', async () => {
		vi.mocked(fetchFiles).mockResolvedValue([{ id: 'img-1', originalFilename: 'bullet.jpg', uploadedAt: '2026-08-11T00:00:00.000Z' }]);

		vi.mocked(getNotes).mockResolvedValue({
			leftCase: '',
			rightCase: '',
			leftItem: '',
			rightItem: '',
			leftMagnification: '40x',
			rightMagnification: '',
			includeConfirmation: false,
			updatedAt: '2026-08-11T00:00:00.000Z',
		} as never);

		const result = await exportCaseData(createUser(), 'CASE-MAG-1');

		expect(result.files).toHaveLength(1);
		expect(result.files[0].hasAnnotations).toBe(true);
		expect(result.summary?.filesWithAnnotations).toBe(1);
	});

	it('does not mark a file as having annotations when no annotation fields are set', async () => {
		vi.mocked(fetchFiles).mockResolvedValue([{ id: 'img-2', originalFilename: 'cartridge.jpg', uploadedAt: '2026-08-11T00:00:00.000Z' }]);

		vi.mocked(getNotes).mockResolvedValue({
			leftCase: '',
			rightCase: '',
			leftItem: '',
			rightItem: '',
			includeConfirmation: false,
			updatedAt: '2026-08-11T00:00:00.000Z',
		} as never);

		const result = await exportCaseData(createUser(), 'CASE-MAG-1');

		expect(result.files[0].hasAnnotations).toBe(false);
		expect(result.summary?.filesWithAnnotations).toBe(0);
	});
});
