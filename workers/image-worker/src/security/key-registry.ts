import {
  decryptBinaryFromStorage,
  type DataAtRestEnvelope
} from '../encryption-utils';
import type {
  DecryptionTelemetryOutcome,
  Env,
  PrivateKeyRegistry
} from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function requireEncryptionUploadConfig(env: Env): void {
  if (!env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY || !env.DATA_AT_REST_ENCRYPTION_KEY_ID) {
    throw new Error('Data-at-rest encryption is not configured for image uploads');
  }
}

export function requireEncryptionRetrievalConfig(_env: Env): void {
  // Key registry is now fetched from R2 at decryption time.
  // This check is kept for interface compatibility but validation
  // happens when fetchKeyRegistryFromR2 is called.
}

async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'data-at-rest',
    env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID,
    env.REGISTRY_ENCRYPTION_KEY
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

function logFileDecryptionTelemetry(input: {
  recordKeyId: string;
  selectedKeyId: string | null;
  attemptCount: number;
  outcome: DecryptionTelemetryOutcome;
  reason?: string;
}): void {
  const details = {
    scope: 'file-at-rest',
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

export async function decryptBinaryWithRegistry(
  ciphertext: ArrayBuffer,
  envelope: DataAtRestEnvelope,
  env: Env
): Promise<ArrayBuffer> {
  const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
  const candidates = buildPrivateKeyCandidates(envelope.keyId, keyRegistry);
  const primaryKeyId = candidates[0]?.keyId ?? null;
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const plaintext = await decryptBinaryFromStorage(ciphertext, envelope, candidate.privateKeyPem);
      logFileDecryptionTelemetry({
        recordKeyId: envelope.keyId,
        selectedKeyId: candidate.keyId,
        attemptCount: index + 1,
        outcome: candidate.keyId === primaryKeyId ? 'primary-hit' : 'fallback-hit'
      });
      return plaintext;
    } catch (error) {
      lastError = error;
    }
  }

  logFileDecryptionTelemetry({
    recordKeyId: envelope.keyId,
    selectedKeyId: null,
    attemptCount: candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt stored file after ${candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}