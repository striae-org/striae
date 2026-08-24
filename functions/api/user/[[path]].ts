// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';
import { isEmailAllowed } from '../_shared/registration-allowlist';
import { fetchListFromWorker } from '../_shared/lists-client';

interface UserProxyContext {
	request: Request;
	env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'PUT', 'DELETE', 'OPTIONS']);
const USER_EXISTS_PATH_PREFIX = '/exists/';

function textResponse(message: string, status: number): Response {
	return new Response(message, {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

function jsonResponse(payload: Record<string, unknown>, status: number = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
}

function extractProxyPath(url: URL): string | null {
	const routePrefix = '/api/user';
	if (!url.pathname.startsWith(routePrefix)) {
		return null;
	}

	const remainder = url.pathname.slice(routePrefix.length);
	return remainder.length > 0 ? remainder : '/';
}

function extractUserIdFromProxyPath(proxyPath: string): string | null {
	const firstSegment = proxyPath.split('/').filter(Boolean)[0];
	if (!firstSegment) {
		return null;
	}

	try {
		return decodeURIComponent(firstSegment);
	} catch {
		return null;
	}
}

function extractExistenceCheckUserId(proxyPath: string): string | null {
	if (!proxyPath.startsWith(USER_EXISTS_PATH_PREFIX)) {
		return null;
	}

	const remainder = proxyPath.slice(USER_EXISTS_PATH_PREFIX.length);
	const firstSegment = remainder.split('/').filter(Boolean)[0];
	if (!firstSegment) {
		return null;
	}

	try {
		return decodeURIComponent(firstSegment);
	} catch {
		return null;
	}
}

export const onRequest = async ({ request, env }: UserProxyContext): Promise<Response> => {
	if (!SUPPORTED_METHODS.has(request.method)) {
		return textResponse('Method not allowed', 405);
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				Allow: 'GET, PUT, DELETE, OPTIONS',
				'Cache-Control': 'no-store',
			},
		});
	}

	const identity = await verifyFirebaseIdentityFromRequest(request, env);
	if (!identity) {
		return textResponse('Unauthorized', 401);
	}

	const requestUrl = new URL(request.url);
	const proxyPath = extractProxyPath(requestUrl);
	if (!proxyPath) {
		return textResponse('Not Found', 404);
	}

	if (!env.USER_WORKER) {
		return textResponse('User service not configured', 502);
	}

	const existenceCheckUserId = extractExistenceCheckUserId(proxyPath);
	if (existenceCheckUserId !== null) {
		if (request.method !== 'GET') {
			return textResponse('Method not allowed', 405);
		}

		let existenceResponse: Response;
		try {
			existenceResponse = await env.USER_WORKER.fetch(`https://worker/${encodeURIComponent(existenceCheckUserId)}`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
			});
		} catch {
			return textResponse('Upstream user service unavailable', 502);
		}

		if (existenceResponse.status === 404) {
			return jsonResponse({ exists: false });
		}

		if (!existenceResponse.ok) {
			return textResponse('Upstream user service unavailable', 502);
		}

		return jsonResponse({ exists: true });
	}

	const requestedUserId = extractUserIdFromProxyPath(proxyPath);
	if (!requestedUserId) {
		return textResponse('Missing user identifier', 400);
	}

	if (requestedUserId !== identity.uid) {
		return textResponse('Forbidden', 403);
	}

	// Registration gateway: for PUT requests, check if this is a new user creation.
	// Always enforce the allowlist for new users — isEmailAllowed fails closed for empty lists.
	// This is defense-in-depth — the primary check runs client-side in the login flow.
	if (request.method === 'PUT') {
		const listResult = await fetchListFromWorker(env.LISTS_WORKER, 'members', env.LISTS_ADMIN_SECRET);
		if (!listResult.ok) {
			// Fail closed: cannot verify allowlist, reject to prevent bypass.
			return textResponse('Unable to verify registration eligibility', 503);
		}
		try {
			const existenceResponse = await env.USER_WORKER.fetch(`https://worker/${encodeURIComponent(requestedUserId)}`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
			});

			if (existenceResponse.status === 404) {
				// User does not exist yet — this is a registration PUT.
				// Enforce the email allowlist (isEmailAllowed returns false for empty list).
				if (!isEmailAllowed(identity.email ?? '', listResult.list)) {
					return textResponse('Registration is not permitted for this email address', 403);
				}
			} else if (!existenceResponse.ok) {
				// Existence check failed (non-404, non-2xx response).
				// Fail closed: reject the registration to prevent allowlist bypass during errors.
				return textResponse('Unable to verify registration eligibility', 502);
			}
			// If user already exists (200), proceed normally.
		} catch {
			// Fail closed: on network error, reject the request.
			return textResponse('Unable to verify registration eligibility', 502);
		}
	}

	const upstreamHeaders = new Headers();
	const contentTypeHeader = request.headers.get('Content-Type');
	if (contentTypeHeader) {
		upstreamHeaders.set('Content-Type', contentTypeHeader);
	}

	const acceptHeader = request.headers.get('Accept');
	if (acceptHeader) {
		upstreamHeaders.set('Accept', acceptHeader);
	}

	const shouldForwardBody = request.method !== 'GET' && request.method !== 'HEAD';

	let upstreamResponse: Response;
	try {
		upstreamResponse = await env.USER_WORKER.fetch(`https://worker${proxyPath}${requestUrl.search}`, {
			method: request.method,
			headers: upstreamHeaders,
			body: shouldForwardBody ? request.body : undefined,
		});
	} catch {
		return textResponse('Upstream user service unavailable', 502);
	}

	const responseHeaders = new Headers(upstreamResponse.headers);
	if (!responseHeaders.has('Cache-Control')) {
		responseHeaders.set('Cache-Control', 'no-store');
	}

	return new Response(upstreamResponse.body, {
		status: upstreamResponse.status,
		statusText: upstreamResponse.statusText,
		headers: responseHeaders,
	});
};
