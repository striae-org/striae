import { routeImageWorkerRequest } from './router';
import type { APIResponse, CreateResponse, Env } from './types';

const createWorkerResponse: CreateResponse = (data: APIResponse, status: number = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			return await routeImageWorkerRequest(request, env, createWorkerResponse);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return createWorkerResponse({ error: errorMessage }, 500);
		}
	},
};
