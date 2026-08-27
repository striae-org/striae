import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

vi.mock('~/utils/data', () => ({
	getCaseData: vi.fn(),
	getUserData: vi.fn(),
}));

vi.mock('../../../app/services/audit/audit-worker-client', () => ({
	fetchAuditEntriesForUser: vi.fn(),
	persistAuditEntryForUser: vi.fn(),
}));

import { auditService } from '../../../app/services/audit/audit.service';
import { persistAuditEntryForUser } from '../../../app/services/audit/audit-worker-client';

function createUser(uid: string): User {
	return { uid, email: `${uid}@example.com` } as User;
}

describe('audit.service persist retry stability', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('reuses the same entryId across a failed-then-retried persist attempt', async () => {
		vi.useFakeTimers();
		try {
			vi.mocked(persistAuditEntryForUser)
				.mockResolvedValueOnce({ ok: false, status: 503, errorData: {} })
				.mockResolvedValueOnce({ ok: true, entryCount: 1, deduped: false });

			const user = createUser('user-1');
			await auditService.logCaseCreation(user, 'CASE-001', 'Case One');

			// Flushes the background retry's setTimeout(1000ms) scheduled after the first failed attempt
			await vi.advanceTimersByTimeAsync(1000);

			expect(persistAuditEntryForUser).toHaveBeenCalledTimes(2);
			const firstEntry = vi.mocked(persistAuditEntryForUser).mock.calls[0][0];
			const secondEntry = vi.mocked(persistAuditEntryForUser).mock.calls[1][0];

			expect(firstEntry.entryId).toEqual(expect.any(String));
			expect(secondEntry.entryId).toBe(firstEntry.entryId);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not retry once the worker reports the entry as deduped', async () => {
		vi.mocked(persistAuditEntryForUser).mockResolvedValueOnce({ ok: true, entryCount: 1, deduped: true });

		const user = createUser('user-2');
		await auditService.logCaseCreation(user, 'CASE-002', 'Case Two');

		expect(persistAuditEntryForUser).toHaveBeenCalledTimes(1);
	});
});
