// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import {
	normalizeSignedUrlTtlSeconds,
	parseSignedUrlBaseUrl,
	requireSignedUrlConfig,
	signSignedAccessPayload,
} from '../security/signed-url';
import type { CreateResponse, Env, SignedAccessPayload } from '../types';

interface SignedUrlMintRequestBody {
	expiresInSeconds?: unknown;
}

export async function handleSignedUrlMinting(request: Request, env: Env, fileId: string, respond: CreateResponse): Promise<Response> {
	requireSignedUrlConfig(env);

	const existing = await env.STRIAE_FILES.head(fileId);
	if (!existing) {
		return respond({ error: 'File not found' }, 404);
	}

	let requestedExpiresInSeconds: number | undefined;
	const contentType = request.headers.get('Content-Type') || '';
	if (contentType.includes('application/json')) {
		const requestBody = await request.json().catch(() => null);
		if (requestBody && typeof requestBody === 'object') {
			const expiresInSeconds = (requestBody as SignedUrlMintRequestBody).expiresInSeconds;
			if (typeof expiresInSeconds === 'number') {
				requestedExpiresInSeconds = expiresInSeconds;
			}
		}
	}

	const nowEpochSeconds = Math.floor(Date.now() / 1000);
	const ttlSeconds = normalizeSignedUrlTtlSeconds(requestedExpiresInSeconds, env);
	const payload: SignedAccessPayload = {
		fileId,
		iat: nowEpochSeconds,
		exp: nowEpochSeconds + ttlSeconds,
		nonce: crypto.randomUUID().replace(/-/g, ''),
	};

	const signedToken = await signSignedAccessPayload(payload, env);

	let baseUrl: string;
	const configuredBaseUrl = env.FILES_SIGNED_URL_BASE_URL;
	if (configuredBaseUrl) {
		try {
			baseUrl = parseSignedUrlBaseUrl(configuredBaseUrl);
		} catch (error) {
			console.error('Invalid FILES_SIGNED_URL_BASE_URL configuration', {
				reason: error instanceof Error ? error.message : String(error),
			});
			return respond({ error: 'Signed URL base URL is misconfigured' }, 500);
		}
	} else {
		baseUrl = new URL(request.url).origin;
	}

	const signedUrl = `${baseUrl}/${encodeURIComponent(fileId)}?st=${encodeURIComponent(signedToken)}`;

	return respond({
		success: true,
		result: {
			fileId,
			url: signedUrl,
			expiresAt: new Date(payload.exp * 1000).toISOString(),
			expiresInSeconds: ttlSeconds,
		},
	});
}
