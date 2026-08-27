import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/user-worker/src/types';
import { executeUserDeletion } from '../../../workers/user-worker/src/cleanup/account-deletion';
import { readUserRecord } from '../../../workers/user-worker/src/storage/user-records';
import { deleteFirebaseAuthUser } from '../../../workers/user-worker/src/firebase/admin';
import { decryptJsonFromStorage, encryptJsonForStorage } from '../../../workers/user-worker/src/encryption-utils';
import { fetchKeyRegistryFromR2 } from '../../../shared/registry/r2-key-registry';

vi.mock('../../../workers/user-worker/src/storage/user-records', () => ({
	readUserRecord: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/firebase/admin', () => ({
	deleteFirebaseAuthUser: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/encryption-utils', () => ({
	decryptJsonFromStorage: vi.fn(),
	encryptJsonForStorage: vi.fn(),
}));

vi.mock('../../../shared/registry/r2-key-registry', () => ({
	fetchKeyRegistryFromR2: vi.fn(),
}));

describe('executeUserDeletion associated file cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes file IDs from both files and otherFiles case sections', async () => {
		const userUid = 'user-123';
		const caseNumber = 'CASE-001';
		const encodedUserUid = encodeURIComponent(userUid);
		const encodedCaseNumber = encodeURIComponent(caseNumber);
		const caseDataKey = `${encodedUserUid}/${encodedCaseNumber}/data.json`;

		vi.mocked(readUserRecord).mockResolvedValue({
			uid: userUid,
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
			company: 'Lab',
			permitted: true,
			cases: [{ caseNumber }],
			readOnlyCases: [],
		});

		const listMock = vi.fn(async () => ({
			objects: [{ key: caseDataKey }],
			truncated: false,
			cursor: undefined,
		}));

		const caseData = JSON.stringify({
			files: [
				{ id: 'image-file-id' },
			],
			otherFiles: [
				{ id: 'associated-file-id' },
			],
		});

		const getMock = vi.fn(async () => ({
			customMetadata: {
				algorithm: 'RSA-OAEP-AES-256-GCM',
				encryptionVersion: '1.0',
				keyId: 'key-1',
				dataIv: 'iv-value',
				wrappedKey: 'wrapped-key-value',
			},
			arrayBuffer: async () => new ArrayBuffer(0),
		}));

		vi.mocked(fetchKeyRegistryFromR2).mockResolvedValue({
			activeKeyId: 'key-1',
			keys: { 'key-1': 'pem-value' },
		});
		vi.mocked(decryptJsonFromStorage).mockResolvedValue(caseData);

		const dataDeleteMock = vi.fn(async () => undefined);
		const filesDeleteMock = vi.fn(async () => undefined);
		const userDbDeleteMock = vi.fn(async () => undefined);

		const env = {
			STRIAE_DATA: {
				list: listMock,
				get: getMock,
				delete: dataDeleteMock,
			},
			STRIAE_FILES: {
				delete: filesDeleteMock,
			},
			USER_DB: {
				delete: userDbDeleteMock,
			},
		} as unknown as Env;

		const result = await executeUserDeletion(env, userUid);

		expect(result.success).toBe(true);
		expect(result.totalCases).toBe(1);
		expect(result.completedCases).toBe(1);

		expect(filesDeleteMock).toHaveBeenCalledWith('image-file-id');
		expect(filesDeleteMock).toHaveBeenCalledWith('associated-file-id');

		expect(dataDeleteMock).toHaveBeenCalledWith([caseDataKey]);
		expect(dataDeleteMock).toHaveBeenCalledWith(`${encodedUserUid}/meta/confirmation-status.json`);

		expect(deleteFirebaseAuthUser).toHaveBeenCalledWith(env, userUid);
		expect(userDbDeleteMock).toHaveBeenCalledWith(userUid);
	});

	it('fails closed (no legacy plaintext fallback) and queues pending cleanup when the case-data envelope is missing', async () => {
		const userUid = 'user-456';
		const caseNumber = 'CASE-002';
		const encodedUserUid = encodeURIComponent(userUid);
		const encodedCaseNumber = encodeURIComponent(caseNumber);
		const caseDataKey = `${encodedUserUid}/${encodedCaseNumber}/data.json`;

		vi.mocked(readUserRecord).mockResolvedValue({
			uid: userUid,
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
			company: 'Lab',
			permitted: true,
			cases: [{ caseNumber }],
			readOnlyCases: [],
		});

		const listMock = vi.fn(async () => ({
			objects: [{ key: caseDataKey }],
			truncated: false,
			cursor: undefined,
		}));

		// No customMetadata means no data-at-rest envelope; readCaseFileIds must reject this
		// rather than parse the body as legacy plaintext. The marker-key lookup (a different
		// key) returns null, simulating no marker existing yet.
		const getMock = vi.fn(async (key: string) => (key === caseDataKey ? { customMetadata: undefined } : null));
		const filesDeleteMock = vi.fn(async () => undefined);
		const putMock = vi.fn(async () => ({ etag: 'mock-etag' }));

		vi.mocked(encryptJsonForStorage).mockResolvedValue({
			ciphertext: new Uint8Array(0),
			envelope: {
				algorithm: 'RSA-OAEP-AES-256-GCM',
				encryptionVersion: '1.0',
				keyId: 'key-1',
				dataIv: 'iv-value',
				wrappedKey: 'wrapped-key-value',
			},
		});

		const env = {
			STRIAE_DATA: {
				list: listMock,
				get: getMock,
				delete: vi.fn(async () => undefined),
				put: putMock,
			},
			STRIAE_FILES: {
				delete: filesDeleteMock,
			},
			USER_DB: {
				delete: vi.fn(async () => undefined),
			},
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;

		const result = await executeUserDeletion(env, userUid);

		expect(result.success).toBe(true);
		expect(result.pendingCleanup).toBe(true);
		expect(filesDeleteMock).not.toHaveBeenCalled();
		expect(decryptJsonFromStorage).not.toHaveBeenCalled();
		expect(putMock).toHaveBeenCalledTimes(1);
	});
});
