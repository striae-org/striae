import { decryptJsonFromUserKv, type UserKvEncryptedRecord } from '../encryption-utils';
import type {
  DecryptionTelemetryOutcome,
  Env,
  PrivateKeyRegistry
} from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function parseUserKvPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'user-kv',
    env.USER_KV_ENCRYPTION_ACTIVE_KEY_ID
  );
}

function buildPrivateKeyCandidates(
  recordKeyId: string,
  registry: PrivateKeyRegistry
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

  appendCandidate(getNonEmptyString(recordKeyId));
  appendCandidate(registry.activeKeyId);

  for (const keyId of Object.keys(registry.keys)) {
    appendCandidate(keyId);
  }

  return candidates;
}

function logUserKvDecryptionTelemetry(input: {
  recordKeyId: string;
  selectedKeyId: string | null;
  attemptCount: number;
  outcome: DecryptionTelemetryOutcome;
  reason?: string;
}): void {
  const details = {
    scope: 'user-kv',
    recordKeyId: input.recordKeyId,
    selectedKeyId: input.selectedKeyId,
    attemptCount: input.attemptCount,
    fallbackUsed: input.outcome === 'fallback-hit',
    outcome: input.outcome,
    reason: input.reason ?? null
  };

  if (input.outcome === 'all-failed') {
    console.warn('Key registry decryption failed', details);
    return;
  }

  console.info('Key registry decryption resolved', details);
}

export async function decryptUserKvRecord(
  encryptedRecord: UserKvEncryptedRecord,
  registry: PrivateKeyRegistry
): Promise<string> {
  const candidates = buildPrivateKeyCandidates(encryptedRecord.keyId, registry);
  const primaryKeyId = candidates[0]?.keyId ?? null;
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const decryptedJson = await decryptJsonFromUserKv(encryptedRecord, candidate.privateKeyPem);
      logUserKvDecryptionTelemetry({
        recordKeyId: encryptedRecord.keyId,
        selectedKeyId: candidate.keyId,
        attemptCount: index + 1,
        outcome: candidate.keyId === primaryKeyId ? 'primary-hit' : 'fallback-hit'
      });
      return decryptedJson;
    } catch (error) {
      lastError = error;
    }
  }

  logUserKvDecryptionTelemetry({
    recordKeyId: encryptedRecord.keyId,
    selectedKeyId: null,
    attemptCount: candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt user KV record after ${candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}