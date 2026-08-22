import type { CreateResponse, Env } from '../types';
import { parseFileId } from '../utils/path-utils';

export async function handleImageDelete(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	const fileId = parseFileId(new URL(request.url).pathname);
	if (!fileId) {
		return respond({ error: 'Image ID is required' }, 400);
	}

	const existing = await env.STRIAE_FILES.head(fileId);
	if (!existing) {
		return respond({ error: 'File not found' }, 404);
	}

	await env.STRIAE_FILES.delete(fileId);
	return respond({ success: true });
}
