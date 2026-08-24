// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { deleteFirebaseAuthUser } from '../firebase/admin';
import { readUserRecord } from '../storage/user-records';
import type { AccountDeletionProgressEvent, AccountDeletionResult, Env } from '../types';
import { readCaseFileIds } from './case-data-reader';
import { markPendingCleanupAuthDeletionComplete, markPendingCleanupFirebaseAuthDeleted, recordPendingCleanupFailure } from './pending-cleanup-marker';

export async function deleteSingleCase(env: Env, userUid: string, caseNumber: string): Promise<void> {
	const encodedUserId = encodeURIComponent(userUid);
	const encodedCaseNumber = encodeURIComponent(caseNumber);
	const casePrefix = `${encodedUserId}/${encodedCaseNumber}/`;
	const caseDataKey = `${casePrefix}data.json`;
	const deletionErrors: string[] = [];
	const dataKeys: string[] = [];
	const fileIds = new Set<string>();
	let dataCursor: string | undefined;

	do {
		const listed = await env.STRIAE_DATA.list({ prefix: casePrefix, cursor: dataCursor, limit: 1000 });

		for (const obj of listed.objects) {
			dataKeys.push(obj.key);

			const segments = obj.key.split('/');
			if (segments.length === 4 && segments[3] === 'data.json') {
				try {
					fileIds.add(decodeURIComponent(segments[2]));
				} catch {
					fileIds.add(segments[2]);
				}
			}
		}

		dataCursor = listed.truncated ? listed.cursor : undefined;
	} while (dataCursor !== undefined);

	if (dataKeys.includes(caseDataKey)) {
		// readCaseFileIds throws if the record isn't validly encrypted, which aborts this
		// case's cleanup below (caught by the per-case try/catch in executeUserDeletion and
		// retried via the pending-cleanup marker) rather than deleting files/data based on
		// an unknown/unverifiable set of references.
		for (const fileId of await readCaseFileIds(env, caseDataKey)) {
			fileIds.add(fileId);
		}
	}

	for (const fileId of fileIds) {
		try {
			await env.STRIAE_FILES.delete(fileId);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown file delete error';
			deletionErrors.push(`file ${fileId} delete threw (${message})`);
		}
	}

	if (dataKeys.length > 0) {
		try {
			await env.STRIAE_DATA.delete(dataKeys);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown data delete error';
			deletionErrors.push(`case data delete threw (${message})`);
		}
	}

	if (deletionErrors.length > 0) {
		throw new Error(`Case cleanup incomplete for ${caseNumber}: ${deletionErrors.join('; ')}`);
	}
}

export async function deleteUserConfirmationSummary(env: Env, userUid: string): Promise<void> {
	const encodedUserId = encodeURIComponent(userUid);
	const key = `${encodedUserId}/meta/confirmation-status.json`;

	try {
		await env.STRIAE_DATA.delete(key);
	} catch (error) {
		throw new Error(`Failed to delete confirmation summary metadata: ${error instanceof Error ? error.message : 'unknown error'}`, {
			cause: error,
		});
	}
}

export async function executeUserDeletion(
	env: Env,
	userUid: string,
	reportProgress?: (progress: AccountDeletionProgressEvent) => void,
): Promise<AccountDeletionResult> {
	const userData = await readUserRecord(env, userUid);
	if (userData === null) {
		throw new Error('User not found');
	}

	const ownedCases = (userData.cases || []).map((caseItem) => caseItem.caseNumber);
	const readOnlyCases = (userData.readOnlyCases || []).map((caseItem) => caseItem.caseNumber);
	const allCaseNumbers = Array.from(new Set([...ownedCases, ...readOnlyCases]));
	const totalCases = allCaseNumbers.length;
	let completedCases = 0;
	const caseCleanupErrors: string[] = [];
	const failedCaseDetails: { caseNumber: string; message: string }[] = [];

	reportProgress?.({
		event: 'start',
		totalCases,
		completedCases,
	});

	for (const caseNumber of allCaseNumbers) {
		reportProgress?.({
			event: 'case-start',
			totalCases,
			completedCases,
			currentCaseNumber: caseNumber,
		});

		let caseDeletionError: string | null = null;
		try {
			await deleteSingleCase(env, userUid, caseNumber);
		} catch (error) {
			caseDeletionError = error instanceof Error ? error.message : `Case cleanup failed for ${caseNumber}`;
			caseCleanupErrors.push(caseDeletionError);
			failedCaseDetails.push({ caseNumber, message: caseDeletionError });
			console.error(`Case cleanup error for ${caseNumber}:`, error);
		}

		completedCases += 1;

		reportProgress?.({
			event: 'case-complete',
			totalCases,
			completedCases,
			currentCaseNumber: caseNumber,
			success: caseDeletionError === null,
			message: caseDeletionError || undefined,
		});
	}

	let pendingConfirmationSummary = false;
	try {
		await deleteUserConfirmationSummary(env, userUid);
	} catch (error) {
		pendingConfirmationSummary = true;
		console.error(`Confirmation summary cleanup failed for ${userUid}, deferring to pending-cleanup sweep:`, error);
	}

	const pendingCleanup = caseCleanupErrors.length > 0 || pendingConfirmationSummary;

	if (pendingCleanup) {
		// Merges into any marker a concurrent deletion attempt for this same user already
		// wrote, instead of unconditionally overwriting it and losing its failed cases.
		const markerRecorded = await recordPendingCleanupFailure(env, userUid, {
			failedCases: failedCaseDetails,
			pendingConfirmationSummary,
		});

		if (!markerRecorded) {
			// Without a durable marker, finalizing would orphan case data with no account left to find it.
			throw new Error(
				'Account deletion blocked: cleanup failed and the durable cleanup marker could not be recorded. Please retry account deletion.',
			);
		}

		console.error(
			`Account deletion for ${userUid} proceeding with pending-cleanup marker recorded: ${caseCleanupErrors.join(' | ') || 'confirmation summary only'}`,
		);
	}

	await deleteFirebaseAuthUser(env, userUid);

	if (pendingCleanup) {
		// Recorded before USER_DB.delete so a failure past this point still leaves the
		// sweep a durable signal that the account's auth user is already gone.
		const flaggedFirebaseDeleted = await markPendingCleanupFirebaseAuthDeleted(env, userUid);
		if (!flaggedFirebaseDeleted) {
			console.error(
				`CRITICAL: account ${userUid}'s Firebase Auth user was deleted but its pending-cleanup marker could not be flagged; the sweep will fall back to a live Firebase lookup.`,
			);
		}
	}

	await env.USER_DB.delete(userUid);

	if (pendingCleanup) {
		// Only now that the account is actually gone is it safe for the sweep to
		// treat the marker's case data as orphaned rather than belonging to a live account.
		const flagged = await markPendingCleanupAuthDeletionComplete(env, userUid);
		if (!flagged) {
			console.error(
				`CRITICAL: account ${userUid} was deleted but its pending-cleanup marker could not be flagged as finalized. The sweep will leave its case data untouched until this is resolved manually.`,
			);
		}
	}

	return {
		success: true,
		pendingCleanup,
		message: pendingCleanup
			? `Account deleted; some cleanup was deferred and queued for automatic retry: ${caseCleanupErrors.join(' | ') || 'confirmation summary metadata'}`
			: 'Account successfully deleted',
		totalCases,
		completedCases,
	};
}
