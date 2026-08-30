// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { ValidationAuditEntry } from '~/types';

vi.mock('~/utils/data', () => ({
	getCaseData: vi.fn(),
	getUserData: vi.fn(),
}));

vi.mock('../../../app/services/audit/audit-worker-client', () => ({
	fetchAuditEntriesForUser: vi.fn(),
	persistAuditEntryForUser: vi.fn(),
}));

import { auditService } from '../../../app/services/audit/audit.service';
import { getCaseData } from '~/utils/data';
import { fetchAuditEntriesForUser } from '../../../app/services/audit/audit-worker-client';

const CASE_NUMBER = 'CASE-001';

function createUser(uid: string): User {
	return { uid, email: `${uid}@example.com` } as User;
}

function makeEntry(overrides: Partial<ValidationAuditEntry> & { timestamp: string }): ValidationAuditEntry {
	return {
		entryId: `entry-${overrides.timestamp}`,
		userId: 'owner-uid',
		userEmail: 'owner@example.com',
		action: 'annotation-create',
		result: 'success',
		details: { caseNumber: CASE_NUMBER, validationErrors: [] },
		...overrides,
	};
}

describe('audit retrieval — confirmation bundle merge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('merges reviewer confirmation-bundle entries into the live case trail', async () => {
		vi.mocked(fetchAuditEntriesForUser).mockResolvedValue([
			makeEntry({ timestamp: '2026-08-05T00:00:00.000Z', action: 'annotation-create' }),
		]);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [
				{
					source: 'confirmation-bundle',
					importedAt: '2026-08-06T00:00:00.000Z',
					reviewingExaminerUid: 'reviewer-uid',
					entries: [
						makeEntry({
							timestamp: '2026-08-04T00:00:00.000Z',
							userId: 'reviewer-uid',
							userEmail: 'reviewer@example.com',
							action: 'confirmation-create',
						}),
					],
				},
			],
		} as never);

		const entries = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
		});

		const actions = entries.map((entry) => entry.action);
		expect(actions).toContain('annotation-create');
		expect(actions).toContain('confirmation-create');
		expect(entries).toHaveLength(2);
		// Reviewer identity preserved (not re-attributed to the owner).
		const reviewerEntry = entries.find((entry) => entry.action === 'confirmation-create');
		expect(reviewerEntry?.userId).toBe('reviewer-uid');
	});

	it('excludes confirmation bundles from read-only review copies', async () => {
		vi.mocked(fetchAuditEntriesForUser).mockResolvedValue([
			makeEntry({ timestamp: '2026-08-05T00:00:00.000Z', action: 'annotation-create' }),
		]);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: true,
			confirmationAuditTrails: [
				{
					source: 'confirmation-bundle',
					importedAt: '2026-08-06T00:00:00.000Z',
					reviewingExaminerUid: 'reviewer-uid',
					entries: [makeEntry({ timestamp: '2026-08-04T00:00:00.000Z', action: 'confirmation-create' })],
				},
			],
		} as never);

		const entries = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
		});

		expect(entries).toHaveLength(1);
		expect(entries[0].action).toBe('annotation-create');
	});

	it('deduplicates entries that already exist in the live server trail', async () => {
		const shared = makeEntry({
			timestamp: '2026-08-04T00:00:00.000Z',
			userId: 'reviewer-uid',
			action: 'confirmation-create',
			details: { caseNumber: CASE_NUMBER, confirmationId: 'confirm-1', validationErrors: [] },
		});

		vi.mocked(fetchAuditEntriesForUser).mockResolvedValue([shared]);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [
				{
					source: 'confirmation-bundle',
					importedAt: '2026-08-06T00:00:00.000Z',
					reviewingExaminerUid: 'reviewer-uid',
					entries: [{ ...shared }],
				},
			],
		} as never);

		const entries = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
		});

		expect(entries).toHaveLength(1);
		expect(entries[0].action).toBe('confirmation-create');
	});

	it('forceOwnEntries bypasses the confirmation-bundle merge path', async () => {
		const ownEntry = makeEntry({ timestamp: '2026-08-05T00:00:00.000Z', action: 'annotation-edit' });
		vi.mocked(fetchAuditEntriesForUser).mockResolvedValue([ownEntry]);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: false,
			confirmationAuditTrails: [
				{
					source: 'confirmation-bundle',
					importedAt: '2026-08-06T00:00:00.000Z',
					reviewingExaminerUid: 'reviewer-uid',
					entries: [makeEntry({ timestamp: '2026-08-04T00:00:00.000Z', action: 'confirmation-create' })],
				},
			],
		} as never);

		const forced = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
			forceOwnEntries: true,
		});

		expect(forced.map((entry) => entry.action)).toEqual(['annotation-edit']);
	});

	it('forceOwnEntries bypasses the archived bundle replacement path', async () => {
		const ownEntry = makeEntry({ timestamp: '2026-08-05T00:00:00.000Z', action: 'annotation-edit' });
		vi.mocked(fetchAuditEntriesForUser).mockResolvedValue([ownEntry]);
		vi.mocked(getCaseData).mockResolvedValue({
			caseNumber: CASE_NUMBER,
			isReadOnly: true,
			archived: true,
			bundledAuditTrail: {
				entries: [makeEntry({ timestamp: '2026-08-01T00:00:00.000Z', action: 'case-export' })],
			},
			confirmationAuditTrails: [],
		} as never);

		const forced = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
			forceOwnEntries: true,
		});

		// With the guard, the archived bundled trail is NOT substituted — own server entries win.
		expect(forced.map((entry) => entry.action)).toEqual(['annotation-edit']);

		// Without the guard, the archived bundled trail replaces the query result.
		const replaced = await auditService.getAuditEntriesForUser('owner-uid', {
			requestingUser: createUser('owner-uid'),
			caseNumber: CASE_NUMBER,
		});
		expect(replaced.map((entry) => entry.action)).toEqual(['case-export']);
	});
});
