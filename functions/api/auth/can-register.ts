import { isEmailAllowed } from '../_shared/registration-allowlist';
import { fetchListFromWorker } from '../_shared/lists-client';

interface CanRegisterContext {
	request: Request;
	env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'OPTIONS']);

function jsonResponse(payload: Record<string, unknown>, status: number = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
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

export const onRequest = async ({ request, env }: CanRegisterContext): Promise<Response> => {
	if (!SUPPORTED_METHODS.has(request.method)) {
		return textResponse('Method not allowed', 405);
	}

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				Allow: 'GET, OPTIONS',
				'Cache-Control': 'no-store',
			},
		});
	}

	const url = new URL(request.url);
	const email = url.searchParams.get('email');

	if (!email || email.trim().length === 0) {
		return textResponse('Missing required parameter: email', 400);
	}

	const listResult = await fetchListFromWorker(env.LISTS_WORKER, 'members', env.LISTS_ADMIN_SECRET);
	if (!listResult.ok) {
		// Fail closed: cannot verify allowlist, deny to prevent bypass.
		return textResponse('Unable to verify registration eligibility', 503);
	}

	if (isEmailAllowed(email, listResult.list)) {
		return jsonResponse({ allowed: true });
	}

	return jsonResponse({ allowed: false }, 403);
};
