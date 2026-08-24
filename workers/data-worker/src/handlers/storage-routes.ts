// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { DATA_AT_REST_ENCRYPTION_ALGORITHM, DATA_AT_REST_ENCRYPTION_VERSION } from '../config';
import { encryptJsonForStorage } from '../encryption-utils';
import { decryptJsonFromStorageWithRegistry, extractDataAtRestEnvelope } from '../registry/key-registry';
import type { CreateResponse, Env } from '../types';

export async function handleStorageRequest(request: Request, env: Env, pathname: string, respond: CreateResponse): Promise<Response> {
	const bucket = env.STRIAE_DATA;
	const filename = pathname.slice(1) || 'data.json';

	if (!filename.endsWith('.json')) {
		return respond({ error: 'Invalid file type. Only JSON files are allowed.' }, 400);
	}

	switch (request.method) {
		case 'GET': {
			const file = await bucket.get(filename);
			if (!file) {
				return respond([], 200);
			}

			const atRestEnvelope = extractDataAtRestEnvelope(file);
			if (!atRestEnvelope) {
				return respond({ error: 'Missing data-at-rest envelope metadata' }, 500);
			}

			if (atRestEnvelope.algorithm !== DATA_AT_REST_ENCRYPTION_ALGORITHM) {
				return respond({ error: 'Unsupported data-at-rest encryption algorithm' }, 500);
			}

			if (atRestEnvelope.encryptionVersion !== DATA_AT_REST_ENCRYPTION_VERSION) {
				return respond({ error: 'Unsupported data-at-rest encryption version' }, 500);
			}

			try {
				const encryptedData = await file.arrayBuffer();
				const plaintext = await decryptJsonFromStorageWithRegistry(encryptedData, atRestEnvelope, env);
				const decryptedPayload = JSON.parse(plaintext);
				return respond(decryptedPayload);
			} catch (error) {
				console.error('Data-at-rest decryption failed:', error);
				return respond({ error: 'Failed to decrypt stored data' }, 500);
			}
		}

		case 'PUT': {
			let newData: unknown;

			try {
				newData = await request.json();
			} catch (error) {
				console.error('Request JSON parse failed:', error);
				return respond({ error: 'Invalid JSON request body' }, 400);
			}

			const serializedData = JSON.stringify(newData);

			if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
				return respond({ error: 'Data-at-rest encryption is not fully configured' }, 500);
			}

			try {
				const encryptedPayload = await encryptJsonForStorage(
					serializedData,
					env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
					env.DATA_AT_REST_ENCRYPTION_KEY_ID,
				);

				await bucket.put(filename, encryptedPayload.ciphertext, {
					customMetadata: {
						algorithm: encryptedPayload.envelope.algorithm,
						encryptionVersion: encryptedPayload.envelope.encryptionVersion,
						keyId: encryptedPayload.envelope.keyId,
						dataIv: encryptedPayload.envelope.dataIv,
						wrappedKey: encryptedPayload.envelope.wrappedKey,
					},
				});
			} catch (error) {
				console.error('Data-at-rest encryption failed:', error);
				return respond({ error: 'Failed to encrypt data for storage' }, 500);
			}

			return respond({ success: true });
		}

		case 'DELETE': {
			const file = await bucket.get(filename);
			if (!file) {
				return respond({ error: 'File not found' }, 404);
			}

			await bucket.delete(filename);
			return respond({ success: true });
		}

		default:
			return respond({ error: 'Method not allowed' }, 405);
	}
}
