// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/data-worker/src/types';
import { handleStorageRequest } from '../../../workers/data-worker/src/handlers/storage-routes';
import { encryptJsonForStorage } from '../../../workers/data-worker/src/encryption-utils';
import { decryptJsonFromStorageWithRegistry, extractDataAtRestEnvelope } from '../../../workers/data-worker/src/registry/key-registry';

vi.mock('../../../workers/data-worker/src/encryption-utils', () => ({
	encryptJsonForStorage: vi.fn(),
}));

vi.mock('../../../workers/data-worker/src/registry/key-registry', () => ({
	decryptJsonFromStorageWithRegistry: vi.fn(),
	extractDataAtRestEnvelope: vi.fn(),
}));

function createResponder() {
	return (body: unknown, status = 200): Response =>
		new Response(JSON.stringify(body), {
			status,
			headers: {
				'Content-Type': 'application/json',
			},
		});
}

const validEnvelope = {
	algorithm: 'RSA-OAEP-AES-256-GCM',
	encryptionVersion: '1.0',
	keyId: 'key-1',
	dataIv: 'iv-value',
	wrappedKey: 'wrapped-key-value',
};

describe('handleStorageRequest GET fail-closed behavior', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('decrypts and returns the payload when a valid envelope is present', async () => {
		const bucketFile = {
			customMetadata: validEnvelope,
			arrayBuffer: async () => new ArrayBuffer(0),
		};
		const bucket = { get: vi.fn(async () => bucketFile) };
		const env = { STRIAE_DATA: bucket } as unknown as Env;

		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(validEnvelope);
		vi.mocked(decryptJsonFromStorageWithRegistry).mockResolvedValue(JSON.stringify({ caseNumber: 'CASE-001' }));

		const request = new Request('https://worker/data.json');
		const response = await handleStorageRequest(request, env, '/data.json', createResponder());

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ caseNumber: 'CASE-001' });
	});

	it('fails closed instead of serving plaintext when no envelope is present', async () => {
		const bucketFile = {
			customMetadata: undefined,
			text: vi.fn(async () => JSON.stringify({ caseNumber: 'CASE-001' })),
		};
		const bucket = { get: vi.fn(async () => bucketFile) };
		const env = { STRIAE_DATA: bucket } as unknown as Env;

		vi.mocked(extractDataAtRestEnvelope).mockReturnValue(null);

		const request = new Request('https://worker/data.json');
		const response = await handleStorageRequest(request, env, '/data.json', createResponder());

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({ error: 'Missing data-at-rest envelope metadata' });
		expect(bucketFile.text).not.toHaveBeenCalled();
		expect(decryptJsonFromStorageWithRegistry).not.toHaveBeenCalled();
	});

	it('rejects an envelope with an unsupported algorithm', async () => {
		const bucketFile = {
			customMetadata: { ...validEnvelope, algorithm: 'AES-256-GCM' },
			arrayBuffer: async () => new ArrayBuffer(0),
		};
		const bucket = { get: vi.fn(async () => bucketFile) };
		const env = { STRIAE_DATA: bucket } as unknown as Env;

		vi.mocked(extractDataAtRestEnvelope).mockReturnValue({ ...validEnvelope, algorithm: 'AES-256-GCM' });

		const request = new Request('https://worker/data.json');
		const response = await handleStorageRequest(request, env, '/data.json', createResponder());

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({ error: 'Unsupported data-at-rest encryption algorithm' });
	});
});

describe('handleStorageRequest PUT always encrypts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects writes when encryption key material is not configured', async () => {
		const bucket = { put: vi.fn(async () => undefined) };
		const env = { STRIAE_DATA: bucket } as unknown as Env;

		const request = new Request('https://worker/data.json', {
			method: 'PUT',
			body: JSON.stringify({ caseNumber: 'CASE-001' }),
		});
		const response = await handleStorageRequest(request, env, '/data.json', createResponder());

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({ error: 'Data-at-rest encryption is not fully configured' });
		expect(bucket.put).not.toHaveBeenCalled();
	});

	it('encrypts and stores the envelope in customMetadata when configured', async () => {
		const bucket = { put: vi.fn(async () => undefined) };
		const env = {
			STRIAE_DATA: bucket,
			DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: 'public-key-pem',
			DATA_AT_REST_ENCRYPTION_KEY_ID: 'key-1',
		} as unknown as Env;

		vi.mocked(encryptJsonForStorage).mockResolvedValue({
			ciphertext: new Uint8Array(0),
			envelope: validEnvelope,
		});

		const request = new Request('https://worker/data.json', {
			method: 'PUT',
			body: JSON.stringify({ caseNumber: 'CASE-001' }),
		});
		const response = await handleStorageRequest(request, env, '/data.json', createResponder());

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ success: true });
		expect(bucket.put).toHaveBeenCalledWith('data.json', expect.anything(), { customMetadata: validEnvelope });
	});
});
