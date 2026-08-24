// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { decryptJsonFromUserKv, type UserKvEncryptedRecord } from '../encryption-utils';
import type { Env, PrivateKeyRegistry } from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';
import { buildPrivateKeyCandidates, logKeyRegistryDecryptionTelemetry } from '../../../../shared/registry/key-candidates';

export async function parseUserKvPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
	return fetchKeyRegistryFromR2(env.STRIAE_CONFIG, 'user-kv', env.USER_KV_ENCRYPTION_ACTIVE_KEY_ID, env.REGISTRY_ENCRYPTION_KEY);
}

export async function decryptUserKvRecord(encryptedRecord: UserKvEncryptedRecord, registry: PrivateKeyRegistry): Promise<string> {
	const candidates = buildPrivateKeyCandidates(encryptedRecord.keyId, registry);
	const primaryKeyId = candidates[0]?.keyId ?? null;
	let lastError: unknown;

	for (let index = 0; index < candidates.length; index += 1) {
		const candidate = candidates[index];
		try {
			const decryptedJson = await decryptJsonFromUserKv(encryptedRecord, candidate.privateKeyPem);
			logKeyRegistryDecryptionTelemetry({
				scope: 'user-kv',
				recordKeyId: encryptedRecord.keyId,
				selectedKeyId: candidate.keyId,
				attemptCount: index + 1,
				outcome: candidate.keyId === primaryKeyId ? 'primary-hit' : 'fallback-hit',
			});
			return decryptedJson;
		} catch (error) {
			lastError = error;
		}
	}

	logKeyRegistryDecryptionTelemetry({
		scope: 'user-kv',
		recordKeyId: encryptedRecord.keyId,
		selectedKeyId: null,
		attemptCount: candidates.length,
		outcome: 'all-failed',
		reason: lastError instanceof Error ? lastError.message : 'unknown decryption error',
	});

	throw new Error(
		`Failed to decrypt user KV record after ${candidates.length} key attempt(s): ${
			lastError instanceof Error ? lastError.message : 'unknown decryption error'
		}`,
	);
}
