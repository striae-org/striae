// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env, UserData } from '../../../workers/user-worker/src/types';
import type * as PendingCleanupMarkerModule from '../../../workers/user-worker/src/cleanup/pending-cleanup-marker';

vi.mock('../../../workers/user-worker/src/storage/user-records', () => ({
	readUserRecord: vi.fn(),
	writeUserRecord: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/firebase/admin', () => ({
	deleteFirebaseAuthUser: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/cleanup/case-data-reader', () => ({
	readCaseFileIds: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/encryption-utils', () => ({
	encryptJsonForStorage: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/cleanup/pending-cleanup-marker', async (importOriginal) => {
	const actual = await importOriginal<typeof PendingCleanupMarkerModule>();
	return {
		...actual,
		markPendingCleanupFirebaseAuthDeleted: vi.fn(),
		markPendingCleanupAuthDeletionComplete: vi.fn(),
	};
});

import { readUserRecord } from '../../../workers/user-worker/src/storage/user-records';
import { deleteFirebaseAuthUser } from '../../../workers/user-worker/src/firebase/admin';
import { readCaseFileIds } from '../../../workers/user-worker/src/cleanup/case-data-reader';
import { encryptJsonForStorage } from '../../../workers/user-worker/src/encryption-utils';
import {
	markPendingCleanupAuthDeletionComplete,
	markPendingCleanupFirebaseAuthDeleted,
} from '../../../workers/user-worker/src/cleanup/pending-cleanup-marker';
import { executeUserDeletion } from '../../../workers/user-worker/src/cleanup/account-deletion';

const MARKER_ENVELOPE = {
	algorithm: 'RSA-OAEP-AES-256-GCM',
	encryptionVersion: '1.0',
	keyId: 'key-1',
	dataIv: 'iv-value',
	wrappedKey: 'wrapped-key-value',
};

const USER_UID = 'uid1';
const MARKER_KEY = `_pending-cleanup/${encodeURIComponent(USER_UID)}.json`;

function buildUserData(caseNumbers: string[]): UserData {
	return {
		uid: USER_UID,
		email: 'user@example.com',
		firstName: 'Test',
		lastName: 'User',
		company: 'Test Co',
		permitted: true,
		cases: caseNumbers.map((caseNumber) => ({ caseNumber })),
		readOnlyCases: [],
	};
}

interface EnvOverrides {
	caseDataObjects?: { key: string }[];
	batchDeleteThrows?: boolean;
	confirmationSummaryDeleteThrows?: boolean;
	markerPutThrows?: boolean;
}

function createEnv(overrides: EnvOverrides = {}): Env {
	const { caseDataObjects = [], batchDeleteThrows = false, confirmationSummaryDeleteThrows = false, markerPutThrows = false } = overrides;

	const list = vi.fn(async () => ({ objects: caseDataObjects, truncated: false }));

	const del = vi.fn(async (keys: string | string[]) => {
		if (Array.isArray(keys)) {
			if (batchDeleteThrows) {
				throw new Error('case data delete failed');
			}
			return;
		}

		if (keys.startsWith('_pending-cleanup/')) {
			return;
		}

		// Confirmation summary key (single string, not a pending-cleanup marker key)
		if (confirmationSummaryDeleteThrows) {
			throw new Error('confirmation summary delete failed');
		}
	});

	const put = vi.fn(async () => {
		if (markerPutThrows) {
			throw new Error('marker put failed');
		}
		return { etag: 'mock-etag' };
	});

	return {
		STRIAE_DATA: { list, delete: del, put } as unknown,
		STRIAE_FILES: { delete: vi.fn(async () => undefined) } as unknown,
		USER_DB: { delete: vi.fn(async () => undefined) } as unknown,
		DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
		DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
	} as Env;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(readCaseFileIds).mockResolvedValue([]);
	vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: MARKER_ENVELOPE });
	vi.mocked(markPendingCleanupFirebaseAuthDeleted).mockResolvedValue(true);
	vi.mocked(markPendingCleanupAuthDeletionComplete).mockResolvedValue(true);
});

describe('executeUserDeletion', () => {
	it('finalizes deletion with no pending cleanup when everything succeeds', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData(['CASE-1']));
		const env = createEnv();

		const result = await executeUserDeletion(env, USER_UID);

		expect(result.success).toBe(true);
		expect(result.pendingCleanup).toBe(false);
		expect(deleteFirebaseAuthUser).toHaveBeenCalledTimes(1);
		expect(env.USER_DB.delete).toHaveBeenCalledWith(USER_UID);
		expect(env.STRIAE_DATA.put).not.toHaveBeenCalled();
	});

	it('finalizes deletion and records a marker when case cleanup fails but the marker write succeeds', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData(['CASE-1']));
		const caseDataKey = `${encodeURIComponent(USER_UID)}/${encodeURIComponent('CASE-1')}/data.json`;
		const env = createEnv({
			caseDataObjects: [{ key: caseDataKey }],
			batchDeleteThrows: true,
		});

		const result = await executeUserDeletion(env, USER_UID);

		expect(result.success).toBe(true);
		expect(result.pendingCleanup).toBe(true);
		expect(deleteFirebaseAuthUser).toHaveBeenCalledTimes(1);
		expect(env.USER_DB.delete).toHaveBeenCalledWith(USER_UID);

		expect(env.STRIAE_DATA.put).toHaveBeenCalledTimes(1);
		const [key] = vi.mocked(env.STRIAE_DATA.put).mock.calls[0];
		expect(key).toBe(MARKER_KEY);
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		const marker = JSON.parse(serialized as string);
		expect(marker.failedCases).toEqual([{ caseNumber: 'CASE-1', message: expect.stringContaining('case data delete threw') }]);
		expect(marker.pendingConfirmationSummary).toBe(false);
	});

	it('flags the marker as firebaseAuthDeleted before USER_DB.delete runs, and fully complete after', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData(['CASE-1']));
		const caseDataKey = `${encodeURIComponent(USER_UID)}/${encodeURIComponent('CASE-1')}/data.json`;
		const env = createEnv({ caseDataObjects: [{ key: caseDataKey }], batchDeleteThrows: true });

		await executeUserDeletion(env, USER_UID);

		expect(markPendingCleanupFirebaseAuthDeleted).toHaveBeenCalledWith(env, USER_UID);
		expect(markPendingCleanupAuthDeletionComplete).toHaveBeenCalledWith(env, USER_UID);

		const firebaseDeleteOrder = vi.mocked(deleteFirebaseAuthUser).mock.invocationCallOrder[0];
		const flagFirebaseOrder = vi.mocked(markPendingCleanupFirebaseAuthDeleted).mock.invocationCallOrder[0];
		const userDbDeleteOrder = vi.mocked(env.USER_DB.delete).mock.invocationCallOrder[0];
		const flagCompleteOrder = vi.mocked(markPendingCleanupAuthDeletionComplete).mock.invocationCallOrder[0];

		expect(firebaseDeleteOrder).toBeLessThan(flagFirebaseOrder);
		expect(flagFirebaseOrder).toBeLessThan(userDbDeleteOrder);
		expect(userDbDeleteOrder).toBeLessThan(flagCompleteOrder);
	});

	it('blocks finalization when case cleanup fails and the marker write also fails', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData(['CASE-1']));
		const caseDataKey = `${encodeURIComponent(USER_UID)}/${encodeURIComponent('CASE-1')}/data.json`;
		const env = createEnv({
			caseDataObjects: [{ key: caseDataKey }],
			batchDeleteThrows: true,
			markerPutThrows: true,
		});

		await expect(executeUserDeletion(env, USER_UID)).rejects.toThrow('Account deletion blocked:');

		expect(deleteFirebaseAuthUser).not.toHaveBeenCalled();
		expect(env.USER_DB.delete).not.toHaveBeenCalled();
	});

	it('records pending cleanup and deletes nothing for a case when readCaseFileIds rejects (fail-closed envelope violation)', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData(['CASE-1']));
		const caseDataKey = `${encodeURIComponent(USER_UID)}/${encodeURIComponent('CASE-1')}/data.json`;
		const env = createEnv({ caseDataObjects: [{ key: caseDataKey }] });
		vi.mocked(readCaseFileIds).mockRejectedValueOnce(new Error('missing data-at-rest envelope'));

		const result = await executeUserDeletion(env, USER_UID);

		expect(result.success).toBe(true);
		expect(result.pendingCleanup).toBe(true);
		expect(env.STRIAE_FILES.delete).not.toHaveBeenCalled();
		const batchDeleteCalls = vi.mocked(env.STRIAE_DATA.delete).mock.calls.filter(([arg]) => Array.isArray(arg));
		expect(batchDeleteCalls).toHaveLength(0);

		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		const marker = JSON.parse(serialized as string);
		expect(marker.failedCases).toEqual([{ caseNumber: 'CASE-1', message: expect.stringContaining('missing data-at-rest envelope') }]);
	});

	it('folds a confirmation-summary deletion failure into the marker when there are no case errors', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData([]));
		const env = createEnv({ confirmationSummaryDeleteThrows: true });

		const result = await executeUserDeletion(env, USER_UID);

		expect(result.success).toBe(true);
		expect(result.pendingCleanup).toBe(true);
		expect(deleteFirebaseAuthUser).toHaveBeenCalledTimes(1);

		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		const marker = JSON.parse(serialized as string);
		expect(marker.failedCases).toEqual([]);
		expect(marker.pendingConfirmationSummary).toBe(true);
	});

	it('blocks finalization when a confirmation-summary-only failure cannot be recorded in a marker', async () => {
		vi.mocked(readUserRecord).mockResolvedValue(buildUserData([]));
		const env = createEnv({ confirmationSummaryDeleteThrows: true, markerPutThrows: true });

		await expect(executeUserDeletion(env, USER_UID)).rejects.toThrow('Account deletion blocked:');

		expect(deleteFirebaseAuthUser).not.toHaveBeenCalled();
		expect(env.USER_DB.delete).not.toHaveBeenCalled();
	});
});
