import { deleteSingleCase, deleteUserConfirmationSummary } from './account-deletion';
import { getDataAtRestPrivateKeyRegistry } from './case-data-reader';
import {
	deletePendingCleanupMarkerIfUnchanged,
	PENDING_CLEANUP_PREFIX,
	readPendingCleanupMarker,
	writePendingCleanupMarkerIfUnchanged,
} from './pending-cleanup-marker';
import type { Env } from '../types';

export interface PendingCleanupSweepResult {
	processed: number;
	resolved: number;
	stillFailing: number;
	conflicted: number;
}

/**
 * Retries case-data cleanup (and confirmation-summary deletion) left behind by
 * account deletions that recorded a marker instead of finalizing case cleanup inline.
 */
export async function sweepPendingCaseCleanup(env: Env): Promise<PendingCleanupSweepResult> {
	let processed = 0;
	let resolved = 0;
	let stillFailing = 0;
	let conflicted = 0;
	let cursor: string | undefined;
	// Fetched once and reused for every marker instead of refetching per key.
	const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);

	do {
		const listed = await env.STRIAE_DATA.list({ prefix: PENDING_CLEANUP_PREFIX, cursor, limit: 1000 });

		for (const obj of listed.objects) {
			const read = await readPendingCleanupMarker(env, obj.key, keyRegistry);
			if (!read) {
				continue;
			}

			const { marker, etag } = read;
			processed += 1;

			const remainingFailedCases: { caseNumber: string; message: string }[] = [];
			for (const { caseNumber } of marker.failedCases) {
				try {
					await deleteSingleCase(env, marker.userUid, caseNumber);
				} catch (error) {
					remainingFailedCases.push({
						caseNumber,
						message: error instanceof Error ? error.message : 'unknown error',
					});
				}
			}

			let pendingConfirmationSummary = false;
			if (marker.pendingConfirmationSummary) {
				try {
					await deleteUserConfirmationSummary(env, marker.userUid);
				} catch {
					pendingConfirmationSummary = true;
				}
			}

			if (remainingFailedCases.length === 0 && !pendingConfirmationSummary) {
				// Conditioned on the etag from our initial read: if a concurrent account
				// deletion already replaced this marker, don't delete its newer state.
				const deleted = await deletePendingCleanupMarkerIfUnchanged(env, obj.key, etag);
				if (deleted) {
					resolved += 1;
				} else {
					conflicted += 1;
				}
				continue;
			}

			const wrote = await writePendingCleanupMarkerIfUnchanged(
				env,
				{
					...marker,
					failedCases: remainingFailedCases,
					pendingConfirmationSummary,
					attempts: marker.attempts + 1,
					lastAttemptAt: new Date().toISOString(),
				},
				etag,
			);

			if (wrote !== null) {
				stillFailing += 1;
			} else {
				// A concurrent writer already replaced the marker since our read; leave
				// its newer state alone and let the next sweep pass pick it up.
				conflicted += 1;
			}
		}

		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor !== undefined);

	return { processed, resolved, stillFailing, conflicted };
}

export async function runPendingCaseCleanupSweep(env: Env): Promise<void> {
	try {
		const result = await sweepPendingCaseCleanup(env);
		if (result.stillFailing > 0 || result.conflicted > 0) {
			console.warn('Pending-cleanup sweep completed with unresolved/conflicted markers:', result);
		} else if (result.processed > 0) {
			console.log('Pending-cleanup sweep resolved all markers:', result);
		}
	} catch (error) {
		console.error('Pending-cleanup sweep failed:', error);
	}
}
