import {
  DATA_AT_REST_ENCRYPTION_ALGORITHM,
  DATA_AT_REST_ENCRYPTION_VERSION
} from '../config';
import type {
  DataAtRestEnvelope,
  DecryptionTelemetryOutcome,
  Env,
  PrivateKeyRegistry
} from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'data-at-rest',
    env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID
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

function logAuditDecryptionTelemetry(input: {
  recordKeyId: string;
  selectedKeyId: string | null;
  attemptCount: number;
  outcome: DecryptionTelemetryOutcome;
  reason?: string;
}): void {
  const details = {
    scope: 'audit-at-rest',
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

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;

  for (let i = 0; i < value.length; i += chunkSize) {
    const chunk = value.subarray(i, Math.min(i + chunkSize, value.length));
    for (let j = 0; j < chunk.length; j += 1) {
      binary += String.fromCharCode(chunk[j]);
    }
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parsePkcs8PrivateKey(privateKey: string): ArrayBuffer {
  const normalizedKey = privateKey
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n');

  const pemBody = normalizedKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error('Encryption private key is invalid');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function parseSpkiPublicKey(publicKey: string): ArrayBuffer {
  const normalizedKey = publicKey
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n');

  const pemBody = normalizedKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error('Encryption public key is invalid');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function importRsaOaepPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    parsePkcs8PrivateKey(privateKeyPem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['decrypt']
  );
}

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    parseSpkiPublicKey(publicKeyPem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['encrypt']
  );
}

async function createAesGcmKey(usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    usages
  ) as Promise<CryptoKey>;
}

async function wrapAesKey(aesKey: CryptoKey, publicKeyPem: string): Promise<string> {
  const rsaPublicKey = await importRsaOaepPublicKey(publicKeyPem);
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    rawAesKey as BufferSource
  );

  return base64UrlEncode(new Uint8Array(wrappedKey));
}

async function unwrapAesKey(wrappedKeyBase64: string, privateKeyPem: string): Promise<CryptoKey> {
  const rsaPrivateKey = await importRsaOaepPrivateKey(privateKeyPem);
  const wrappedKeyBytes = base64UrlDecode(wrappedKeyBase64);

  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    wrappedKeyBytes as BufferSource
  );

  return crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
}

async function decryptJsonFromStorage(
  ciphertext: ArrayBuffer,
  envelope: DataAtRestEnvelope,
  privateKeyPem: string
): Promise<string> {
  const aesKey = await unwrapAesKey(envelope.wrappedKey, privateKeyPem);
  const iv = base64UrlDecode(envelope.dataIv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(plaintext);
}

export async function decryptAuditJsonWithRegistry(
  ciphertext: ArrayBuffer,
  envelope: DataAtRestEnvelope,
  env: Env
): Promise<string> {
  const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
  const candidates = buildPrivateKeyCandidates(envelope.keyId, keyRegistry);
  const primaryKeyId = candidates[0]?.keyId ?? null;
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      const plaintext = await decryptJsonFromStorage(ciphertext, envelope, candidate.privateKeyPem);
      logAuditDecryptionTelemetry({
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

  logAuditDecryptionTelemetry({
    recordKeyId: envelope.keyId,
    selectedKeyId: null,
    attemptCount: candidates.length,
    outcome: 'all-failed',
    reason: lastError instanceof Error ? lastError.message : 'unknown decryption error'
  });

  throw new Error(
    `Failed to decrypt audit record after ${candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}

export async function encryptJsonForStorage(
  plaintextJson: string,
  publicKeyPem: string,
  keyId: string
): Promise<{ ciphertext: Uint8Array; envelope: DataAtRestEnvelope }> {
  const aesKey = await createAesGcmKey(['encrypt', 'decrypt']);
  const wrappedKey = await wrapAesKey(aesKey, publicKeyPem);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const plaintextBytes = new TextEncoder().encode(plaintextJson);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    plaintextBytes as BufferSource
  );

  return {
    ciphertext: new Uint8Array(encryptedBuffer),
    envelope: {
      algorithm: DATA_AT_REST_ENCRYPTION_ALGORITHM,
      encryptionVersion: DATA_AT_REST_ENCRYPTION_VERSION,
      keyId,
      dataIv: base64UrlEncode(iv),
      wrappedKey
    }
  };
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
