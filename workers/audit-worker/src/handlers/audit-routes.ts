// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { appendAuditEntry, generateAuditFileName, isValidAuditEntry, readAuditEntriesFromObject } from '../storage/audit-storage';
import type { AuditEntry, CreateResponse, Env } from '../types';

export async function handleAuditRequest(request: Request, env: Env, url: URL, respond: CreateResponse): Promise<Response> {
	const bucket = env.STRIAE_AUDIT;
	const userId = url.searchParams.get('userId');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');

	if (request.method === 'POST') {
		if (!userId) {
			return respond({ error: 'userId parameter is required' }, 400);
		}

		const auditEntry: unknown = await request.json();

		if (!isValidAuditEntry(auditEntry)) {
			return respond({ error: 'Invalid audit entry structure. Required fields: entryId, timestamp, userId, action' }, 400);
		}

		if (auditEntry.userId !== userId) {
			return respond({ error: 'userId parameter must match auditEntry.userId' }, 400);
		}

		const filename = generateAuditFileName(userId);

		try {
			const { entryCount, deduped } = await appendAuditEntry(bucket, filename, auditEntry, env);
			return respond({
				success: true,
				entryCount,
				filename,
				deduped,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return respond({ error: `Failed to store audit entry: ${errorMessage}` }, 500);
		}
	}

	if (request.method === 'GET') {
		if (!userId) {
			return respond({ error: 'userId parameter is required' }, 400);
		}

		try {
			let allEntries: AuditEntry[] = [];

			if (startDate && endDate) {
				const start = new Date(startDate);
				const end = new Date(endDate);
				const currentDate = new Date(start);

				while (currentDate <= end) {
					const filename = generateAuditFileName(userId, currentDate);
					const file = await bucket.get(filename);

					if (file) {
						const entries = await readAuditEntriesFromObject(file, env);
						allEntries.push(...entries);
					}

					currentDate.setDate(currentDate.getDate() + 1);
				}
			} else {
				const filename = generateAuditFileName(userId);
				const file = await bucket.get(filename);

				if (file) {
					allEntries = await readAuditEntriesFromObject(file, env);
				}
			}

			allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

			return respond({
				entries: allEntries,
				total: allEntries.length,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return respond({ error: `Failed to retrieve audit entries: ${errorMessage}` }, 500);
		}
	}

	return respond({ error: 'Method not allowed for audit endpoints. Only GET and POST are supported.' }, 405);
}
