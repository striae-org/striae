import { decryptJsonFromStorage, type DataAtRestEnvelope } from '../encryption-utils';
import type { Env, PrivateKeyRegistry, StoredCaseData } from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';
import { buildPrivateKeyCandidates } from '../../../../shared/registry/key-candidates';

function getNonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Exported so batch callers (e.g. the orphan sweep) can fetch this once and
// reuse it across many records instead of refetching per case-data key.
export async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
	return fetchKeyRegistryFromR2(env.STRIAE_CONFIG, 'data-at-rest', env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID, env.REGISTRY_ENCRYPTION_KEY);
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
 * Reads the file IDs referenced by a case-data record. Only [] returns from
 * genuine ambiguity about the object's existence/body (not found, or an I/O
 * failure reading it). This deployment has no unencrypted case data, so a
 * record with a missing/invalid envelope, or one that fails to decrypt/parse,
 * throws instead of returning [] — callers must not treat that as "no known
 * references" and must fail closed (abort deletion/sweep for that record).
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

	const atRestEnvelope = extractDataAtRestEnvelope(file);
	if (!atRestEnvelope) {
		throw new Error(`Case data ${caseDataKey} is missing a valid data-at-rest envelope; refusing to treat it as plaintext.`);
	}

	let ciphertext: ArrayBuffer;
	try {
		ciphertext = await file.arrayBuffer();
	} catch (error) {
		// Distinguish a body-read failure from a decrypt/parse failure below.
		console.warn(`Unable to read case data body for ${caseDataKey}, continuing without file references:`, error);
		return [];
	}

	const registry = keyRegistry ?? (await getDataAtRestPrivateKeyRegistry(env));
	const fileText = await decryptWithKeyRegistry(ciphertext, atRestEnvelope, registry);
	const parsed = JSON.parse(fileText) as StoredCaseData;
	return extractFileIdsFromCaseData(parsed);
}
