// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { Env } from '../types';
import { getDataAtRestPrivateKeyRegistry, readCaseFileIds } from './case-data-reader';

const CASE_DATA_KEY_SUFFIX = '/data.json';

// Files are uploaded to STRIAE_FILES before the referencing case-data.json is written,
// so a short grace period avoids flagging in-flight uploads as orphans.
const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;
// Cursors are not persisted across runs, so a scan that truncates here never reaches
// keys beyond the cap on any later run. Caps are set high (with a matching cpu_ms bump
// in wrangler.jsonc) so a single nightly run can clear realistic bucket sizes outright.
const DEFAULT_MAX_FILE_OBJECTS_PER_RUN = 200000;
const DEFAULT_MAX_DATA_KEYS_PER_RUN = 200000;
// Decrypts/reads case-data records concurrently instead of one at a time.
const REFERENCE_SCAN_CONCURRENCY = 25;

export interface OrphanSweepOptions {
	dryRun?: boolean;
	minAgeMs?: number;
	maxFileObjectsPerRun?: number;
	maxDataKeysPerRun?: number;
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
	dataScanTruncated: boolean;
}

async function collectReferencedFileIds(
	env: Env,
	maxDataKeysPerRun: number,
): Promise<{ referenced: Set<string>; scannedDataKeys: number; truncated: boolean }> {
	const referenced = new Set<string>();
	// Fetched once and reused for every record instead of refetching per case-data key.
	const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
	let scannedDataKeys = 0;
	let truncated = false;
	let cursor: string | undefined;

	dataLoop: do {
		const listed = await env.STRIAE_DATA.list({ cursor, limit: 1000 });
		const candidateKeys = listed.objects.map((obj) => obj.key).filter((key) => key.endsWith(CASE_DATA_KEY_SUFFIX));

		for (let i = 0; i < candidateKeys.length; i += REFERENCE_SCAN_CONCURRENCY) {
			if (scannedDataKeys >= maxDataKeysPerRun) {
				truncated = true;
				break dataLoop;
			}

			const batch = candidateKeys.slice(i, i + REFERENCE_SCAN_CONCURRENCY);
			// readCaseFileIds throws for a record that isn't validly encrypted; that
			// rejection propagates out of collectReferencedFileIds/sweepOrphanedFiles
			// and is caught by runOrphanSweep, so this run deletes nothing rather than
			// treating an unverifiable record as having no file references.
			const batchResults = await Promise.all(batch.map((key) => readCaseFileIds(env, key, keyRegistry)));

			for (const fileIds of batchResults) {
				for (const fileId of fileIds) {
					referenced.add(fileId);
				}
			}
			scannedDataKeys += batch.length;
		}

		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor !== undefined && !truncated);

	return { referenced, scannedDataKeys, truncated };
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
	const maxDataKeysPerRun = options.maxDataKeysPerRun ?? DEFAULT_MAX_DATA_KEYS_PER_RUN;

	const { referenced, scannedDataKeys, truncated: dataScanTruncated } = await collectReferencedFileIds(env, maxDataKeysPerRun);
	// A truncated reference scan means "referenced" may be missing case records we
	// haven't reached yet, so treat this run as read-only to avoid deleting files
	// that are actually still referenced by an unscanned case.
	const skipDeletions = dryRun || dataScanTruncated;

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
			if (skipDeletions) {
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
		truncated,
		dataScanTruncated,
	};
}

export async function runOrphanSweep(env: Env): Promise<void> {
	try {
		const result = await sweepOrphanedFiles(env);
		if (result.dataScanTruncated) {
			console.warn('Orphaned file sweep: reference scan truncated, deletions skipped this run:', result);
		} else if (result.deletionErrors.length > 0 || result.orphanCandidates > 0) {
			console.warn('Orphaned file sweep completed with findings:', result);
		} else {
			console.log('Orphaned file sweep completed, no orphans found:', result);
		}
	} catch (error) {
		console.error('Orphaned file sweep failed:', error);
	}
}
