// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { handleAuditRequest } from './handlers/audit-routes';
import type { CreateResponse, Env } from './types';

const createWorkerResponse: CreateResponse = (data, status: number = 200): Response =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			if (!pathname.startsWith('/audit/')) {
				return createWorkerResponse({ error: 'This worker only handles audit endpoints. Use /audit/ path.' }, 404);
			}

			return await handleAuditRequest(request, env, url, createWorkerResponse);
		} catch (error) {
			console.error('Audit Worker error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return createWorkerResponse({ error: errorMessage }, 500);
		}
	},
};
