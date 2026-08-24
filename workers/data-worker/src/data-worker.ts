// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { DECRYPT_EXPORT_PATH, SIGN_AUDIT_EXPORT_PATH, SIGN_CONFIRMATION_PATH, SIGN_MANIFEST_PATH } from './config';
import { handleDecryptExport } from './handlers/decrypt-export';
import { handleSignAuditExport, handleSignConfirmation, handleSignManifest } from './handlers/signing';
import { handleStorageRequest } from './handlers/storage-routes';
import type { CreateResponse, Env } from './types';

const createWorkerResponse: CreateResponse = (data, status: number = 200): Response =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			if (request.method === 'POST' && pathname === SIGN_MANIFEST_PATH) {
				return await handleSignManifest(request, env, createWorkerResponse);
			}

			if (request.method === 'POST' && pathname === SIGN_CONFIRMATION_PATH) {
				return await handleSignConfirmation(request, env, createWorkerResponse);
			}

			if (request.method === 'POST' && pathname === SIGN_AUDIT_EXPORT_PATH) {
				return await handleSignAuditExport(request, env, createWorkerResponse);
			}

			if (request.method === 'POST' && pathname === DECRYPT_EXPORT_PATH) {
				return await handleDecryptExport(request, env, createWorkerResponse);
			}

			return await handleStorageRequest(request, env, pathname, createWorkerResponse);
		} catch (error) {
			console.error('Worker error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return createWorkerResponse({ error: errorMessage }, 500);
		}
	},
};
