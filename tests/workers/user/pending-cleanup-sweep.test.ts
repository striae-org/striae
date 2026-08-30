// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/user-worker/src/types';
import { markerKeyFor } from '../../../workers/user-worker/src/cleanup/pending-cleanup-marker';

vi.mock('../../../workers/user-worker/src/cleanup/account-deletion', () => ({
	deleteSingleCase: vi.fn(),
	deleteUserConfirmationSummary: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/firebase/admin', () => ({
	checkFirebaseAuthUserExists: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/cleanup/case-data-reader', () => ({
	decryptWithKeyRegistry: vi.fn(),
	extractDataAtRestEnvelope: vi.fn(),
	getDataAtRestPrivateKeyRegistry: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/encryption-utils', () => ({
	encryptJsonForStorage: vi.fn(),
}));

import { deleteSingleCase, deleteUserConfirmationSummary } from '../../../workers/user-worker/src/cleanup/account-deletion';
import { checkFirebaseAuthUserExists } from '../../../workers/user-worker/src/firebase/admin';
import {
	decryptWithKeyRegistry,
	extractDataAtRestEnvelope,
	getDataAtRestPrivateKeyRegistry,
} from '../../../workers/user-worker/src/cleanup/case-data-reader';
import { encryptJsonForStorage } from '../../../workers/user-worker/src/encryption-utils';
import { sweepPendingCaseCleanup } from '../../../workers/user-worker/src/cleanup/pending-cleanup-sweep';

const USER_UID = 'uid1';
const MARKER_KEY = markerKeyFor(USER_UID);

const REGISTRY = { activeKeyId: 'key-1', keys: { 'key-1': 'pem' } };
const validEnvelope = {
	algorithm: 'RSA-OAEP-AES-256-GCM',
	encryptionVersion: '1.0',
	keyId: 'key-1',
	dataIv: 'iv-value',
	wrappedKey: 'wrapped-key-value',
};

const marker = {
	userUid: USER_UID,
	recordedAt: '2026-08-21T00:00:00.000Z',
	failedCases: [{ caseNumber: 'CASE-1', message: 'boom' }],
	pendingConfirmationSummary: false,
	attempts: 0,
	authDeletionComplete: true,
};

function createEnv(markerObjects: { key: string }[] = [{ key: MARKER_KEY }]): Env {
	const list = vi.fn(async () => ({ objects: markerObjects, truncated: false }));
	const get = vi.fn(async () => ({
		etag: 'etag-1',
		customMetadata: validEnvelope,
		arrayBuffer: async () => new ArrayBuffer(0),
	}));
	const put = vi.fn(async () => ({ etag: 'etag-2' }));

	return {
		STRIAE_DATA: { list, get, put },
		USER_DB: { delete: vi.fn(async () => undefined) },
		DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
		DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
	} as unknown as Env;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue(REGISTRY as never);
	vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
	vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(marker));
	vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });
});

describe('sweepPendingCaseCleanup', () => {
	it('tombstones the marker once all failed cases are retried successfully', async () => {
		vi.mocked(deleteSingleCase).mockResolvedValue(undefined);
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 1,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
		expect(env.STRIAE_DATA.put).toHaveBeenCalledWith(
			MARKER_KEY,
			'',
			expect.objectContaining({
				onlyIf: { etagMatches: 'etag-1' },
				customMetadata: expect.objectContaining({ tombstone: 'true' }),
			}),
		);
	});

	it('does not report resolution when a concurrent writer replaced the marker since the initial read', async () => {
		vi.mocked(deleteSingleCase).mockResolvedValue(undefined);
		const env = createEnv();
		vi.mocked(env.STRIAE_DATA.put).mockResolvedValueOnce(null as never);

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 0,
			stillFailing: 0,
			conflicted: 1,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
	});

	it('leaves the marker and case data untouched while account deletion has not finalized', async () => {
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify({ ...marker, authDeletionComplete: false }));
		vi.mocked(checkFirebaseAuthUserExists).mockResolvedValue(true);
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 0,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 1,
			verifiedByFirebaseLookup: 0,
		});
		expect(deleteSingleCase).not.toHaveBeenCalled();
		expect(env.STRIAE_DATA.put).not.toHaveBeenCalled();
		expect(env.USER_DB.delete).not.toHaveBeenCalled();
	});

	it('leaves the marker untouched when the Firebase lookup itself fails', async () => {
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify({ ...marker, authDeletionComplete: false }));
		vi.mocked(checkFirebaseAuthUserExists).mockRejectedValue(new Error('lookup failed'));
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 0,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 1,
			verifiedByFirebaseLookup: 0,
		});
		expect(deleteSingleCase).not.toHaveBeenCalled();
		expect(env.USER_DB.delete).not.toHaveBeenCalled();
	});

	it('proceeds without a Firebase lookup when the marker already has the firebaseAuthDeleted stage flag', async () => {
		vi.mocked(deleteSingleCase).mockResolvedValue(undefined);
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(
			JSON.stringify({ ...marker, authDeletionComplete: false, firebaseAuthDeleted: true }),
		);
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 1,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
		expect(checkFirebaseAuthUserExists).not.toHaveBeenCalled();
		expect(env.USER_DB.delete).toHaveBeenCalledWith(USER_UID);
	});

	it('resolves a not-yet-finalized marker via a live Firebase lookup and self-heals it', async () => {
		vi.mocked(deleteSingleCase).mockResolvedValue(undefined);
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify({ ...marker, authDeletionComplete: false }));
		vi.mocked(checkFirebaseAuthUserExists).mockResolvedValue(false);
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 1,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 1,
		});
		expect(env.USER_DB.delete).toHaveBeenCalledWith(USER_UID);
	});

	it('rewrites the marker with remaining failures and an incremented attempt count', async () => {
		vi.mocked(deleteSingleCase).mockRejectedValue(new Error('still broken'));
		const env = createEnv();

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 0,
			stillFailing: 1,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
		expect(env.STRIAE_DATA.put).toHaveBeenCalledTimes(1);

		const [key, , options] = vi.mocked(env.STRIAE_DATA.put).mock.calls[0];
		expect(key).toBe(MARKER_KEY);
		expect(options).toEqual(expect.objectContaining({ onlyIf: { etagMatches: 'etag-1' } }));
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		const rewritten = JSON.parse(serialized as string);
		expect(rewritten.attempts).toBe(1);
		expect(rewritten.failedCases).toEqual([{ caseNumber: 'CASE-1', message: 'still broken' }]);
	});

	it('retries a pending confirmation-summary deletion alongside failed cases', async () => {
		vi.mocked(deleteSingleCase).mockResolvedValue(undefined);
		vi.mocked(deleteUserConfirmationSummary).mockRejectedValue(new Error('meta still broken'));
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify({ ...marker, pendingConfirmationSummary: true }));
		const env = createEnv([{ key: MARKER_KEY }]);

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 1,
			resolved: 0,
			stillFailing: 1,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		expect(JSON.parse(serialized as string).pendingConfirmationSummary).toBe(true);
	});

	it('is a no-op when there are no pending-cleanup markers', async () => {
		const env = createEnv([]);

		const result = await sweepPendingCaseCleanup(env);

		expect(result).toEqual({
			processed: 0,
			resolved: 0,
			stillFailing: 0,
			conflicted: 0,
			awaitingFinalization: 0,
			verifiedByFirebaseLookup: 0,
		});
		expect(deleteSingleCase).not.toHaveBeenCalled();
		expect(env.STRIAE_DATA.put).not.toHaveBeenCalled();
	});
});
