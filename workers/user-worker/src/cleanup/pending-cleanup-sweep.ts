// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { deleteSingleCase, deleteUserConfirmationSummary } from './account-deletion';
import { getDataAtRestPrivateKeyRegistry } from './case-data-reader';
import { checkFirebaseAuthUserExists } from '../firebase/admin';
import {
	PENDING_CLEANUP_PREFIX,
	readPendingCleanupMarker,
	tombstonePendingCleanupMarkerIfUnchanged,
	writePendingCleanupMarkerIfUnchanged,
} from './pending-cleanup-marker';
import type { Env } from '../types';

export interface PendingCleanupSweepResult {
	processed: number;
	resolved: number;
	stillFailing: number;
	conflicted: number;
	awaitingFinalization: number;
	verifiedByFirebaseLookup: number;
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
	let awaitingFinalization = 0;
	let verifiedByFirebaseLookup = 0;
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
			let sweepableMarker = marker;
			if (!sweepableMarker.authDeletionComplete) {
				if (!sweepableMarker.firebaseAuthDeleted) {
					let firebaseUserExists: boolean;
					try {
						firebaseUserExists = await checkFirebaseAuthUserExists(env, sweepableMarker.userUid);
					} catch (error) {
						console.warn(`Unable to verify Firebase Auth status for ${sweepableMarker.userUid}, leaving marker pending:`, error);
						awaitingFinalization += 1;
						continue;
					}

					if (firebaseUserExists) {
						// Account deletion hasn't finalized (or failed) yet, so the account may
						// still be active. Leave the marker and its case data untouched.
						awaitingFinalization += 1;
						continue;
					}

					verifiedByFirebaseLookup += 1;
				}

				// Firebase Auth deletion is confirmed (via the stage flag or the lookup above);
				// retry USER_DB.delete in case it never ran, and self-heal the marker so later
				// passes skip straight to the fast path.
				try {
					await env.USER_DB.delete(sweepableMarker.userUid);
				} catch (error) {
					console.warn(`Unable to clean up USER_DB record for ${sweepableMarker.userUid} during pending-cleanup sweep:`, error);
				}

				sweepableMarker = { ...sweepableMarker, firebaseAuthDeleted: true, authDeletionComplete: true };
			}

			const remainingFailedCases: { caseNumber: string; message: string }[] = [];
			for (const { caseNumber } of sweepableMarker.failedCases) {
				try {
					await deleteSingleCase(env, sweepableMarker.userUid, caseNumber);
				} catch (error) {
					remainingFailedCases.push({
						caseNumber,
						message: error instanceof Error ? error.message : 'unknown error',
					});
				}
			}

			let pendingConfirmationSummary = false;
			if (sweepableMarker.pendingConfirmationSummary) {
				try {
					await deleteUserConfirmationSummary(env, sweepableMarker.userUid);
				} catch {
					pendingConfirmationSummary = true;
				}
			}

			if (remainingFailedCases.length === 0 && !pendingConfirmationSummary) {
				// Conditioned atomically on the etag from our initial read via put's onlyIf: if a
				// concurrent account deletion already replaced this marker, leave its newer state alone.
				const tombstoned = await tombstonePendingCleanupMarkerIfUnchanged(env, obj.key, etag);
				if (tombstoned) {
					resolved += 1;
				} else {
					conflicted += 1;
				}
				continue;
			}

			const wrote = await writePendingCleanupMarkerIfUnchanged(
				env,
				{
					...sweepableMarker,
					failedCases: remainingFailedCases,
					pendingConfirmationSummary,
					attempts: sweepableMarker.attempts + 1,
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

	return { processed, resolved, stillFailing, conflicted, awaitingFinalization, verifiedByFirebaseLookup };
}

export async function runPendingCaseCleanupSweep(env: Env): Promise<void> {
	try {
		const result = await sweepPendingCaseCleanup(env);
		if (result.stillFailing > 0 || result.conflicted > 0) {
			console.warn('Pending-cleanup sweep completed with unresolved/conflicted markers:', result);
		} else if (result.verifiedByFirebaseLookup > 0) {
			console.warn('Pending-cleanup sweep resolved markers via Firebase lookup fallback (stage flag was missing/unset):', result);
		} else if (result.processed > 0) {
			console.log('Pending-cleanup sweep resolved all markers:', result);
		}
	} catch (error) {
		console.error('Pending-cleanup sweep failed:', error);
	}
}
