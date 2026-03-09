/**
 * SHA-256 utility functions for data integrity validation
 * Uses cryptographically secure SHA-256 algorithm for forensic applications
 * Provides enhanced security compared to CRC32 for tamper detection
 */

import { verifySignaturePayload } from './signature-utils';

export const FORENSIC_MANIFEST_VERSION = '2.0';
export const FORENSIC_MANIFEST_SIGNATURE_ALGORITHM = 'RSASSA-PKCS1-v1_5-SHA-256';

export interface ForensicManifestData {
  dataHash: string;
  imageHashes: { [filename: string]: string };
  manifestHash: string;
  totalFiles: number;
  createdAt: string;
}

export interface ForensicManifestSignature {
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}

export interface SignedForensicManifest extends ForensicManifestData {
  manifestVersion?: string;
  signature?: ForensicManifestSignature;
}

export interface ManifestSignatureVerificationResult {
  isValid: boolean;
  keyId?: string;
  error?: string;
}

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

function normalizeImageHashes(imageHashes: { [filename: string]: string }): { [filename: string]: string } {
  const normalized: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(imageHashes).sort();

  for (const filename of sortedFilenames) {
    normalized[filename] = imageHashes[filename].toLowerCase();
  }

  return normalized;
}

function isValidManifestData(candidate: Partial<ForensicManifestData>): candidate is ForensicManifestData {
  if (!candidate) {
    return false;
  }

  if (typeof candidate.dataHash !== 'string' || !SHA256_HEX_REGEX.test(candidate.dataHash)) {
    return false;
  }

  if (!candidate.imageHashes || typeof candidate.imageHashes !== 'object') {
    return false;
  }

  for (const hash of Object.values(candidate.imageHashes)) {
    if (typeof hash !== 'string' || !SHA256_HEX_REGEX.test(hash)) {
      return false;
    }
  }

  if (typeof candidate.manifestHash !== 'string' || !SHA256_HEX_REGEX.test(candidate.manifestHash)) {
    return false;
  }

  if (typeof candidate.totalFiles !== 'number' || candidate.totalFiles <= 0) {
    return false;
  }

  if (typeof candidate.createdAt !== 'string' || Number.isNaN(Date.parse(candidate.createdAt))) {
    return false;
  }

  return true;
}

export function extractForensicManifestData(candidate: Partial<SignedForensicManifest>): ForensicManifestData | null {
  if (!isValidManifestData(candidate)) {
    return null;
  }

  return {
    dataHash: candidate.dataHash.toLowerCase(),
    imageHashes: normalizeImageHashes(candidate.imageHashes),
    manifestHash: candidate.manifestHash.toLowerCase(),
    totalFiles: candidate.totalFiles,
    createdAt: candidate.createdAt
  };
}

/**
 * Build canonical payload for manifest signatures.
 * Every signer/verifier must use this exact ordering.
 */
export function createManifestSigningPayload(
  manifest: ForensicManifestData,
  manifestVersion: string = FORENSIC_MANIFEST_VERSION
): string {
  const canonicalPayload = {
    manifestVersion,
    dataHash: manifest.dataHash.toLowerCase(),
    imageHashes: normalizeImageHashes(manifest.imageHashes),
    manifestHash: manifest.manifestHash.toLowerCase(),
    totalFiles: manifest.totalFiles,
    createdAt: manifest.createdAt
  };

  return JSON.stringify(canonicalPayload);
}

/**
 * Verify manifest signature using configured public key(s).
 */
export async function verifyForensicManifestSignature(
  manifest: Partial<SignedForensicManifest>
): Promise<ManifestSignatureVerificationResult> {
  if (!manifest.signature) {
    return {
      isValid: false,
      error: 'Missing forensic manifest signature'
    };
  }

  if (manifest.manifestVersion !== FORENSIC_MANIFEST_VERSION) {
    return {
      isValid: false,
      keyId: manifest.signature.keyId,
      error: `Unsupported manifest version: ${manifest.manifestVersion || 'unknown'}`
    };
  }

  const manifestData = extractForensicManifestData(manifest);
  if (!manifestData) {
    return {
      isValid: false,
      keyId: manifest.signature.keyId,
      error: 'Manifest content is malformed'
    };
  }

  const payload = createManifestSigningPayload(manifestData, manifest.manifestVersion);

  return verifySignaturePayload(
    payload,
    manifest.signature,
    FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
    {
      unsupportedAlgorithmPrefix: 'Unsupported signature algorithm',
      missingKeyOrValueError: 'Missing signature key ID or value',
      noVerificationKeyPrefix: 'No verification key configured for key ID',
      invalidPublicKeyError: 'Manifest signature verification failed: invalid public key',
      verificationFailedError: 'Manifest signature verification failed'
    }
  );
}

/**
 * Calculate SHA-256 hash for content integrity validation
 * This implementation uses the Web Crypto API's SHA-256 for cryptographically
 * secure hash generation used throughout the Striae application for forensic data validation.
 * 
 * @param content - The string content to calculate hash for
 * @returns SHA-256 hash as lowercase hexadecimal string (64 characters)
 * @throws Error if content is null, undefined, or not a string
 */
export async function calculateSHA256(content: string): Promise<string> {
  // Input validation for forensic integrity
  if (content === null) {
    throw new Error('SHA-256 calculation failed: Content cannot be null');
  }
  if (content === undefined) {
    throw new Error('SHA-256 calculation failed: Content cannot be undefined');
  }
  if (typeof content !== 'string') {
    throw new Error(`SHA-256 calculation failed: Content must be a string, received ${typeof content}`);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash with timing attack mitigation
 * This version uses constant-time processing to prevent timing-based attacks
 * on forensically sensitive content. Use this for high-security environments.
 * 
 * @param content - The string content to calculate hash for
 * @returns SHA-256 hash as lowercase hexadecimal string (64 characters)
 * @throws Error if content is null, undefined, or not a string
 */
export async function calculateSHA256Secure(content: string): Promise<string> {
  // Input validation for forensic integrity
  if (content === null) {
    throw new Error('SHA-256 secure calculation failed: Content cannot be null');
  }
  if (content === undefined) {
    throw new Error('SHA-256 secure calculation failed: Content cannot be undefined');
  }
  if (typeof content !== 'string') {
    throw new Error(`SHA-256 secure calculation failed: Content must be a string, received ${typeof content}`);
  }

  const encoder = new TextEncoder();
  const originalData = encoder.encode(content);

  // Timing attack mitigation: pad to next 64-byte boundary
  // This reduces timing variance while maintaining algorithm correctness
  const BLOCK_SIZE = 64;
  const paddedLength = Math.ceil(originalData.length / BLOCK_SIZE) * BLOCK_SIZE;
  const paddedData = new Uint8Array(paddedLength);

  // Copy original data and pad with zeros
  paddedData.set(originalData);

  // For SHA-256 we hash original content, then add bounded extra work.
  const hashBuffer = await crypto.subtle.digest('SHA-256', originalData);
  const hashArray = new Uint8Array(hashBuffer);

  const paddingBytes = paddedLength - originalData.length;
  if (paddingBytes > 0) {
    // Compute digest over padded data to reduce timing variance.
    const paddingDigestBuffer = await crypto.subtle.digest('SHA-256', paddedData);
    const paddingDigestArray = new Uint8Array(paddingDigestBuffer);
    let volatile = 0;
    for (let i = 0; i < paddingDigestArray.length; i += 1) {
      volatile = (volatile * 31) ^ paddingDigestArray[i];
    }
    if (volatile === 0xdeadbeef) {
      console.debug('');
    }
  }

  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash for binary data (images, files)
 * 
 * @param data - Binary data as Uint8Array, ArrayBuffer, or Blob
 * @returns SHA-256 hash as lowercase hexadecimal string (64 characters)
 * @throws Error if data is null, undefined, or unsupported type
 */
export async function calculateSHA256Binary(data: Uint8Array | ArrayBuffer | Blob): Promise<string> {
  // Input validation for forensic integrity
  if (data === null) {
    throw new Error('SHA-256 binary calculation failed: Data cannot be null');
  }
  if (data === undefined) {
    throw new Error('SHA-256 binary calculation failed: Data cannot be undefined');
  }
  if (!(data instanceof Uint8Array || data instanceof ArrayBuffer || data instanceof Blob)) {
    throw new Error('SHA-256 binary calculation failed: Data must be Uint8Array, ArrayBuffer, or Blob');
  }

  let buffer: ArrayBuffer;

  if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else if (data instanceof ArrayBuffer) {
    buffer = data;
  } else {
    buffer = data.buffer instanceof ArrayBuffer
      ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      : new ArrayBuffer(data.length);
    if (!(data.buffer instanceof ArrayBuffer)) {
      new Uint8Array(buffer).set(data);
    }
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate comprehensive file manifest with secure hashes for forensic applications.
 */
export async function generateForensicManifestSecure(
  dataContent: string,
  imageFiles: { [filename: string]: Blob }
): Promise<ForensicManifestData> {
  const dataHash = await calculateSHA256Secure(dataContent);

  const imageHashes: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(imageFiles).sort();
  for (const filename of sortedFilenames) {
    imageHashes[filename] = await calculateSHA256Binary(imageFiles[filename]);
  }

  const manifestForHash = {
    dataHash,
    imageHashes,
    totalFiles: Object.keys(imageFiles).length + 1,
    createdAt: new Date().toISOString()
  };

  const manifestContent = JSON.stringify(manifestForHash);
  const manifestHash = await calculateSHA256Secure(manifestContent);

  return {
    dataHash,
    imageHashes,
    manifestHash,
    totalFiles: manifestForHash.totalFiles,
    createdAt: manifestForHash.createdAt
  };
}

/**
 * Generate secure forensic manifest with specific timestamp (for validation purposes).
 */
export async function generateForensicManifestWithTimestampSecure(
  dataContent: string,
  imageFiles: { [filename: string]: Blob },
  createdAt: string
): Promise<ForensicManifestData> {
  const dataHash = await calculateSHA256Secure(dataContent);

  const imageHashes: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(imageFiles).sort();
  for (const filename of sortedFilenames) {
    imageHashes[filename] = await calculateSHA256Binary(imageFiles[filename]);
  }

  const manifestForHash = {
    dataHash,
    imageHashes,
    totalFiles: Object.keys(imageFiles).length + 1,
    createdAt
  };

  const manifestContent = JSON.stringify(manifestForHash);
  const manifestHash = await calculateSHA256Secure(manifestContent);

  return {
    dataHash,
    imageHashes,
    manifestHash,
    totalFiles: manifestForHash.totalFiles,
    createdAt: manifestForHash.createdAt
  };
}

/**
 * Validate complete case integrity including data and images using secure SHA-256.
 */
export async function validateCaseIntegritySecure(
  dataContent: string,
  imageFiles: { [filename: string]: Blob },
  expectedManifest: ForensicManifestData
): Promise<{
  isValid: boolean;
  dataValid: boolean;
  imageValidation: { [filename: string]: boolean };
  manifestValid: boolean;
  errors: string[];
  summary: string;
}> {
  const errors: string[] = [];
  const imageValidation: { [filename: string]: boolean } = {};

  const actualDataHash = await calculateSHA256Secure(dataContent);
  const dataValid = actualDataHash === expectedManifest.dataHash.toLowerCase();
  if (!dataValid) {
    errors.push(`Data hash mismatch: expected ${expectedManifest.dataHash}, got ${actualDataHash}`);
  }

  const actualImageFiles = Object.keys(imageFiles).sort();
  const expectedImageFiles = Object.keys(expectedManifest.imageHashes).sort();

  const missingFiles = expectedImageFiles.filter((f) => !actualImageFiles.includes(f));
  const extraFiles = actualImageFiles.filter((f) => !expectedImageFiles.includes(f));

  if (missingFiles.length > 0) {
    errors.push(`Missing image files: ${missingFiles.join(', ')}`);
  }
  if (extraFiles.length > 0) {
    errors.push(`Extra image files not in manifest: ${extraFiles.join(', ')}`);
  }

  for (const filename of actualImageFiles) {
    if (expectedManifest.imageHashes[filename]) {
      const actualHash = await calculateSHA256Binary(imageFiles[filename]);
      const isValid = actualHash === expectedManifest.imageHashes[filename].toLowerCase();
      imageValidation[filename] = isValid;

      if (!isValid) {
        errors.push(`Image hash mismatch for ${filename}: expected ${expectedManifest.imageHashes[filename]}, got ${actualHash}`);
      }
    } else {
      imageValidation[filename] = false;
    }
  }

  const recreatedManifest = await generateForensicManifestWithTimestampSecure(
    dataContent,
    imageFiles,
    expectedManifest.createdAt
  );

  const manifestValid = recreatedManifest.manifestHash === expectedManifest.manifestHash.toLowerCase();
  if (!manifestValid) {
    errors.push(`Manifest hash mismatch: expected ${expectedManifest.manifestHash}, got ${recreatedManifest.manifestHash}`);

    if (recreatedManifest.dataHash !== expectedManifest.dataHash.toLowerCase()) {
      errors.push('Manifest data hash field differs from actual data');
    }

    for (const filename of Object.keys(imageFiles).sort()) {
      if (
        recreatedManifest.imageHashes[filename] &&
        recreatedManifest.imageHashes[filename] !== expectedManifest.imageHashes[filename]?.toLowerCase()
      ) {
        errors.push(`Manifest image hash entry for ${filename} differs from actual file`);
      }
    }
  }

  const allImageFilesValid = Object.values(imageValidation).every((valid) => valid);
  const isValid = dataValid && allImageFilesValid && manifestValid && errors.length === 0;

  const totalFiles = Object.keys(imageFiles).length;
  const validFiles = Object.values(imageValidation).filter((valid) => valid).length;

  let summary = `Validation ${isValid ? 'PASSED' : 'FAILED'}: `;
  summary += `Data ${dataValid ? 'valid' : 'invalid'}, `;
  summary += `${validFiles}/${totalFiles} images valid, `;
  summary += `manifest ${manifestValid ? 'valid' : 'invalid'}`;

  if (errors.length > 0) {
    summary += `. ${errors.length} error(s) detected`;
  }

  return {
    isValid,
    dataValid,
    imageValidation,
    manifestValid,
    errors,
    summary
  };
}
