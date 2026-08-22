import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';
import { fetchListFromWorker } from '../_shared/lists-client';

interface PdfProxyContext {
	request: Request;
	env: Env;
}

const SUPPORTED_METHODS = new Set(['POST', 'OPTIONS']);
const PRIMERSHEAR_FORMAT = 'primershear';
const DEFAULT_FORMAT = 'striae';

interface PdfProxyRequestBody {
	data: Record<string, unknown>;
}

function textResponse(message: string, status: number): Response {
	return new Response(message, {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

function extractProxyPath(url: URL): string | null {
	const routePrefix = '/api/pdf';
	if (!url.pathname.startsWith(routePrefix)) {
		return null;
	}

	const remainder = url.pathname.slice(routePrefix.length);
	return remainder.length > 0 ? remainder : '/';
}

function resolveReportFormat(email: string | null, primershearEmails: string): string {
	if (!email) return DEFAULT_FORMAT;
	const allowed = primershearEmails
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(email.toLowerCase()) ? PRIMERSHEAR_FORMAT : DEFAULT_FORMAT;
}

function parsePdfProxyRequestBody(payload: unknown): PdfProxyRequestBody | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null;
	}

	const record = payload as Record<string, unknown>;
	if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)) {
		return null;
	}

	return {
		data: record.data as Record<string, unknown>,
	};
}

export const onRequest = async ({ request, env }: PdfProxyContext): Promise<Response> => {
	if (!SUPPORTED_METHODS.has(request.method)) {
		return textResponse('Method not allowed', 405);
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				Allow: 'POST, OPTIONS',
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

	if (!env.PDF_WORKER) {
		return textResponse('PDF service not configured', 502);
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

	// Resolve the report format server-side based on the verified user email.
	// This prevents email lists from ever being exposed in the client bundle.
	// Fail-open: if the lists-worker is unavailable, fall back to the default format.
	const primershearResult = await fetchListFromWorker(env.LISTS_WORKER, 'primershear', env.LISTS_ADMIN_SECRET);
	const reportFormat = resolveReportFormat(identity.email, primershearResult.ok ? primershearResult.list : '');

	let upstreamBody: BodyInit;
	try {
		const payload = parsePdfProxyRequestBody(await request.json());
		if (!payload) {
			return textResponse('Invalid PDF request body', 400);
		}

		upstreamBody = JSON.stringify({
			data: payload.data,
			reportFormat,
		});
		upstreamHeaders.set('Content-Type', 'application/json');
	} catch {
		return textResponse('Invalid request body', 400);
	}

	let upstreamResponse: Response;
	try {
		upstreamResponse = await env.PDF_WORKER.fetch(`https://worker${proxyPath}${requestUrl.search}`, {
			method: request.method,
			headers: upstreamHeaders,
			body: upstreamBody,
		});
	} catch {
		return textResponse('Upstream PDF service unavailable', 502);
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
