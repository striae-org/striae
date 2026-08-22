import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface ImageProxyContext {
	request: Request;
	env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'DELETE', 'OPTIONS']);

function textResponse(message: string, status: number): Response {
	return new Response(message, {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

type ProxyPathResult = { ok: true; path: string } | { ok: false; reason: 'not-found' | 'bad-encoding' };

function extractProxyPath(url: URL): ProxyPathResult {
	const routePrefix = '/api/image';
	if (!url.pathname.startsWith(routePrefix)) {
		return { ok: false, reason: 'not-found' };
	}

	const remainder = url.pathname.slice(routePrefix.length);
	if (remainder.length === 0) {
		return { ok: true, path: '/' };
	}

	const normalizedRemainder = remainder.startsWith('/') ? remainder : `/${remainder}`;
	const encodedPath = normalizedRemainder.slice(1);
	if (encodedPath.length === 0) {
		return { ok: true, path: normalizedRemainder };
	}

	try {
		const decodedPath = decodeURIComponent(encodedPath);
		if (decodedPath.includes('?') || decodedPath.includes('#')) {
			return { ok: false, reason: 'bad-encoding' };
		}

		return { ok: true, path: decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}` };
	} catch {
		return { ok: false, reason: 'bad-encoding' };
	}
}

const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;

function looksLikeSignedToken(value: string): boolean {
	const parts = value.split('.');
	if (parts.length !== 2) return false;
	return parts.every((part) => part.length > 0 && BASE64URL_SEGMENT.test(part));
}

export const onRequest = async ({ request, env }: ImageProxyContext): Promise<Response> => {
	if (!SUPPORTED_METHODS.has(request.method)) {
		return textResponse('Method not allowed', 405);
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				Allow: 'GET, POST, DELETE, OPTIONS',
				'Cache-Control': 'no-store',
			},
		});
	}

	const requestUrl = new URL(request.url);

	const signedToken = requestUrl.searchParams.get('st');
	const isSignedTokenRequest = request.method === 'GET' && signedToken !== null && looksLikeSignedToken(signedToken);

	if (request.method === 'GET') {
		if (!isSignedTokenRequest) {
			return textResponse('Unauthorized', 403);
		}
	} else {
		const identity = await verifyFirebaseIdentityFromRequest(request, env);
		if (!identity) {
			return textResponse('Unauthorized', 401);
		}
	}

	const proxyPathResult = extractProxyPath(requestUrl);
	if (!proxyPathResult.ok) {
		return proxyPathResult.reason === 'bad-encoding'
			? textResponse('Bad Request: malformed image path encoding', 400)
			: textResponse('Not Found', 404);
	}

	const proxyPath = proxyPathResult.path;

	if (!env.IMAGE_WORKER) {
		return textResponse('Image service not configured', 502);
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
		upstreamResponse = await env.IMAGE_WORKER.fetch(`https://worker${proxyPath}${requestUrl.search}`, {
			method: request.method,
			headers: upstreamHeaders,
			body: shouldForwardBody ? request.body : undefined,
		});
	} catch {
		return textResponse('Upstream image service unavailable', 502);
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
