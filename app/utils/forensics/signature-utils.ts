import paths from '~/config/config.json';

export interface SignatureEnvelope {
  algorithm: string;
  keyId: string;
  value: string;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  keyId?: string;
  error?: string;
}

export interface SignatureVerificationMessages {
  unsupportedAlgorithmPrefix?: string;
  missingKeyOrValueError?: string;
  noVerificationKeyPrefix?: string;
  invalidPublicKeyError?: string;
  verificationFailedError?: string;
}

export interface SignatureVerificationOptions {
  verificationPublicKeyPem?: string;
}

export interface PublicSigningKeyDetails {
  keyId: string | null;
  publicKeyPem: string | null;
}

interface VerificationKeyCandidate {
  keyId: string;
  publicKeyPem: string;
}

const RSA_PSS_SALT_LENGTH = 32;

type ManifestSigningConfig = {
  manifest_signing_public_keys?: Record<string, string>;
  manifest_signing_public_key?: string;
  manifest_signing_key_id?: string;
};

function normalizePemPublicKey(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
}

function normalizePemOrNull(pem: unknown): string | null {
  if (typeof pem !== 'string' || pem.trim().length === 0) {
    return null;
  }

  return normalizePemPublicKey(pem);
}

function sanitizeKeyIdForFileName(keyId: string): string {
  return keyId.trim().replace(/[^a-z0-9_-]+/gi, '-');
}

export function createPublicSigningKeyFileName(keyId?: string | null): string {
  if (typeof keyId === 'string' && keyId.trim().length > 0) {
    return `striae-public-signing-key-${sanitizeKeyIdForFileName(keyId)}.pem`;
  }

  return 'striae-public-signing-key.pem';
}

export function getCurrentPublicSigningKeyDetails(): PublicSigningKeyDetails {
  const config = paths as unknown as ManifestSigningConfig;
  const configuredKeyId =
    typeof config.manifest_signing_key_id === 'string' && config.manifest_signing_key_id.trim().length > 0
      ? config.manifest_signing_key_id
      : null;

  if (configuredKeyId) {
    const configuredKey = getVerificationPublicKey(configuredKeyId);
    if (configuredKey) {
      return {
        keyId: configuredKeyId,
        publicKeyPem: configuredKey
      };
    }
  }

  const keyMap = config.manifest_signing_public_keys;
  if (keyMap && typeof keyMap === 'object') {
    const firstConfiguredEntry = Object.entries(keyMap).find(
      ([, value]) => typeof value === 'string' && value.trim().length > 0
    );

    if (firstConfiguredEntry) {
      return {
        keyId: firstConfiguredEntry[0],
        publicKeyPem: normalizePemPublicKey(firstConfiguredEntry[1])
      };
    }
  }

  return {
    keyId: null,
    publicKeyPem: normalizePemOrNull(config.manifest_signing_public_key)
  };
}

function publicKeyPemToArrayBuffer(publicKeyPem: string, invalidPublicKeyError: string): ArrayBuffer {
  const normalized = normalizePemPublicKey(publicKeyPem);
  const pemBody = normalized
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error(invalidPublicKeyError);
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

export function getVerificationPublicKey(keyId: string): string | null {
  const config = paths as unknown as ManifestSigningConfig;
  const keyMap = config.manifest_signing_public_keys;

  if (keyMap && typeof keyMap === 'object') {
    const mappedKey = keyMap[keyId];
    if (typeof mappedKey === 'string' && mappedKey.trim().length > 0) {
      return normalizePemPublicKey(mappedKey);
    }
  }

  if (
    typeof config.manifest_signing_key_id === 'string' &&
    config.manifest_signing_key_id === keyId &&
    typeof config.manifest_signing_public_key === 'string' &&
    config.manifest_signing_public_key.trim().length > 0
  ) {
    return normalizePemPublicKey(config.manifest_signing_public_key);
  }

  return null;
}

function getVerificationPublicKeyCandidates(signatureKeyId: string): VerificationKeyCandidate[] {
  const config = paths as unknown as ManifestSigningConfig;
  const keyMap = config.manifest_signing_public_keys;
  const candidates: VerificationKeyCandidate[] = [];
  const seenKeyIds = new Set<string>();

  const appendCandidate = (keyId: string | null, publicKeyPem: string | null): void => {
    if (!keyId || !publicKeyPem || seenKeyIds.has(keyId)) {
      return;
    }

    seenKeyIds.add(keyId);
    candidates.push({ keyId, publicKeyPem });
  };

  appendCandidate(signatureKeyId, getVerificationPublicKey(signatureKeyId));

  const configuredKeyId =
    typeof config.manifest_signing_key_id === 'string' && config.manifest_signing_key_id.trim().length > 0
      ? config.manifest_signing_key_id.trim()
      : null;
  const legacyPublicKeyPem = normalizePemOrNull(config.manifest_signing_public_key);

  appendCandidate(configuredKeyId, configuredKeyId ? getVerificationPublicKey(configuredKeyId) : legacyPublicKeyPem);

  if (keyMap && typeof keyMap === 'object') {
    const orderedEntries = Object.entries(keyMap)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .sort(([leftKeyId], [rightKeyId]) => leftKeyId.localeCompare(rightKeyId));

    for (const [keyId, pemValue] of orderedEntries) {
      appendCandidate(keyId, normalizePemPublicKey(pemValue));
    }
  }

  if (candidates.length === 0 && legacyPublicKeyPem) {
    appendCandidate(configuredKeyId ?? signatureKeyId, legacyPublicKeyPem);
  }

  return candidates;
}

async function verifyWithPublicKey(
  payload: string,
  signatureValue: string,
  publicKeyPem: string,
  invalidPublicKeyError: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'spki',
    publicKeyPemToArrayBuffer(publicKeyPem, invalidPublicKeyError),
    {
      name: 'RSA-PSS',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );

  const signatureBytes = base64UrlToUint8Array(signatureValue);
  const signatureBuffer = new Uint8Array(signatureBytes.byteLength);
  signatureBuffer.set(signatureBytes);

  return crypto.subtle.verify(
    {
      name: 'RSA-PSS',
      saltLength: RSA_PSS_SALT_LENGTH
    },
    key,
    signatureBuffer,
    new TextEncoder().encode(payload)
  );
}

export async function verifySignaturePayload(
  payload: string,
  signature: SignatureEnvelope,
  expectedAlgorithm: string,
  messages: SignatureVerificationMessages = {},
  options: SignatureVerificationOptions = {}
): Promise<SignatureVerificationResult> {
  if (signature.algorithm !== expectedAlgorithm) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `${messages.unsupportedAlgorithmPrefix || 'Unsupported signature algorithm'}: ${signature.algorithm}`
    };
  }

  if (!signature.keyId || !signature.value) {
    return {
      isValid: false,
      error: messages.missingKeyOrValueError || 'Missing signature key ID or value'
    };
  }

  const verificationFailedError = messages.verificationFailedError || 'Signature verification failed';
  const invalidPublicKeyError =
    messages.invalidPublicKeyError ||
    `${verificationFailedError}: invalid public key`;

  const explicitVerificationKey =
    typeof options.verificationPublicKeyPem === 'string' && options.verificationPublicKeyPem.trim().length > 0
      ? options.verificationPublicKeyPem
      : null;
  const keyCandidates = explicitVerificationKey
    ? [{ keyId: signature.keyId, publicKeyPem: explicitVerificationKey }]
    : getVerificationPublicKeyCandidates(signature.keyId);

  if (keyCandidates.length === 0) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `${messages.noVerificationKeyPrefix || 'No verification key configured for key ID'}: ${signature.keyId}`
    };
  }

  let lastError: unknown;

  for (const candidate of keyCandidates) {
    try {
      const verified = await verifyWithPublicKey(payload, signature.value, candidate.publicKeyPem, invalidPublicKeyError);
      if (verified) {
        return {
          isValid: true,
          keyId: signature.keyId
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return {
    isValid: false,
    keyId: signature.keyId,
    error: lastError instanceof Error ? lastError.message : verificationFailedError
  };
}
