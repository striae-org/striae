import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { AnnotationData } from '~/types';

vi.mock('~/utils/api', () => ({
	fetchDataApi: vi.fn(),
}));

vi.mock('~/utils/data/permissions', () => ({
	validateUserSession: vi.fn(),
	canAccessCase: vi.fn(),
	canModifyCase: vi.fn(),
}));

vi.mock('~/utils/data/operations/confirmation-summary-operations', () => ({
	upsertFileConfirmationSummary: vi.fn(),
	removeFileConfirmationSummary: vi.fn(),
}));

import { getFileAnnotations, saveFileAnnotations } from '~/utils/data/operations/file-annotation-operations';
import { fetchDataApi } from '~/utils/api';
import { validateUserSession, canAccessCase, canModifyCase } from '~/utils/data/permissions';

function createUser(): User {
	return { uid: 'user-1', email: 'user@example.com' } as User;
}

function createAnnotationData(overrides: Partial<AnnotationData> = {}): AnnotationData {
	return {
		leftCase: 'CASE-1',
		rightCase: 'CASE-1',
		leftItem: '1',
		rightItem: '2',
		leftMagnification: '40x',
		rightMagnification: '60x',
		includeConfirmation: false,
		updatedAt: '2026-08-11T00:00:00.000Z',
		...overrides,
	};
}

describe('file-annotation-operations magnification round-trip', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(validateUserSession).mockResolvedValue({ valid: true } as never);
		vi.mocked(canAccessCase).mockResolvedValue({ allowed: true } as never);
		vi.mocked(canModifyCase).mockResolvedValue({ allowed: true } as never);
	});

	it('passes leftMagnification/rightMagnification through unmodified on save', async () => {
		vi.mocked(fetchDataApi).mockImplementation(async (_user, _path, init) => {
			if (init?.method === 'GET') {
				return new Response(null, { status: 404 });
			}
			return new Response(null, { status: 200, statusText: 'OK' });
		});

		const annotationData = createAnnotationData();
		await saveFileAnnotations(createUser(), 'CASE-1', 'file-1', annotationData);

		const putCall = vi.mocked(fetchDataApi).mock.calls.find(([, , init]) => init?.method === 'PUT');
		expect(putCall).toBeDefined();
		const savedBody = JSON.parse(putCall![2]!.body as string);
		expect(savedBody.leftMagnification).toBe('40x');
		expect(savedBody.rightMagnification).toBe('60x');
	});

	it('returns leftMagnification/rightMagnification unmodified on load', async () => {
		const stored = createAnnotationData();
		vi.mocked(fetchDataApi).mockResolvedValue(
			new Response(JSON.stringify(stored), { status: 200 })
		);

		const result = await getFileAnnotations(createUser(), 'CASE-1', 'file-1');

		expect(result?.leftMagnification).toBe('40x');
		expect(result?.rightMagnification).toBe('60x');
	});
});
