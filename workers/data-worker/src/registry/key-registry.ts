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
  KeyRegistryPayload,
  PrivateKeyRegistry
} from '../types';

function normalizePrivateKeyPem(rawValue: string): string {
  return rawValue.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

export function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parsePrivateKeyRegistry(input: {
  registryJson: string | undefined;
  activeKeyId: string | undefined;
  legacyKeyId: string | undefined;
  legacyPrivateKey: string | undefined;
  context: string;
}): PrivateKeyRegistry {
  const keys: Record<string, string> = {};
  const configuredActiveKeyId = getNonEmptyString(input.activeKeyId);
  const registryJson = getNonEmptyString(input.registryJson);

  if (registryJson) {
    let parsedRegistry: unknown;

    try {
      parsedRegistry = JSON.parse(registryJson) as unknown;
    } catch {
      throw new Error(`${input.context} registry JSON is invalid`);
    }

    if (!parsedRegistry || typeof parsedRegistry !== 'object') {
      throw new Error(`${input.context} registry JSON must be an object`);
    }

    const payload = parsedRegistry as KeyRegistryPayload;
    const payloadActiveKeyId = getNonEmptyString(payload.activeKeyId);
    const rawKeys = payload.keys && typeof payload.keys === 'object'
      ? payload.keys as Record<string, unknown>
      : parsedRegistry as Record<string, unknown>;

    for (const [keyId, pemValue] of Object.entries(rawKeys)) {
      if (keyId === 'activeKeyId' || keyId === 'keys') {
        continue;
      }

      const normalizedKeyId = getNonEmptyString(keyId);
      const normalizedPem = getNonEmptyString(pemValue);

      if (!normalizedKeyId || !normalizedPem) {
        continue;
      }

      keys[normalizedKeyId] = normalizePrivateKeyPem(normalizedPem);
    }

    const resolvedActiveKeyId = configuredActiveKeyId ?? payloadActiveKeyId;

    if (Object.keys(keys).length === 0) {
      throw new Error(`${input.context} registry does not contain any usable keys`);
    }

    if (resolvedActiveKeyId && !keys[resolvedActiveKeyId]) {
      throw new Error(`${input.context} active key ID is not present in registry`);
    }

    return {
      activeKeyId: resolvedActiveKeyId ?? null,
      keys
    };
  }

  const legacyKeyId = getNonEmptyString(input.legacyKeyId);
  const legacyPrivateKey = getNonEmptyString(input.legacyPrivateKey);

  if (!legacyKeyId || !legacyPrivateKey) {
    throw new Error(`${input.context} private key registry is not configured`);
  }

  keys[legacyKeyId] = normalizePrivateKeyPem(legacyPrivateKey);
  const resolvedActiveKeyId = configuredActiveKeyId ?? legacyKeyId;

  return {
    activeKeyId: resolvedActiveKeyId,
    keys
  };
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

function getDataAtRestPrivateKeyRegistry(env: Env): PrivateKeyRegistry {
  return parsePrivateKeyRegistry({
    registryJson: env.DATA_AT_REST_ENCRYPTION_KEYS_JSON,
    activeKeyId: env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID,
    legacyKeyId: env.DATA_AT_REST_ENCRYPTION_KEY_ID,
    legacyPrivateKey: env.DATA_AT_REST_ENCRYPTION_PRIVATE_KEY,
    context: 'Data-at-rest decryption'
  });
}

function getExportPrivateKeyRegistry(env: Env): PrivateKeyRegistry {
  return parsePrivateKeyRegistry({
    registryJson: env.EXPORT_ENCRYPTION_KEYS_JSON,
    activeKeyId: env.EXPORT_ENCRYPTION_ACTIVE_KEY_ID,
    legacyKeyId: env.EXPORT_ENCRYPTION_KEY_ID,
    legacyPrivateKey: env.EXPORT_ENCRYPTION_PRIVATE_KEY,
    context: 'Export decryption'
  });
}

export function getManifestSigningKeyContext(env: Env): { keyId: string; privateKeyPem: string } {
  const keyRegistry = parsePrivateKeyRegistry({
    registryJson: env.MANIFEST_SIGNING_KEYS_JSON,
    activeKeyId: env.MANIFEST_SIGNING_ACTIVE_KEY_ID,
    legacyKeyId: env.MANIFEST_SIGNING_KEY_ID,
    legacyPrivateKey: env.MANIFEST_SIGNING_PRIVATE_KEY,
    context: 'Manifest signing'
  });

  const legacyKeyId = getNonEmptyString(env.MANIFEST_SIGNING_KEY_ID);
  const resolvedKeyId = keyRegistry.activeKeyId ?? legacyKeyId;

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

export function buildExportDecryptionContext(keyId: string | null, env: Env): ExportDecryptionContext {
  const keyRegistry = getExportPrivateKeyRegistry(env);
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
  const keyRegistry = getDataAtRestPrivateKeyRegistry(env);
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