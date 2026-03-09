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

type ManifestSigningConfig = {
  manifest_signing_public_keys?: Record<string, string>;
  manifest_signing_public_key?: string;
  manifest_signing_key_id?: string;
};

function normalizePemPublicKey(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
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
      return mappedKey;
    }
  }

  if (
    typeof config.manifest_signing_key_id === 'string' &&
    config.manifest_signing_key_id === keyId &&
    typeof config.manifest_signing_public_key === 'string' &&
    config.manifest_signing_public_key.trim().length > 0
  ) {
    return config.manifest_signing_public_key;
  }

  return null;
}

export async function verifySignaturePayload(
  payload: string,
  signature: SignatureEnvelope,
  expectedAlgorithm: string,
  messages: SignatureVerificationMessages = {}
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

  const publicKeyPem = getVerificationPublicKey(signature.keyId);
  if (!publicKeyPem) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `${messages.noVerificationKeyPrefix || 'No verification key configured for key ID'}: ${signature.keyId}`
    };
  }

  const verificationFailedError = messages.verificationFailedError || 'Signature verification failed';
  const invalidPublicKeyError =
    messages.invalidPublicKeyError ||
    `${verificationFailedError}: invalid public key`;

  try {
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyPemToArrayBuffer(publicKeyPem, invalidPublicKeyError),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlToUint8Array(signature.value);
    const signatureBuffer = new Uint8Array(signatureBytes.byteLength);
    signatureBuffer.set(signatureBytes);

    const verified = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signatureBuffer,
      new TextEncoder().encode(payload)
    );

    return {
      isValid: verified,
      keyId: signature.keyId,
      error: verified ? undefined : verificationFailedError
    };
  } catch (error) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: error instanceof Error ? error.message : verificationFailedError
    };
  }
}
