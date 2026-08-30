// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditEntry, Env } from '../../../workers/audit-worker/src/types';
import { appendAuditEntry, isValidAuditEntry } from '../../../workers/audit-worker/src/storage/audit-storage';
import {
	decryptAuditJsonWithRegistry,
	encryptJsonForStorage,
	extractDataAtRestEnvelope,
} from '../../../workers/audit-worker/src/crypto/data-at-rest';

vi.mock('../../../workers/audit-worker/src/crypto/data-at-rest', () => ({
	decryptAuditJsonWithRegistry: vi.fn(),
	encryptJsonForStorage: vi.fn(),
	extractDataAtRestEnvelope: vi.fn(),
}));

const validEnvelope = {
	algorithm: 'RSA-OAEP-AES-256-GCM',
	encryptionVersion: '1.0',
	keyId: 'key-1',
	dataIv: 'iv-value',
	wrappedKey: 'wrapped-key-value',
};

function makeExistingEntry(entryId: string): AuditEntry {
	return { entryId, timestamp: '2026-08-04T00:00:00.000Z', userId: 'user-1', action: 'case-create' };
}

function makeEnv(): Env {
	return {
		DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key',
		DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
	} as unknown as Env;
}

describe('appendAuditEntry retry-safe dedup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(encryptJsonForStorage).mockResolvedValue({
			ciphertext: new Uint8Array(0),
			envelope: validEnvelope,
		});
	});

	it('does not re-append or re-write when entryId already exists (retry after lost response)', async () => {
		vi.mocked(decryptAuditJsonWithRegistry).mockResolvedValue(JSON.stringify([makeExistingEntry('entry-1')]));
		const bucketFile = { customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const bucket = { get: vi.fn(async () => bucketFile), put: vi.fn(async () => undefined) };
		const env = makeEnv();

		const retriedEntry = makeExistingEntry('entry-1');
		const result = await appendAuditEntry(bucket as never, 'audit-trails/user-1/2026-08-04.json', retriedEntry, env);

		expect(result).toEqual({ entryCount: 1, deduped: true });
		expect(bucket.put).not.toHaveBeenCalled();
	});

	it('appends and writes when entryId is new', async () => {
		vi.mocked(decryptAuditJsonWithRegistry).mockResolvedValue(JSON.stringify([makeExistingEntry('entry-1')]));
		const bucketFile = { customMetadata: validEnvelope, arrayBuffer: async () => new ArrayBuffer(0) };
		const bucket = { get: vi.fn(async () => bucketFile), put: vi.fn(async () => undefined) };
		const env = makeEnv();

		const newEntry = makeExistingEntry('entry-2');
		const result = await appendAuditEntry(bucket as never, 'audit-trails/user-1/2026-08-04.json', newEntry, env);

		expect(result).toEqual({ entryCount: 2, deduped: false });
		expect(bucket.put).toHaveBeenCalledTimes(1);
	});

	it('appends the first entry when no file exists yet', async () => {
		const bucket = { get: vi.fn(async () => null), put: vi.fn(async () => undefined) };
		const env = makeEnv();

		const newEntry = makeExistingEntry('entry-1');
		const result = await appendAuditEntry(bucket as never, 'audit-trails/user-1/2026-08-04.json', newEntry, env);

		expect(result).toEqual({ entryCount: 1, deduped: false });
		expect(bucket.put).toHaveBeenCalledTimes(1);
	});
});

describe('isValidAuditEntry', () => {
	it('rejects an entry missing entryId', () => {
		const candidate = { timestamp: '2026-08-04T00:00:00.000Z', userId: 'user-1', action: 'case-create' };
		expect(isValidAuditEntry(candidate)).toBe(false);
	});

	it('rejects an entry with a blank entryId', () => {
		const candidate = { entryId: '   ', timestamp: '2026-08-04T00:00:00.000Z', userId: 'user-1', action: 'case-create' };
		expect(isValidAuditEntry(candidate)).toBe(false);
	});

	it('accepts a well-formed entry', () => {
		expect(isValidAuditEntry(makeExistingEntry('entry-1'))).toBe(true);
	});
});
