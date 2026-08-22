import { encryptJsonForStorage, type DataAtRestEnvelope } from '../encryption-utils';
import type { Env, PrivateKeyRegistry } from '../types';
import { decryptWithKeyRegistry, extractDataAtRestEnvelope, getDataAtRestPrivateKeyRegistry } from './case-data-reader';

export const PENDING_CLEANUP_PREFIX = '_pending-cleanup/';

export interface PendingCaseCleanupMarker {
	userUid: string;
	recordedAt: string;
	failedCases: { caseNumber: string; message: string }[];
	pendingConfirmationSummary: boolean;
	attempts: number;
	lastAttemptAt?: string;
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

		return { marker: parsed, etag: file.etag };
	} catch (error) {
		console.warn(`Unable to read pending-cleanup marker ${key}, skipping this run:`, error);
		return null;
	}
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
 * Deletes the marker only if its etag still matches `expectedEtag` as of a
 * conditional read taken immediately beforehand. R2 `delete` has no `onlyIf`
 * support, so this narrows (but cannot fully close) the race window between
 * the check and the delete call; a concurrent writer landing in that gap
 * would still be lost. Returns false without deleting if the etag no longer
 * matches, i.e. a newer marker already replaced this one.
 */
export async function deletePendingCleanupMarkerIfUnchanged(env: Env, key: string, expectedEtag: string): Promise<boolean> {
	const current = await env.STRIAE_DATA.get(key, { onlyIf: { etagMatches: expectedEtag } });
	if (!current || !('body' in current)) {
		return false;
	}

	await env.STRIAE_DATA.delete(key);
	return true;
}
