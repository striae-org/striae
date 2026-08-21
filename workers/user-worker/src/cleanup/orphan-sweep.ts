import type { Env } from '../types';
import { readCaseFileIds } from './case-data-reader';

const CASE_DATA_KEY_SUFFIX = '/data.json';

// Files are uploaded to STRIAE_FILES before the referencing case-data.json is written,
// so a short grace period avoids flagging in-flight uploads as orphans.
const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_FILE_OBJECTS_PER_RUN = 20000;

export interface OrphanSweepOptions {
  dryRun?: boolean;
  minAgeMs?: number;
  maxFileObjectsPerRun?: number;
}

export interface OrphanSweepResult {
  scannedDataKeys: number;
  referencedFileIds: number;
  scannedFileObjects: number;
  orphanCandidates: number;
  deleted: number;
  deletionErrors: string[];
  dryRun: boolean;
  truncated: boolean;
}

async function collectReferencedFileIds(env: Env): Promise<{ referenced: Set<string>; scannedDataKeys: number }> {
  const referenced = new Set<string>();
  let scannedDataKeys = 0;
  let cursor: string | undefined;

  do {
    const listed = await env.STRIAE_DATA.list({ cursor, limit: 1000 });

    for (const obj of listed.objects) {
      if (!obj.key.endsWith(CASE_DATA_KEY_SUFFIX)) {
        continue;
      }

      scannedDataKeys += 1;
      for (const fileId of await readCaseFileIds(env, obj.key)) {
        referenced.add(fileId);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor !== undefined);

  return { referenced, scannedDataKeys };
}

/**
 * Deletes STRIAE_FILES objects that are not referenced by any case-data record.
 * Complements account deletion, which may leave orphaned file blobs behind
 * when per-case cleanup partially fails on legacy/undecryptable records.
 */
export async function sweepOrphanedFiles(env: Env, options: OrphanSweepOptions = {}): Promise<OrphanSweepResult> {
  const dryRun = options.dryRun ?? false;
  const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS;
  const maxFileObjectsPerRun = options.maxFileObjectsPerRun ?? DEFAULT_MAX_FILE_OBJECTS_PER_RUN;

  const { referenced, scannedDataKeys } = await collectReferencedFileIds(env);

  const now = Date.now();
  let scannedFileObjects = 0;
  let orphanCandidates = 0;
  let deleted = 0;
  let truncated = false;
  const deletionErrors: string[] = [];
  let cursor: string | undefined;

  filesLoop: do {
    const listed = await env.STRIAE_FILES.list({ cursor, limit: 1000 });

    for (const obj of listed.objects) {
      if (scannedFileObjects >= maxFileObjectsPerRun) {
        truncated = true;
        break filesLoop;
      }
      scannedFileObjects += 1;

      if (referenced.has(obj.key)) {
        continue;
      }

      const uploadedAtMs = obj.uploaded instanceof Date ? obj.uploaded.getTime() : now;
      if (now - uploadedAtMs < minAgeMs) {
        continue;
      }

      orphanCandidates += 1;
      if (dryRun) {
        continue;
      }

      try {
        await env.STRIAE_FILES.delete(obj.key);
        deleted += 1;
      } catch (error) {
        deletionErrors.push(`file ${obj.key} delete threw (${error instanceof Error ? error.message : 'unknown error'})`);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor !== undefined);

  return {
    scannedDataKeys,
    referencedFileIds: referenced.size,
    scannedFileObjects,
    orphanCandidates,
    deleted,
    deletionErrors,
    dryRun,
    truncated
  };
}

export async function runOrphanSweep(env: Env): Promise<void> {
  try {
    const result = await sweepOrphanedFiles(env);
    if (result.deletionErrors.length > 0 || result.orphanCandidates > 0) {
      console.warn('Orphaned file sweep completed with findings:', result);
    } else {
      console.log('Orphaned file sweep completed, no orphans found:', result);
    }
  } catch (error) {
    console.error('Orphaned file sweep failed:', error);
  }
}
