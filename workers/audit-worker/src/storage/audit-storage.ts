// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { DATA_AT_REST_ENCRYPTION_ALGORITHM, DATA_AT_REST_ENCRYPTION_VERSION } from '../config';
import { decryptAuditJsonWithRegistry, encryptJsonForStorage, extractDataAtRestEnvelope } from '../crypto/data-at-rest';
import type { AuditEntry, Env } from '../types';

export function generateAuditFileName(userId: string, date: Date = new Date()): string {
	const isoDate = date.toISOString().split('T')[0];
	return `audit-trails/${userId}/${isoDate}.json`;
}

export function isValidAuditEntry(entry: unknown): entry is AuditEntry {
	const candidate = entry as Partial<AuditEntry> | null;

	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		typeof candidate.entryId === 'string' &&
		candidate.entryId.trim().length > 0 &&
		typeof candidate.timestamp === 'string' &&
		typeof candidate.userId === 'string' &&
		typeof candidate.action === 'string'
	);
}

export async function readAuditEntriesFromObject(file: R2ObjectBody, env: Env): Promise<AuditEntry[]> {
	const atRestEnvelope = extractDataAtRestEnvelope(file);
	if (!atRestEnvelope) {
		throw new Error('Audit record is not encrypted');
	}

	if (atRestEnvelope.algorithm !== DATA_AT_REST_ENCRYPTION_ALGORITHM) {
		throw new Error('Unsupported data-at-rest encryption algorithm');
	}

	if (atRestEnvelope.encryptionVersion !== DATA_AT_REST_ENCRYPTION_VERSION) {
		throw new Error('Unsupported data-at-rest encryption version');
	}

	const encryptedData = await file.arrayBuffer();
	const plaintext = await decryptAuditJsonWithRegistry(encryptedData, atRestEnvelope, env);

	return JSON.parse(plaintext) as AuditEntry[];
}

export async function writeAuditEntriesToObject(
	bucket: R2Bucket,
	filename: string,
	entries: AuditEntry[],
	env: Env,
	onlyIf?: R2Conditional,
): Promise<R2Object | null> {
	const serializedData = JSON.stringify(entries);

	if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
		throw new Error('Audit encryption is not fully configured');
	}

	const encryptedPayload = await encryptJsonForStorage(
		serializedData,
		env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
		env.DATA_AT_REST_ENCRYPTION_KEY_ID,
	);

	// R2 resolves to null (instead of throwing) when the onlyIf precondition fails
	return bucket.put(filename, encryptedPayload.ciphertext, {
		onlyIf,
		customMetadata: {
			algorithm: encryptedPayload.envelope.algorithm,
			encryptionVersion: encryptedPayload.envelope.encryptionVersion,
			keyId: encryptedPayload.envelope.keyId,
			dataIv: encryptedPayload.envelope.dataIv,
			wrappedKey: encryptedPayload.envelope.wrappedKey,
		},
	});
}

const MAX_APPEND_RETRIES = 5;

export async function appendAuditEntry(
	bucket: R2Bucket,
	filename: string,
	newEntry: AuditEntry,
	env: Env,
): Promise<{ entryCount: number; deduped: boolean }> {
	try {
		for (let attempt = 0; attempt < MAX_APPEND_RETRIES; attempt++) {
			const existingFile = await bucket.get(filename);
			let entries: AuditEntry[] = [];

			if (existingFile) {
				entries = await readAuditEntriesFromObject(existingFile, env);
			}

			// Retry-safe: a previously committed entry with the same entryId is not re-appended
			const isDuplicate = entries.some((entry) => entry.entryId === newEntry.entryId);
			if (isDuplicate) {
				return { entryCount: entries.length, deduped: true };
			}

			entries.push(newEntry);

			// Tie the write to the exact state we read; a concurrent writer changes the etag or creates the object first
			const onlyIf: R2Conditional = existingFile ? { etagMatches: existingFile.etag } : { etagDoesNotMatch: '*' };

			const written = await writeAuditEntriesToObject(bucket, filename, entries, env, onlyIf);
			if (written === null) {
				continue; // lost the race; re-read latest state and retry
			}

			return { entryCount: entries.length, deduped: false };
		}

		throw new Error(`Failed to append audit entry after ${MAX_APPEND_RETRIES} attempts due to concurrent writes`);
	} catch (error) {
		console.error('Error appending audit entry:', error);
		throw error;
	}
}
