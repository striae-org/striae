/**
 * Shared R2-based key registry module.
 *
 * Fetches key registries from a shared R2 config bucket instead of
 * environment secrets (which have a 5.1 kB limit per secret).
 *
 * Each scope maps to a separate JSON file in the config bucket:
 *   - 'data-at-rest'       → data-at-rest-keys.json
 *   - 'export-encryption'  → export-encryption-keys.json
 *   - 'manifest-signing'   → manifest-signing-keys.json
 *   - 'user-kv'            → user-kv-encryption-keys.json
 *
 * Registry files are encrypted at rest with AES-256-GCM using
 * REGISTRY_ENCRYPTION_KEY before upload and decrypted on fetch.
 */

import { decryptRegistryJson, isEncryptedEnvelope } from './registry-encryption';

export type KeyRegistryScope =
  | 'data-at-rest'
  | 'export-encryption'
  | 'manifest-signing'
  | 'user-kv';

export interface PrivateKeyRegistry {
  activeKeyId: string | null;
  keys: Record<string, string>;
}

interface KeyRegistryPayload {
  activeKeyId?: unknown;
  keys?: unknown;
}

const SCOPE_FILE_MAP: Record<KeyRegistryScope, string> = {
  'data-at-rest': 'data-at-rest-keys.json',
  'export-encryption': 'export-encryption-keys.json',
  'manifest-signing': 'manifest-signing-keys.json',
  'user-kv': 'user-kv-encryption-keys.json'
};

function normalizePrivateKeyPem(rawValue: string): string {
  return rawValue.trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Fetches and parses a key registry from R2.
 *
 * @param r2Bucket - The STRIAE_CONFIG R2 bucket binding
 * @param scope - Which registry to fetch
 * @param activeKeyIdOverride - Optional env-level override for the active key ID
 * @param registryEncryptionKey - Base64-encoded 32-byte AES-256-GCM key for registry decryption
 * @returns Parsed registry with normalized PEM keys
 * @throws If R2 object is missing, decryption fails, JSON is invalid, or no usable keys found
 */
export async function fetchKeyRegistryFromR2(
  r2Bucket: R2Bucket,
  scope: KeyRegistryScope,
  activeKeyIdOverride: string | undefined,
  registryEncryptionKey: string
): Promise<PrivateKeyRegistry> {
  const filename = SCOPE_FILE_MAP[scope];
  const contextLabel = `${scope} key registry`;

  const object = await r2Bucket.get(filename);
  if (!object) {
    throw new Error(`${contextLabel}: R2 object "${filename}" not found in config bucket`);
  }

  const rawJson = await object.text();
  if (!rawJson || rawJson.trim().length === 0) {
    throw new Error(`${contextLabel}: R2 object "${filename}" is empty`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    throw new Error(`${contextLabel}: R2 object "${filename}" is not valid JSON`);
  }

  if (!isEncryptedEnvelope(parsed)) {
    throw new Error(`${contextLabel}: R2 object "${filename}" is not an encrypted registry envelope`);
  }

  let registryJson: string;
  try {
    registryJson = await decryptRegistryJson(parsed, registryEncryptionKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    throw new Error(`${contextLabel}: failed to decrypt registry — ${message}`);
  }

  return parseRegistryJson(registryJson, scope, activeKeyIdOverride);
}

/**
 * Parses registry JSON (used both for R2-fetched content and legacy env fallback).
 */
export function parseRegistryJson(
  registryJson: string,
  scope: KeyRegistryScope,
  activeKeyIdOverride?: string
): PrivateKeyRegistry {
  const contextLabel = `${scope} key registry`;
  const keys: Record<string, string> = {};
  const configuredActiveKeyId = getNonEmptyString(activeKeyIdOverride);

  let parsedRegistry: unknown;
  try {
    parsedRegistry = JSON.parse(registryJson) as unknown;
  } catch {
    throw new Error(`${contextLabel}: JSON is invalid`);
  }

  if (!parsedRegistry || typeof parsedRegistry !== 'object') {
    throw new Error(`${contextLabel}: JSON must be an object`);
  }

  const payload = parsedRegistry as KeyRegistryPayload;
  const payloadActiveKeyId = getNonEmptyString(payload.activeKeyId);

  // Support both shapes: { activeKeyId, keys: {...} } and flat { keyId: pem }
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
    throw new Error(`${contextLabel}: does not contain any usable keys`);
  }

  if (resolvedActiveKeyId && !keys[resolvedActiveKeyId]) {
    throw new Error(`${contextLabel}: active key ID "${resolvedActiveKeyId}" is not present in registry`);
  }

  return {
    activeKeyId: resolvedActiveKeyId ?? null,
    keys
  };
}
