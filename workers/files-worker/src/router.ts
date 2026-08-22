import { handleFileDelete } from './handlers/delete-file';
import { handleSignedUrlMinting } from './handlers/mint-signed-url';
import { handleFileServing } from './handlers/serve-file';
import { handleFileUpload } from './handlers/upload-file';
import { checkRateLimit } from './security/rate-limit';
import type { CreateResponse, Env } from './types';
import { parsePathSegments } from './utils/path-utils';

function buildRateLimitResponse(result: ReturnType<typeof checkRateLimit>): Response {
	return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please retry shortly.' }), {
		status: 429,
		headers: {
			'Content-Type': 'application/json',
			'Retry-After': String(result.retryAfterSeconds),
			'X-RateLimit-Limit': String(result.limit),
			'X-RateLimit-Remaining': String(result.remaining),
			'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
		},
	});
}

export async function routeFilesWorkerRequest(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	const requestUrl = new URL(request.url);
	const pathSegments = parsePathSegments(requestUrl.pathname);
	if (!pathSegments) {
		return respond({ error: 'Invalid files path encoding' }, 400);
	}

	switch (request.method) {
		case 'POST': {
			if (pathSegments.length === 0) {
				const uploadRateLimit = checkRateLimit(request, env, 'upload');
				if (!uploadRateLimit.allowed) {
					return buildRateLimitResponse(uploadRateLimit);
				}

				return handleFileUpload(request, env, respond);
			}

			if (pathSegments.length === 2 && pathSegments[1] === 'signed-url') {
				const signedUrlRateLimit = checkRateLimit(request, env, 'signed-url');
				if (!signedUrlRateLimit.allowed) {
					return buildRateLimitResponse(signedUrlRateLimit);
				}

				return handleSignedUrlMinting(request, env, pathSegments[0], respond);
			}

			return respond({ error: 'Not found' }, 404);
		}

		case 'GET': {
			const fileId = pathSegments.length === 1 ? pathSegments[0] : null;
			if (!fileId) {
				return respond({ error: 'File ID is required' }, 400);
			}

			return handleFileServing(request, env, fileId, respond);
		}

		case 'DELETE': {
			if (pathSegments.length !== 1) {
				return respond({ error: 'Not found' }, 404);
			}

			const deleteRateLimit = checkRateLimit(request, env, 'delete');
			if (!deleteRateLimit.allowed) {
				return buildRateLimitResponse(deleteRateLimit);
			}

			return handleFileDelete(request, env, respond);
		}

		default:
			return respond({ error: 'Method not allowed' }, 405);
	}
}
