import type { DataAtRestEnvelope } from '../encryption-utils';

export function extractEnvelope(file: R2ObjectBody): DataAtRestEnvelope | null {
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
    wrappedKey
  };
}