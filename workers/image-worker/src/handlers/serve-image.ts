// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { decryptBinaryWithRegistry, requireEncryptionRetrievalConfig } from '../security/key-registry';
import { requireSignedUrlConfig, verifySignedAccessToken } from '../security/signed-url';
import type { CreateResponse, Env } from '../types';
import { buildSafeContentDisposition } from '../utils/content-disposition';
import { extractEnvelope } from '../utils/storage-metadata';

export async function handleImageServing(request: Request, env: Env, fileId: string, respond: CreateResponse): Promise<Response> {
	const requestUrl = new URL(request.url);
	const hasSignedToken = requestUrl.searchParams.has('st');
	const signedToken = requestUrl.searchParams.get('st');

	if (hasSignedToken) {
		requireSignedUrlConfig(env);

		if (!signedToken || signedToken.trim().length === 0) {
			return respond({ error: 'Invalid or expired signed URL token' }, 403);
		}

		const tokenValid = await verifySignedAccessToken(signedToken, fileId, env);
		if (!tokenValid) {
			return respond({ error: 'Invalid or expired signed URL token' }, 403);
		}
	} else {
		return respond({ error: 'Unauthorized' }, 403);
	}

	requireEncryptionRetrievalConfig(env);

	const file = await env.STRIAE_FILES.get(fileId);
	if (!file) {
		return respond({ error: 'File not found' }, 404);
	}

	const envelope = extractEnvelope(file);
	if (!envelope) {
		return respond({ error: 'Missing data-at-rest envelope metadata' }, 500);
	}

	const encryptedData = await file.arrayBuffer();
	const plaintext = await decryptBinaryWithRegistry(encryptedData, envelope, env);

	const contentType = file.customMetadata?.contentType || 'application/octet-stream';
	const filename = file.customMetadata?.originalFilename || fileId;
	const contentDisposition = buildSafeContentDisposition(filename, fileId);

	return new Response(plaintext, {
		status: 200,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': contentType,
			'Content-Disposition': contentDisposition,
		},
	});
}
