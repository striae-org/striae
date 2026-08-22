import { deleteSingleCase, deleteUserConfirmationSummary } from './account-deletion';
import {
  deletePendingCleanupMarker,
  PENDING_CLEANUP_PREFIX,
  readPendingCleanupMarker,
  writePendingCleanupMarker
} from './pending-cleanup-marker';
import type { Env } from '../types';

export interface PendingCleanupSweepResult {
  processed: number;
  resolved: number;
  stillFailing: number;
}

/**
 * Retries case-data cleanup (and confirmation-summary deletion) left behind by
 * account deletions that recorded a marker instead of finalizing case cleanup inline.
 */
export async function sweepPendingCaseCleanup(env: Env): Promise<PendingCleanupSweepResult> {
  let processed = 0;
  let resolved = 0;
  let stillFailing = 0;
  let cursor: string | undefined;

  do {
    const listed = await env.STRIAE_DATA.list({ prefix: PENDING_CLEANUP_PREFIX, cursor, limit: 1000 });

    for (const obj of listed.objects) {
      const marker = await readPendingCleanupMarker(env, obj.key);
      if (!marker) {
        continue;
      }

      processed += 1;

      const remainingFailedCases: { caseNumber: string; message: string }[] = [];
      for (const { caseNumber } of marker.failedCases) {
        try {
          await deleteSingleCase(env, marker.userUid, caseNumber);
        } catch (error) {
          remainingFailedCases.push({
            caseNumber,
            message: error instanceof Error ? error.message : 'unknown error'
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
        await deletePendingCleanupMarker(env, obj.key);
        resolved += 1;
        continue;
      }

      stillFailing += 1;
      await writePendingCleanupMarker(env, {
        ...marker,
        failedCases: remainingFailedCases,
        pendingConfirmationSummary,
        attempts: marker.attempts + 1,
        lastAttemptAt: new Date().toISOString()
      });
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor !== undefined);

  return { processed, resolved, stillFailing };
}

export async function runPendingCaseCleanupSweep(env: Env): Promise<void> {
  try {
    const result = await sweepPendingCaseCleanup(env);
    if (result.stillFailing > 0) {
      console.warn('Pending-cleanup sweep completed with unresolved markers:', result);
    } else if (result.processed > 0) {
      console.log('Pending-cleanup sweep resolved all markers:', result);
    }
  } catch (error) {
    console.error('Pending-cleanup sweep failed:', error);
  }
}
