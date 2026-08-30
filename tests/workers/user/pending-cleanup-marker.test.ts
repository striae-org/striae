// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/user-worker/src/types';

vi.mock('../../../workers/user-worker/src/encryption-utils', () => ({
	encryptJsonForStorage: vi.fn(),
}));

vi.mock('../../../workers/user-worker/src/cleanup/case-data-reader', () => ({
	decryptWithKeyRegistry: vi.fn(),
	extractDataAtRestEnvelope: vi.fn(),
	getDataAtRestPrivateKeyRegistry: vi.fn(),
}));

import { encryptJsonForStorage } from '../../../workers/user-worker/src/encryption-utils';
import {
	decryptWithKeyRegistry,
	extractDataAtRestEnvelope,
	getDataAtRestPrivateKeyRegistry,
} from '../../../workers/user-worker/src/cleanup/case-data-reader';
import {
	markerKeyFor,
	markPendingCleanupFirebaseAuthDeleted,
	readPendingCleanupMarker,
	recordPendingCleanupFailure,
	tombstonePendingCleanupMarkerIfUnchanged,
	writePendingCleanupMarker,
	writePendingCleanupMarkerIfAbsent,
	writePendingCleanupMarkerIfUnchanged,
} from '../../../workers/user-worker/src/cleanup/pending-cleanup-marker';

const USER_UID = 'uid1';

const baseMarker = {
	userUid: USER_UID,
	recordedAt: '2026-08-21T00:00:00.000Z',
	failedCases: [{ caseNumber: 'CASE-1', message: 'boom' }],
	pendingConfirmationSummary: false,
	attempts: 0,
	authDeletionComplete: false,
	firebaseAuthDeleted: false,
};

const validEnvelope = {
	algorithm: 'RSA-OAEP-AES-256-GCM',
	encryptionVersion: '1.0',
	keyId: 'key-1',
	dataIv: 'iv-value',
	wrappedKey: 'wrapped-key-value',
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('markerKeyFor', () => {
	it('encodes the user uid under the pending-cleanup prefix', () => {
		expect(markerKeyFor(USER_UID)).toBe(`_pending-cleanup/${encodeURIComponent(USER_UID)}.json`);
	});
});

describe('writePendingCleanupMarker', () => {
	it('encrypts the marker and puts the ciphertext with the envelope in customMetadata', async () => {
		const put = vi.fn(async () => undefined);
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		const ciphertext = new Uint8Array([1, 2, 3]);
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext, envelope: validEnvelope });

		const result = await writePendingCleanupMarker(env, baseMarker);

		expect(result).toBe(true);
		expect(encryptJsonForStorage).toHaveBeenCalledWith(JSON.stringify(baseMarker), 'public-key-pem', 'key-1');
		expect(put).toHaveBeenCalledWith(markerKeyFor(USER_UID), ciphertext, { customMetadata: validEnvelope });
	});

	it('returns false without writing when encryption key material is not configured', async () => {
		const put = vi.fn(async () => undefined);
		const env = { STRIAE_DATA: { put } } as unknown as Env;

		const result = await writePendingCleanupMarker(env, baseMarker);

		expect(result).toBe(false);
		expect(put).not.toHaveBeenCalled();
		expect(encryptJsonForStorage).not.toHaveBeenCalled();
	});

	it('returns false instead of throwing when the write fails', async () => {
		const put = vi.fn(async () => {
			throw new Error('r2 put failed');
		});
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		await expect(writePendingCleanupMarker(env, baseMarker)).resolves.toBe(false);
	});
});

describe('readPendingCleanupMarker', () => {
	it('decrypts and returns the marker and etag when present with a valid envelope', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const env = { STRIAE_DATA: { get } } as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));

		const result = await readPendingCleanupMarker(env, markerKeyFor(USER_UID));

		expect(result).toEqual({ marker: baseMarker, etag: 'etag-1' });
	});

	it('returns null when the object does not exist', async () => {
		const get = vi.fn(async () => null);
		const env = { STRIAE_DATA: { get } } as unknown as Env;

		await expect(readPendingCleanupMarker(env, markerKeyFor(USER_UID))).resolves.toBeNull();
	});

	it('returns null when the object has no data-at-rest envelope', async () => {
		const file = { customMetadata: undefined, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const env = { STRIAE_DATA: { get } } as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(null);

		await expect(readPendingCleanupMarker(env, markerKeyFor(USER_UID))).resolves.toBeNull();
		expect(getDataAtRestPrivateKeyRegistry).not.toHaveBeenCalled();
	});

	it('returns null instead of throwing when decryption fails', async () => {
		const file = { customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const env = { STRIAE_DATA: { get } } as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockRejectedValue(new Error('decrypt failed'));

		await expect(readPendingCleanupMarker(env, markerKeyFor(USER_UID))).resolves.toBeNull();
	});

	it('returns null instead of throwing on malformed decrypted JSON', async () => {
		const file = { customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const env = { STRIAE_DATA: { get } } as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue('not json');

		await expect(readPendingCleanupMarker(env, markerKeyFor(USER_UID))).resolves.toBeNull();
	});

	it('reuses a supplied key registry instead of fetching a new one', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const env = { STRIAE_DATA: { get } } as unknown as Env;
		const suppliedRegistry = { activeKeyId: 'key-1', keys: { 'key-1': 'pem' } };
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));

		const result = await readPendingCleanupMarker(env, markerKeyFor(USER_UID), suppliedRegistry);

		expect(result).toEqual({ marker: baseMarker, etag: 'etag-1' });
		expect(getDataAtRestPrivateKeyRegistry).not.toHaveBeenCalled();
		expect(decryptWithKeyRegistry).toHaveBeenCalledWith(expect.anything(), validEnvelope, suppliedRegistry);
	});
});

describe('markPendingCleanupFirebaseAuthDeleted', () => {
	it('flags the marker as firebaseAuthDeleted when a marker is found', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await markPendingCleanupFirebaseAuthDeleted(env, USER_UID);

		expect(result).toBe(true);
		expect(put).toHaveBeenCalledWith(
			markerKeyFor(USER_UID),
			expect.anything(),
			expect.objectContaining({ onlyIf: { etagMatches: 'etag-1' } }),
		);
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		expect(JSON.parse(serialized as string).firebaseAuthDeleted).toBe(true);
	});

	it('returns true without writing when the marker is already flagged', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = { STRIAE_DATA: { get, put } } as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify({ ...baseMarker, firebaseAuthDeleted: true }));

		const result = await markPendingCleanupFirebaseAuthDeleted(env, USER_UID);

		expect(result).toBe(true);
		expect(put).not.toHaveBeenCalled();
	});

	it('returns false when there is no marker to flag', async () => {
		const get = vi.fn(async () => null);
		const env = { STRIAE_DATA: { get } } as unknown as Env;

		const result = await markPendingCleanupFirebaseAuthDeleted(env, USER_UID);

		expect(result).toBe(false);
	});

	it('returns false when a concurrent writer already replaced the marker', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn(async () => null);
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await markPendingCleanupFirebaseAuthDeleted(env, USER_UID);

		expect(result).toBe(false);
	});
});

describe('writePendingCleanupMarkerIfUnchanged', () => {
	it('conditions the put on the expected etag and returns the new etag on success', async () => {
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		const ciphertext = new Uint8Array([1, 2, 3]);
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext, envelope: validEnvelope });

		const result = await writePendingCleanupMarkerIfUnchanged(env, baseMarker, 'etag-1');

		expect(result).toBe('etag-2');
		expect(put).toHaveBeenCalledWith(markerKeyFor(USER_UID), ciphertext, expect.objectContaining({ onlyIf: { etagMatches: 'etag-1' } }));
	});

	it('returns null without writing when a concurrent writer already replaced the marker', async () => {
		const put = vi.fn(async () => null);
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await writePendingCleanupMarkerIfUnchanged(env, baseMarker, 'stale-etag');

		expect(result).toBeNull();
	});

	it('returns null without writing when encryption key material is not configured', async () => {
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = { STRIAE_DATA: { put } } as unknown as Env;

		const result = await writePendingCleanupMarkerIfUnchanged(env, baseMarker, 'etag-1');

		expect(result).toBeNull();
		expect(put).not.toHaveBeenCalled();
	});
});

describe('tombstonePendingCleanupMarkerIfUnchanged', () => {
	it('tombstones the marker when the conditional put confirms the etag still matches', async () => {
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = { STRIAE_DATA: { put } } as unknown as Env;

		const result = await tombstonePendingCleanupMarkerIfUnchanged(env, markerKeyFor(USER_UID), 'etag-1');

		expect(result).toBe(true);
		expect(put).toHaveBeenCalledWith(
			markerKeyFor(USER_UID),
			'',
			expect.objectContaining({
				onlyIf: { etagMatches: 'etag-1' },
				customMetadata: expect.objectContaining({ tombstone: 'true' }),
			}),
		);
	});

	it('returns false without reporting success when a concurrent writer already replaced the marker', async () => {
		const put = vi.fn(async () => null);
		const env = { STRIAE_DATA: { put } } as unknown as Env;

		const result = await tombstonePendingCleanupMarkerIfUnchanged(env, markerKeyFor(USER_UID), 'stale-etag');

		expect(result).toBe(false);
	});
});

describe('writePendingCleanupMarkerIfAbsent', () => {
	it('conditions the put on If-None-Match: * and returns the new etag on success', async () => {
		const put = vi.fn(async (_key: string, _value: unknown, _options?: { onlyIf: Headers }) => ({ etag: 'etag-1' }));
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		const ciphertext = new Uint8Array([1, 2, 3]);
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext, envelope: validEnvelope });

		const result = await writePendingCleanupMarkerIfAbsent(env, baseMarker);

		expect(result).toBe('etag-1');
		const [, , options] = put.mock.calls[0];
		expect((options as { onlyIf: Headers }).onlyIf.get('if-none-match')).toBe('*');
	});

	it('returns null without reporting success when an object already exists at the key', async () => {
		const put = vi.fn(async () => null);
		const env = {
			STRIAE_DATA: { put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await writePendingCleanupMarkerIfAbsent(env, baseMarker);

		expect(result).toBeNull();
	});

	it('returns null without writing when encryption key material is not configured', async () => {
		const put = vi.fn(async () => ({ etag: 'etag-1' }));
		const env = { STRIAE_DATA: { put } } as unknown as Env;

		const result = await writePendingCleanupMarkerIfAbsent(env, baseMarker);

		expect(result).toBeNull();
		expect(put).not.toHaveBeenCalled();
	});
});

describe('recordPendingCleanupFailure', () => {
	const newFailure = { failedCases: [{ caseNumber: 'CASE-2', message: 'boom-2' }], pendingConfirmationSummary: false };

	it('creates a marker when none exists yet', async () => {
		const get = vi.fn(async () => null);
		const put = vi.fn(async () => ({ etag: 'etag-1' }));
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await recordPendingCleanupFailure(env, USER_UID, newFailure);

		expect(result).toBe(true);
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		expect(JSON.parse(serialized as string).failedCases).toEqual(newFailure.failedCases);
	});

	it('merges into an existing marker instead of overwriting its failed cases', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn(async () => ({ etag: 'etag-2' }));
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await recordPendingCleanupFailure(env, USER_UID, newFailure);

		expect(result).toBe(true);
		expect(put).toHaveBeenCalledWith(
			markerKeyFor(USER_UID),
			expect.anything(),
			expect.objectContaining({ onlyIf: { etagMatches: 'etag-1' } }),
		);
		const [serialized] = vi.mocked(encryptJsonForStorage).mock.calls[0];
		const merged = JSON.parse(serialized as string);
		expect(merged.failedCases).toEqual([...baseMarker.failedCases, ...newFailure.failedCases]);
	});

	it('retries the read-merge-write cycle when a concurrent writer wins the race, then succeeds', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ etag: 'etag-3' });
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await recordPendingCleanupFailure(env, USER_UID, newFailure);

		expect(result).toBe(true);
		expect(put).toHaveBeenCalledTimes(2);
	});

	it('returns false after exhausting retries against a persistent conflict', async () => {
		const file = { etag: 'etag-1', customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const get = vi.fn(async () => file);
		const put = vi.fn(async () => null);
		const env = {
			STRIAE_DATA: { get, put },
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(getDataAtRestPrivateKeyRegistry).mockResolvedValue({ activeKeyId: 'key-1', keys: { 'key-1': 'pem' } });
		vi.mocked(decryptWithKeyRegistry).mockResolvedValue(JSON.stringify(baseMarker));
		vi.mocked(encryptJsonForStorage).mockResolvedValue({ ciphertext: new Uint8Array(0), envelope: validEnvelope });

		const result = await recordPendingCleanupFailure(env, USER_UID, newFailure);

		expect(result).toBe(false);
	});
});
