import { DATA_AT_REST_ENCRYPTION_ALGORITHM, DATA_AT_REST_ENCRYPTION_VERSION } from '../config';
import type { DataAtRestEnvelope, Env, PrivateKeyRegistry } from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';
import { buildPrivateKeyCandidates, logKeyRegistryDecryptionTelemetry } from '../../../../shared/registry/key-candidates';
import { encryptBytesForStorage, decryptBytesFromStorage } from '../../../../shared/crypto/rsa-oaep-private';

async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
	return fetchKeyRegistryFromR2(env.STRIAE_CONFIG, 'data-at-rest', env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID, env.REGISTRY_ENCRYPTION_KEY);
}

export async function decryptAuditJsonWithRegistry(ciphertext: ArrayBuffer, envelope: DataAtRestEnvelope, env: Env): Promise<string> {
	const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
	const candidates = buildPrivateKeyCandidates(envelope.keyId, keyRegistry);
	const primaryKeyId = candidates[0]?.keyId ?? null;
	let lastError: unknown;

	for (let index = 0; index < candidates.length; index += 1) {
		const candidate = candidates[index];
		try {
			const plaintextBytes = await decryptBytesFromStorage(ciphertext, envelope, candidate.privateKeyPem);
			const plaintext = new TextDecoder().decode(plaintextBytes);
			logKeyRegistryDecryptionTelemetry({
				scope: 'audit-at-rest',
				recordKeyId: envelope.keyId,
				selectedKeyId: candidate.keyId,
				attemptCount: index + 1,
				outcome: candidate.keyId === primaryKeyId ? 'primary-hit' : 'fallback-hit',
			});
			return plaintext;
		} catch (error) {
			lastError = error;
		}
	}

	logKeyRegistryDecryptionTelemetry({
		scope: 'audit-at-rest',
		recordKeyId: envelope.keyId,
		selectedKeyId: null,
		attemptCount: candidates.length,
		outcome: 'all-failed',
		reason: lastError instanceof Error ? lastError.message : 'unknown decryption error',
	});

	throw new Error(
		`Failed to decrypt audit record after ${candidates.length} key attempt(s): ${
			lastError instanceof Error ? lastError.message : 'unknown decryption error'
		}`,
	);
}

export async function encryptJsonForStorage(
	plaintextJson: string,
	publicKeyPem: string,
	keyId: string,
): Promise<{ ciphertext: Uint8Array; envelope: DataAtRestEnvelope }> {
	const plaintextBytes = new TextEncoder().encode(plaintextJson);

	return encryptBytesForStorage(
		plaintextBytes.buffer as ArrayBuffer,
		publicKeyPem,
		keyId,
		DATA_AT_REST_ENCRYPTION_ALGORITHM,
		DATA_AT_REST_ENCRYPTION_VERSION,
	);
}

export function extractDataAtRestEnvelope(file: R2ObjectBody): DataAtRestEnvelope | null {
	const metadata = file.customMetadata;
	if (!metadata) {
		return null;
	}

	const { algorithm, encryptionVersion, keyId, dataIv, wrappedKey } = metadata;

	if (
		typeof algorithm !== 'string' ||
		typeof encryptionVersion !== 'string' ||
		typeof keyId !== 'string' ||
		typeof dataIv !== 'string' ||
		typeof wrappedKey !== 'string'
	) {
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
