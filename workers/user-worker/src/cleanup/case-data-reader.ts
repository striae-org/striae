import { decryptJsonFromStorage, type DataAtRestEnvelope } from '../encryption-utils';
import type { Env, PrivateKeyRegistry, StoredCaseData } from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

function getNonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Exported so batch callers (e.g. the orphan sweep) can fetch this once and
// reuse it across many records instead of refetching per case-data key.
export async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
	return fetchKeyRegistryFromR2(env.STRIAE_CONFIG, 'data-at-rest', env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID, env.REGISTRY_ENCRYPTION_KEY);
}

function buildPrivateKeyCandidates(
	recordKeyId: string | null,
	registry: PrivateKeyRegistry,
): Array<{ keyId: string; privateKeyPem: string }> {
	const candidates: Array<{ keyId: string; privateKeyPem: string }> = [];
	const seen = new Set<string>();

	const appendCandidate = (candidateKeyId: string | null): void => {
		if (!candidateKeyId || seen.has(candidateKeyId)) {
			return;
		}

		const privateKeyPem = registry.keys[candidateKeyId];
		if (!privateKeyPem) {
			return;
		}

		seen.add(candidateKeyId);
		candidates.push({ keyId: candidateKeyId, privateKeyPem });
	};

	appendCandidate(recordKeyId);
	appendCandidate(registry.activeKeyId);

	for (const keyId of Object.keys(registry.keys)) {
		appendCandidate(keyId);
	}

	return candidates;
}

export function extractDataAtRestEnvelope(file: R2ObjectBody): DataAtRestEnvelope | null {
	const metadata = file.customMetadata;

	if (!metadata) {
		return null;
	}

	const algorithm = getNonEmptyString(metadata.algorithm);
	const encryptionVersion = getNonEmptyString(metadata.encryptionVersion);
	const keyId = getNonEmptyString(metadata.keyId);
	const dataIv = getNonEmptyString(metadata.dataIv);
	const wrappedKey = getNonEmptyString(metadata.wrappedKey);

	if (!algorithm || !encryptionVersion || !keyId || !dataIv || !wrappedKey) {
		return null;
	}

	return {
		algorithm,
		encryptionVersion,
		keyId,
		dataIv,
		wrappedKey,
	};
}

// Exported so other STRIAE_DATA readers (e.g. pending-cleanup markers) can reuse the same
// key-rotation-aware fallback logic instead of duplicating it.
export async function decryptWithKeyRegistry(
	ciphertext: ArrayBuffer,
	envelope: DataAtRestEnvelope,
	keyRegistry: PrivateKeyRegistry,
): Promise<string> {
	const candidates = buildPrivateKeyCandidates(getNonEmptyString(envelope.keyId), keyRegistry);
	let lastError: unknown;

	for (const candidate of candidates) {
		try {
			return await decryptJsonFromStorage(ciphertext, envelope, candidate.privateKeyPem);
		} catch (error) {
			lastError = error;
		}
	}

	throw new Error(
		`Failed to decrypt after ${candidates.length} key attempt(s): ${
			lastError instanceof Error ? lastError.message : 'unknown decryption error'
		}`,
	);
}

function extractFileIdFromEntry(file: unknown): string | null {
	if (!file || typeof file !== 'object') {
		return null;
	}

	const record = file as { id?: unknown; fileData?: { id?: unknown } };
	return getNonEmptyString(record.id) ?? getNonEmptyString(record.fileData?.id);
}

function extractFileIdsFromCaseData(caseData: StoredCaseData): string[] {
	const allFileEntries = [
		...(Array.isArray(caseData.files) ? caseData.files : []),
		...(Array.isArray(caseData.otherFiles) ? caseData.otherFiles : []),
	];

	return allFileEntries.map((file) => extractFileIdFromEntry(file)).filter((fileId): fileId is string => fileId !== null);
}

/**
 * Reads the file IDs referenced by a case-data record, tolerating legacy
 * plaintext records and any decrypt/parse failure. Never throws; callers
 * that need to proceed with deletion or a sweep regardless of record state
 * can treat an empty array as "no known references" rather than an error.
 */
export async function readCaseFileIds(env: Env, caseDataKey: string, keyRegistry?: PrivateKeyRegistry): Promise<string[]> {
	let file: R2ObjectBody | null;
	try {
		file = await env.STRIAE_DATA.get(caseDataKey);
	} catch (error) {
		console.warn(`Unable to read case data object for ${caseDataKey}, continuing without file references:`, error);
		return [];
	}

	if (!file) {
		return [];
	}

	let atRestEnvelope: DataAtRestEnvelope | null;
	try {
		atRestEnvelope = extractDataAtRestEnvelope(file);
	} catch (error) {
		console.warn(`Unable to read case data envelope metadata for ${caseDataKey}, continuing without file references:`, error);
		return [];
	}

	if (!atRestEnvelope) {
		// Legacy/plaintext record with no envelope; best-effort parse so callers still proceed.
		try {
			const parsed = JSON.parse(await file.text()) as StoredCaseData;
			return extractFileIdsFromCaseData(parsed);
		} catch (error) {
			console.warn(`Unable to read legacy case data for ${caseDataKey}, continuing without file references:`, error);
			return [];
		}
	}

	let ciphertext: ArrayBuffer;
	try {
		ciphertext = await file.arrayBuffer();
	} catch (error) {
		// Distinguish a body-read failure from a decrypt/parse failure below.
		console.warn(`Unable to read case data body for ${caseDataKey}, continuing without file references:`, error);
		return [];
	}

	try {
		const registry = keyRegistry ?? (await getDataAtRestPrivateKeyRegistry(env));
		const fileText = await decryptWithKeyRegistry(ciphertext, atRestEnvelope, registry);
		const parsed = JSON.parse(fileText) as StoredCaseData;
		return extractFileIdsFromCaseData(parsed);
	} catch (error) {
		// Never let a decrypt/parse failure block the caller's cleanup/sweep logic.
		console.warn(`Unable to decrypt/parse case data for ${caseDataKey}, continuing without file references:`, error);
		return [];
	}
}
