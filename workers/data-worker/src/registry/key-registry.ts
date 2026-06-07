import {
  decryptExportData,
  decryptImageBlob,
  decryptJsonFromStorage,
  type DataAtRestEnvelope
} from '../encryption-utils';
import type {
  DecryptionTelemetryOutcome,
  Env,
  ExportDecryptionContext,
  PrivateKeyRegistry
} from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

export function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildPrivateKeyCandidates(
  recordKeyId: string | null,
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

  appendCandidate(recordKeyId);
  appendCandidate(registry.activeKeyId);

  for (const keyId of Object.keys(registry.keys)) {
    appendCandidate(keyId);
  }

  return candidates;
}

function logRegistryDecryptionTelemetry(input: {
  scope: 'data-at-rest' | 'export-data' | 'export-image';
  recordKeyId: string | null;
  selectedKeyId: string | null;
  attemptCount: number;
  outcome: DecryptionTelemetryOutcome;
  reason?: string;
}): void {
  const details = {
    scope: input.scope,
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

async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'data-at-rest',
    env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID
  );
}

async function getExportPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'export-encryption',
    env.EXPORT_ENCRYPTION_ACTIVE_KEY_ID
  );
}

export async function getManifestSigningKeyContext(env: Env): Promise<{ keyId: string; privateKeyPem: string }> {
  const keyRegistry = await fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'manifest-signing',
    env.MANIFEST_SIGNING_ACTIVE_KEY_ID
  );

  const resolvedKeyId = keyRegistry.activeKeyId;

  if (!resolvedKeyId) {
    throw new Error('Manifest signing active key ID is not configured');
  }

  const privateKeyPem = keyRegistry.keys[resolvedKeyId];
  if (!privateKeyPem) {
    throw new Error('Manifest signing active key ID is not present in key registry');
  }

  return {
    keyId: resolvedKeyId,
    privateKeyPem
  };
}

export async function buildExportDecryptionContext(keyId: string | null, env: Env): Promise<ExportDecryptionContext> {
  const keyRegistry = await getExportPrivateKeyRegistry(env);
  const candidates = buildPrivateKeyCandidates(keyId, keyRegistry);

  if (candidates.length === 0) {
    throw new Error('Export decryption key registry does not contain any usable keys');
  }

  return {
    recordKeyId: keyId,
    candidates,
    primaryKeyId: candidates[0]?.keyId ?? null
  };
}

export async function decryptJsonFromStorageWithRegistry(
  ciphertext: ArrayBuffer,
  envelope: DataAtRestEnvelope,
  env: Env
): Promise<string> {
  const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
  const candidates = buildPrivateKeyCandidates(getNonEmptyString(envelope.keyId), keyRegistry);
  const primaryKeyId = candidates[0]?.keyId ?? null;
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const plaintext = await decryptJsonFromStorage(ciphertext, envelope, candidate.privateKeyPem);
      logRegistryDecryptionTelemetry({
        scope: 'data-at-rest',
        recordKeyId: getNonEmptyString(envelope.keyId),
        selectedKeyId: candidate.keyId,
        attemptCount: index + 1,
        outcome: candidate.keyId === primaryKeyId ? 'primary-hit' : 'fallback-hit'
      });
      return plaintext;
    } catch (error) {
      lastError = error;
    }
  }

  logRegistryDecryptionTelemetry({
    scope: 'data-at-rest',
    recordKeyId: getNonEmptyString(envelope.keyId),
    selectedKeyId: null,
    attemptCount: candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt stored data after ${candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}

export async function decryptExportDataWithRegistry(
  encryptedDataBase64: string,
  wrappedKeyBase64: string,
  ivBase64: string,
  context: ExportDecryptionContext
): Promise<string> {
  let lastError: unknown;

  for (let index = 0; index < context.candidates.length; index += 1) {
    const candidate = context.candidates[index];
    try {
      const plaintext = await decryptExportData(
        encryptedDataBase64,
        wrappedKeyBase64,
        ivBase64,
        candidate.privateKeyPem
      );
      logRegistryDecryptionTelemetry({
        scope: 'export-data',
        recordKeyId: context.recordKeyId,
        selectedKeyId: candidate.keyId,
        attemptCount: index + 1,
        outcome: candidate.keyId === context.primaryKeyId ? 'primary-hit' : 'fallback-hit'
      });
      return plaintext;
    } catch (error) {
      lastError = error;
    }
  }

  logRegistryDecryptionTelemetry({
    scope: 'export-data',
    recordKeyId: context.recordKeyId,
    selectedKeyId: null,
    attemptCount: context.candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt export payload after ${context.candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}

export async function decryptExportImageWithRegistry(
  encryptedImageBase64: string,
  wrappedKeyBase64: string,
  ivBase64: string,
  context: ExportDecryptionContext
): Promise<Blob> {
  let lastError: unknown;

  for (let index = 0; index < context.candidates.length; index += 1) {
    const candidate = context.candidates[index];
    try {
      const imageBlob = await decryptImageBlob(
        encryptedImageBase64,
        wrappedKeyBase64,
        ivBase64,
        candidate.privateKeyPem
      );
      logRegistryDecryptionTelemetry({
        scope: 'export-image',
        recordKeyId: context.recordKeyId,
        selectedKeyId: candidate.keyId,
        attemptCount: index + 1,
        outcome: candidate.keyId === context.primaryKeyId ? 'primary-hit' : 'fallback-hit'
      });
      return imageBlob;
    } catch (error) {
      lastError = error;
    }
  }

  logRegistryDecryptionTelemetry({
    scope: 'export-image',
    recordKeyId: context.recordKeyId,
    selectedKeyId: null,
    attemptCount: context.candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt export image after ${context.candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}

export function isDataAtRestEncryptionEnabled(env: Env): boolean {
  const value = env.DATA_AT_REST_ENCRYPTION_ENABLED;
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === '1' || normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === 'on';
}

export function extractDataAtRestEnvelope(file: R2ObjectBody): DataAtRestEnvelope | null {
  const metadata = file.customMetadata;
  if (!metadata) {
    return null;
  }

  const {
    algorithm,
    encryptionVersion,
    keyId,
    dataIv,
    wrappedKey
  } = metadata;

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
    wrappedKey
  };
}