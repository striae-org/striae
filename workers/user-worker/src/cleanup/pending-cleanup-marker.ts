import type { Env } from '../types';

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

/**
 * Persists a marker durably in R2; returns false (never throws) so the caller
 * can decide whether it's safe to finalize account deletion without one.
 */
export async function writePendingCleanupMarker(env: Env, marker: PendingCaseCleanupMarker): Promise<boolean> {
  try {
    await env.STRIAE_DATA.put(markerKeyFor(marker.userUid), JSON.stringify(marker));
    return true;
  } catch (error) {
    console.error(
      `CRITICAL: failed to persist pending-cleanup marker for user ${marker.userUid}; orphaned data may be undiscoverable: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return false;
  }
}

/**
 * Tolerant read for the sweep job; malformed/missing markers are treated as absent rather than fatal.
 */
export async function readPendingCleanupMarker(env: Env, key: string): Promise<PendingCaseCleanupMarker | null> {
  try {
    const file = await env.STRIAE_DATA.get(key);
    if (!file) {
      return null;
    }

    return JSON.parse(await file.text()) as PendingCaseCleanupMarker;
  } catch (error) {
    console.warn(`Unable to read pending-cleanup marker ${key}, skipping this run:`, error);
    return null;
  }
}

export async function deletePendingCleanupMarker(env: Env, key: string): Promise<void> {
  await env.STRIAE_DATA.delete(key);
}
