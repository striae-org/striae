import { requireUserKvReadConfig, requireUserKvWriteConfig } from './auth';
import { runOrphanSweep } from './cleanup/orphan-sweep';
import { runPendingCaseCleanupSweep } from './cleanup/pending-cleanup-sweep';
import { USER_CASES_SEGMENT } from './config';
import {
	handleAddCases,
	handleAddUser,
	handleDeleteCases,
	handleDeleteUser,
	handleDeleteUserWithProgress,
	handleGetUser,
} from './handlers/user-routes';
import type { CreateResponse, Env } from './types';

const createWorkerResponse: CreateResponse = (data, status: number = 200): Response =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			// DELETE can mutate user KV data (for example /:uid/cases), so non-GET methods require write config.
			if (request.method === 'GET') {
				requireUserKvReadConfig(env);
			} else {
				requireUserKvWriteConfig(env);
			}

			const url = new URL(request.url);
			const parts = url.pathname.split('/');
			const userUid = parts[1];
			const isCasesEndpoint = parts[2] === USER_CASES_SEGMENT;

			if (!userUid) {
				return createWorkerResponse({ error: 'Not Found' }, 404);
			}

			// Handle regular cases endpoint
			if (isCasesEndpoint) {
				switch (request.method) {
					case 'PUT':
						return handleAddCases(request, env, userUid, createWorkerResponse);
					case 'DELETE':
						return handleDeleteCases(request, env, userUid, createWorkerResponse);
					default:
						return createWorkerResponse({ error: 'Method not allowed' }, 405);
				}
			}

			// Handle user operations
			const acceptsEventStream = request.headers.get('Accept')?.includes('text/event-stream') === true;
			const streamProgress = url.searchParams.get('stream') === 'true' || acceptsEventStream;

			switch (request.method) {
				case 'GET':
					return handleGetUser(env, userUid, createWorkerResponse);
				case 'PUT':
					return handleAddUser(request, env, userUid, createWorkerResponse);
				case 'DELETE':
					return streamProgress ? handleDeleteUserWithProgress(env, userUid) : handleDeleteUser(env, userUid, createWorkerResponse);
				default:
					return createWorkerResponse({ error: 'Method not allowed' }, 405);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			if (errorMessage === 'User KV encryption is not fully configured') {
				return createWorkerResponse({ error: errorMessage }, 500);
			}

			return createWorkerResponse({ error: 'Internal Server Error' }, 500);
		}
	},

	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runPendingCaseCleanupSweep(env));
		ctx.waitUntil(runOrphanSweep(env));
	},
};
