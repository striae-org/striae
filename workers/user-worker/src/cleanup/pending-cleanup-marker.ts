// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { encryptJsonForStorage, type DataAtRestEnvelope } from '../encryption-utils';
import type { Env, PrivateKeyRegistry } from '../types';
import { decryptWithKeyRegistry, extractDataAtRestEnvelope, getDataAtRestPrivateKeyRegistry } from './case-data-reader';

export const PENDING_CLEANUP_PREFIX = '_pending-cleanup/';

// Marks a marker key as resolved via customMetadata on a conditional put, since R2's
// delete has no onlyIf/CAS support and an unconditional delete could remove a marker a
// concurrent account deletion just replaced.
const TOMBSTONE_METADATA_FLAG = 'tombstone';

export interface PendingCaseCleanupMarker {
	userUid: string;
	recordedAt: string;
	failedCases: { caseNumber: string; message: string }[];
	pendingConfirmationSummary: boolean;
	attempts: number;
	lastAttemptAt?: string;
	/**
	 * False until Firebase Auth + USER_DB deletion have both finalized. The sweep
	 * must never act on case data while this is false, since the account it
	 * belongs to may still be active.
	 */
	authDeletionComplete: boolean;
	/**
	 * True once Firebase Auth deletion alone is confirmed, set durably before
	 * USER_DB.delete runs so a later failure still leaves the sweep a signal
	 * that the account is gone, instead of a marker stuck at authDeletionComplete: false.
	 */
	firebaseAuthDeleted?: boolean;
}

export function markerKeyFor(userUid: string): string {
	return `${PENDING_CLEANUP_PREFIX}${encodeURIComponent(userUid)}.json`;
}

function isPendingCaseCleanupMarker(value: unknown): value is PendingCaseCleanupMarker {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	if (typeof candidate.userUid !== 'string' || typeof candidate.recordedAt !== 'string') {
		return false;
	}

	if (typeof candidate.pendingConfirmationSummary !== 'boolean' || typeof candidate.attempts !== 'number') {
		return false;
	}

	if (candidate.lastAttemptAt !== undefined && typeof candidate.lastAttemptAt !== 'string') {
		return false;
	}

	if (candidate.authDeletionComplete !== undefined && typeof candidate.authDeletionComplete !== 'boolean') {
		return false;
	}

	if (candidate.firebaseAuthDeleted !== undefined && typeof candidate.firebaseAuthDeleted !== 'boolean') {
		return false;
	}

	return (
		Array.isArray(candidate.failedCases) &&
		candidate.failedCases.every(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				typeof (entry as Record<string, unknown>).caseNumber === 'string' &&
				typeof (entry as Record<string, unknown>).message === 'string',
		)
	);
}

/**
 * Persists a marker durably in R2 as a data-at-rest encrypted envelope; returns
 * false (never throws) so the caller can decide whether it's safe to finalize
 * account deletion without one.
 */
export async function writePendingCleanupMarker(env: Env, marker: PendingCaseCleanupMarker): Promise<boolean> {
	if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
		console.error(
			`CRITICAL: data-at-rest encryption is not configured; refusing to write plaintext pending-cleanup marker for user ${marker.userUid}`,
		);
		return false;
	}

	try {
		const encryptedPayload = await encryptJsonForStorage(
			JSON.stringify(marker),
			env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
			env.DATA_AT_REST_ENCRYPTION_KEY_ID,
		);

		await env.STRIAE_DATA.put(markerKeyFor(marker.userUid), encryptedPayload.ciphertext, {
			customMetadata: {
				algorithm: encryptedPayload.envelope.algorithm,
				encryptionVersion: encryptedPayload.envelope.encryptionVersion,
				keyId: encryptedPayload.envelope.keyId,
				dataIv: encryptedPayload.envelope.dataIv,
				wrappedKey: encryptedPayload.envelope.wrappedKey,
			},
		});

		return true;
	} catch (error) {
		console.error(
			`CRITICAL: failed to persist pending-cleanup marker for user ${marker.userUid}; orphaned data may be undiscoverable: ${
				error instanceof Error ? error.message : 'unknown error'
			}`,
		);
		return false;
	}
}

export interface PendingCleanupMarkerRead {
	marker: PendingCaseCleanupMarker;
	etag: string;
}

/**
 * Tolerant read for the sweep job; malformed/missing markers (or ones that
 * fail to decrypt/parse) are treated as absent rather than fatal. The etag is
 * returned so callers can later condition writes/deletes on it, guarding
 * against a concurrent writer (e.g. a fresh account deletion) replacing the
 * same user-keyed marker mid-sweep.
 */
export async function readPendingCleanupMarker(
	env: Env,
	key: string,
	keyRegistry?: PrivateKeyRegistry,
): Promise<PendingCleanupMarkerRead | null> {
	try {
		const file = await env.STRIAE_DATA.get(key);
		if (!file) {
			return null;
		}

		if (file.customMetadata?.[TOMBSTONE_METADATA_FLAG] === 'true') {
			return null;
		}

		const atRestEnvelope: DataAtRestEnvelope | null = extractDataAtRestEnvelope(file);
		if (!atRestEnvelope) {
			console.warn(`Pending-cleanup marker ${key} has no data-at-rest envelope, skipping this run.`);
			return null;
		}

		const ciphertext = await file.arrayBuffer();
		const registry = keyRegistry ?? (await getDataAtRestPrivateKeyRegistry(env));
		const plaintext = await decryptWithKeyRegistry(ciphertext, atRestEnvelope, registry);

		const parsed: unknown = JSON.parse(plaintext);
		if (!isPendingCaseCleanupMarker(parsed)) {
			console.warn(`Pending-cleanup marker ${key} has an unexpected shape, skipping this run.`);
			return null;
		}

		return {
			marker: { ...parsed, authDeletionComplete: parsed.authDeletionComplete ?? false, firebaseAuthDeleted: parsed.firebaseAuthDeleted ?? false },
			etag: file.etag,
		};
	} catch (error) {
		console.warn(`Unable to read pending-cleanup marker ${key}, skipping this run:`, error);
		return null;
	}
}

/**
 * Flags a marker as safe to sweep once account deletion (Firebase Auth +
 * USER_DB) has actually finalized. Returns false if there was no marker to
 * flag or a concurrent writer replaced it since it was last read; both cases
 * are logged by the caller since the account is already gone at that point.
 */
export async function markPendingCleanupAuthDeletionComplete(env: Env, userUid: string): Promise<boolean> {
	const read = await readPendingCleanupMarker(env, markerKeyFor(userUid));
	if (!read) {
		return false;
	}

	if (read.marker.authDeletionComplete) {
		return true;
	}

	const wrote = await writePendingCleanupMarkerIfUnchanged(env, { ...read.marker, authDeletionComplete: true }, read.etag);
	return wrote !== null;
}

/**
 * Flags a marker once Firebase Auth deletion alone has finalized, ahead of
 * USER_DB.delete, so a failure after this point still leaves the sweep a
 * durable signal that the account's auth user is already gone. Returns false
 * if there was no marker to flag or a concurrent writer replaced it since it
 * was last read.
 */
export async function markPendingCleanupFirebaseAuthDeleted(env: Env, userUid: string): Promise<boolean> {
	const read = await readPendingCleanupMarker(env, markerKeyFor(userUid));
	if (!read) {
		return false;
	}

	if (read.marker.firebaseAuthDeleted) {
		return true;
	}

	const wrote = await writePendingCleanupMarkerIfUnchanged(env, { ...read.marker, firebaseAuthDeleted: true }, read.etag);
	return wrote !== null;
}

/**
 * Writes the marker only if the stored object's etag still matches
 * `expectedEtag`. Returns the new etag on success, or `null` if a concurrent
 * writer already replaced the marker (R2 `put` is the only op R2 supports
 * conditioning atomically; `delete` has no `onlyIf`).
 */
export async function writePendingCleanupMarkerIfUnchanged(
	env: Env,
	marker: PendingCaseCleanupMarker,
	expectedEtag: string,
): Promise<string | null> {
	if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
		console.error(
			`CRITICAL: data-at-rest encryption is not configured; refusing to write plaintext pending-cleanup marker for user ${marker.userUid}`,
		);
		return null;
	}

	try {
		const encryptedPayload = await encryptJsonForStorage(
			JSON.stringify(marker),
			env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
			env.DATA_AT_REST_ENCRYPTION_KEY_ID,
		);

		const result = await env.STRIAE_DATA.put(markerKeyFor(marker.userUid), encryptedPayload.ciphertext, {
			onlyIf: { etagMatches: expectedEtag },
			customMetadata: {
				algorithm: encryptedPayload.envelope.algorithm,
				encryptionVersion: encryptedPayload.envelope.encryptionVersion,
				keyId: encryptedPayload.envelope.keyId,
				dataIv: encryptedPayload.envelope.dataIv,
				wrappedKey: encryptedPayload.envelope.wrappedKey,
			},
		});

		return result?.etag ?? null;
	} catch (error) {
		console.error(
			`CRITICAL: failed to persist pending-cleanup marker for user ${marker.userUid}; orphaned data may be undiscoverable: ${
				error instanceof Error ? error.message : 'unknown error'
			}`,
		);
		return null;
	}
}

/**
 * Resolves the marker by overwriting it with a tombstone, conditioned atomically on
 * `expectedEtag` via `put`'s `onlyIf` (unlike `delete`, which R2 cannot condition).
 * Returns false without writing if a concurrent writer already replaced the marker
 * since it was read, i.e. its newer state is left untouched.
 */
export async function tombstonePendingCleanupMarkerIfUnchanged(env: Env, key: string, expectedEtag: string): Promise<boolean> {
	const result = await env.STRIAE_DATA.put(key, '', {
		onlyIf: { etagMatches: expectedEtag },
		customMetadata: { [TOMBSTONE_METADATA_FLAG]: 'true', tombstonedAt: new Date().toISOString() },
	});

	return result !== null;
}

/**
 * Writes a marker only if no object currently exists at its key, via the
 * standard `If-None-Match: *` conditional header, so a concurrent creator for
 * the same user is detected as a conflict instead of silently overwritten.
 */
export async function writePendingCleanupMarkerIfAbsent(env: Env, marker: PendingCaseCleanupMarker): Promise<string | null> {
	if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
		console.error(
			`CRITICAL: data-at-rest encryption is not configured; refusing to write plaintext pending-cleanup marker for user ${marker.userUid}`,
		);
		return null;
	}

	try {
		const encryptedPayload = await encryptJsonForStorage(
			JSON.stringify(marker),
			env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
			env.DATA_AT_REST_ENCRYPTION_KEY_ID,
		);

		const result = await env.STRIAE_DATA.put(markerKeyFor(marker.userUid), encryptedPayload.ciphertext, {
			onlyIf: new Headers({ 'if-none-match': '*' }),
			customMetadata: {
				algorithm: encryptedPayload.envelope.algorithm,
				encryptionVersion: encryptedPayload.envelope.encryptionVersion,
				keyId: encryptedPayload.envelope.keyId,
				dataIv: encryptedPayload.envelope.dataIv,
				wrappedKey: encryptedPayload.envelope.wrappedKey,
			},
		});

		return result?.etag ?? null;
	} catch (error) {
		console.error(
			`CRITICAL: failed to persist pending-cleanup marker for user ${marker.userUid}; orphaned data may be undiscoverable: ${
				error instanceof Error ? error.message : 'unknown error'
			}`,
		);
		return null;
	}
}

function mergeFailedCases(
	existing: { caseNumber: string; message: string }[],
	incoming: { caseNumber: string; message: string }[],
): { caseNumber: string; message: string }[] {
	const merged = new Map(existing.map((entry) => [entry.caseNumber, entry]));
	for (const entry of incoming) {
		merged.set(entry.caseNumber, entry);
	}

	return Array.from(merged.values());
}

const MAX_MERGE_ATTEMPTS = 5;

/**
 * Records a failed account-deletion attempt's case/confirmation-summary
 * failures into the user's pending-cleanup marker, merging into whatever
 * marker (if any) another concurrent deletion attempt for the same user has
 * already written instead of unconditionally overwriting it. Retries the
 * read-merge-write cycle a bounded number of times against concurrent
 * writers before giving up.
 */
export async function recordPendingCleanupFailure(
	env: Env,
	userUid: string,
	update: { failedCases: { caseNumber: string; message: string }[]; pendingConfirmationSummary: boolean },
): Promise<boolean> {
	const key = markerKeyFor(userUid);

	for (let attempt = 0; attempt < MAX_MERGE_ATTEMPTS; attempt++) {
		const existing = await readPendingCleanupMarker(env, key);

		if (!existing) {
			const marker: PendingCaseCleanupMarker = {
				userUid,
				recordedAt: new Date().toISOString(),
				failedCases: update.failedCases,
				pendingConfirmationSummary: update.pendingConfirmationSummary,
				attempts: 0,
				authDeletionComplete: false,
			};

			if ((await writePendingCleanupMarkerIfAbsent(env, marker)) !== null) {
				return true;
			}
			continue;
		}

		const merged: PendingCaseCleanupMarker = {
			...existing.marker,
			recordedAt: new Date().toISOString(),
			failedCases: mergeFailedCases(existing.marker.failedCases, update.failedCases),
			pendingConfirmationSummary: existing.marker.pendingConfirmationSummary || update.pendingConfirmationSummary,
		};

		if ((await writePendingCleanupMarkerIfUnchanged(env, merged, existing.etag)) !== null) {
			return true;
		}
	}

	console.error(`CRITICAL: could not durably record pending-cleanup marker for user ${userUid} after concurrent write conflicts`);
	return false;
}
