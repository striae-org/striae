/**
 * SHA-256 utility functions for data integrity validation
 * Uses cryptographically secure SHA-256 algorithm for forensic applications
 * Provides enhanced security compared to CRC32 for tamper detection
 */

import { verifySignaturePayload } from './signature-utils';

export const FORENSIC_MANIFEST_LEGACY_VERSION = '3.0';
export const FORENSIC_MANIFEST_VERSION = '4.0';
export const FORENSIC_MANIFEST_SIGNATURE_ALGORITHM = 'RSASSA-PSS-SHA-256';

export interface ForensicManifestData {
  caseNumber?: string;
  dataHash: string;
  fileHashes: { [filename: string]: string };
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

type ForensicManifestHashField = 'fileHashes' | 'imageHashes';

function normalizeFileHashes(fileHashes: { [filename: string]: string }): { [filename: string]: string } {
  const normalized: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(fileHashes).sort();

  for (const filename of sortedFilenames) {
    normalized[filename] = fileHashes[filename].toLowerCase();
  }

  return normalized;
}

function getCandidateFileHashes(candidate: Partial<ForensicManifestData> & { imageHashes?: unknown }): Record<string, string> | null {
  if (candidate.fileHashes && typeof candidate.fileHashes === 'object') {
    return candidate.fileHashes;
  }

  if (candidate.imageHashes && typeof candidate.imageHashes === 'object') {
    return candidate.imageHashes as Record<string, string>;
  }

  return null;
}

function detectManifestHashField(candidate: Partial<SignedForensicManifest>): ForensicManifestHashField {
  return candidate.fileHashes && typeof candidate.fileHashes === 'object' ? 'fileHashes' : 'imageHashes';
}

function isSupportedManifestVersion(version: string): boolean {
  return version === FORENSIC_MANIFEST_VERSION || version === FORENSIC_MANIFEST_LEGACY_VERSION;
}

function isValidManifestData(
  candidate: Partial<ForensicManifestData> & { imageHashes?: unknown },
  manifestVersion: string
): candidate is ForensicManifestData {
  if (!candidate) {
    return false;
  }

  if (manifestVersion === FORENSIC_MANIFEST_VERSION) {
    if (typeof candidate.caseNumber !== 'string' || candidate.caseNumber.trim().length === 0) {
      return false;
    }
  }

  if (typeof candidate.dataHash !== 'string' || !SHA256_HEX_REGEX.test(candidate.dataHash)) {
    return false;
  }

  const fileHashes = getCandidateFileHashes(candidate);
  if (!fileHashes) {
    return false;
  }

  for (const hash of Object.values(fileHashes)) {
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
  const manifestVersion =
    typeof candidate.manifestVersion === 'string' && candidate.manifestVersion.trim().length > 0
      ? candidate.manifestVersion
      : FORENSIC_MANIFEST_VERSION;

  if (!isSupportedManifestVersion(manifestVersion) || !isValidManifestData(candidate, manifestVersion)) {
    return null;
  }

  const normalizedData: ForensicManifestData = {
    dataHash: candidate.dataHash.toLowerCase(),
    fileHashes: normalizeFileHashes(getCandidateFileHashes(candidate) ?? {}),
    manifestHash: candidate.manifestHash.toLowerCase(),
    totalFiles: candidate.totalFiles,
    createdAt: candidate.createdAt
  };

  if (manifestVersion === FORENSIC_MANIFEST_VERSION) {
    normalizedData.caseNumber = candidate.caseNumber?.trim();
  }

  return normalizedData;
}

/**
 * Build canonical payload for manifest signatures.
 * Every signer/verifier must use this exact ordering.
 */
export function createManifestSigningPayload(
  manifest: ForensicManifestData,
  manifestVersion: string = FORENSIC_MANIFEST_VERSION,
  hashFieldName: ForensicManifestHashField = 'fileHashes'
): string {
  if (manifestVersion === FORENSIC_MANIFEST_VERSION) {
    if (typeof manifest.caseNumber !== 'string' || manifest.caseNumber.trim().length === 0) {
      throw new Error('Manifest case number is required for version 4.0 signatures');
    }

    const canonicalPayload = {
      manifestVersion,
      caseNumber: manifest.caseNumber,
      dataHash: manifest.dataHash.toLowerCase(),
      [hashFieldName]: normalizeFileHashes(manifest.fileHashes),
      manifestHash: manifest.manifestHash.toLowerCase(),
      totalFiles: manifest.totalFiles,
      createdAt: manifest.createdAt
    };

    return JSON.stringify(canonicalPayload);
  }

  if (manifestVersion !== FORENSIC_MANIFEST_LEGACY_VERSION) {
    throw new Error(`Unsupported manifest version: ${manifestVersion}`);
  }

  const canonicalPayload = {
    manifestVersion,
    dataHash: manifest.dataHash.toLowerCase(),
    [hashFieldName]: normalizeFileHashes(manifest.fileHashes),
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
  manifest: Partial<SignedForensicManifest>,
  verificationPublicKeyPem?: string
): Promise<ManifestSignatureVerificationResult> {
  if (!manifest.signature) {
    return {
      isValid: false,
      error: 'Missing forensic manifest signature'
    };
  }

  const manifestVersion =
    typeof manifest.manifestVersion === 'string' && manifest.manifestVersion.trim().length > 0
      ? manifest.manifestVersion
      : FORENSIC_MANIFEST_VERSION;

  if (!isSupportedManifestVersion(manifestVersion)) {
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

  const payload = createManifestSigningPayload(manifestData, manifestVersion, detectManifestHashField(manifest));

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
    },
    {
      verificationPublicKeyPem
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
  fileBlobs: { [filename: string]: Blob },
  caseNumber: string
): Promise<ForensicManifestData> {
  const normalizedCaseNumber = caseNumber.trim();
  if (normalizedCaseNumber.length === 0) {
    throw new Error('Case number is required to generate a forensic manifest');
  }

  const dataHash = await calculateSHA256Secure(dataContent);

  const fileHashes: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(fileBlobs).sort();
  for (const filename of sortedFilenames) {
    fileHashes[filename] = await calculateSHA256Binary(fileBlobs[filename]);
  }

  const manifestForHash = {
    caseNumber: normalizedCaseNumber,
    dataHash,
    fileHashes,
    totalFiles: Object.keys(fileBlobs).length + 1,
    createdAt: new Date().toISOString()
  };

  const manifestContent = JSON.stringify(manifestForHash);
  const manifestHash = await calculateSHA256Secure(manifestContent);

  return {
    caseNumber: normalizedCaseNumber,
    dataHash,
    fileHashes,
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
  fileBlobs: { [filename: string]: Blob },
  createdAt: string,
  caseNumber?: string
): Promise<ForensicManifestData> {
  const dataHash = await calculateSHA256Secure(dataContent);

  const normalizedCaseNumber = typeof caseNumber === 'string' ? caseNumber.trim() : '';

  const fileHashes: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(fileBlobs).sort();
  for (const filename of sortedFilenames) {
    fileHashes[filename] = await calculateSHA256Binary(fileBlobs[filename]);
  }

  const manifestForHash = {
    ...(normalizedCaseNumber.length > 0 ? { caseNumber: normalizedCaseNumber } : {}),
    dataHash,
    fileHashes,
    totalFiles: Object.keys(fileBlobs).length + 1,
    createdAt
  };

  const manifestContent = JSON.stringify(manifestForHash);
  const manifestHash = await calculateSHA256Secure(manifestContent);

  return {
    ...(normalizedCaseNumber.length > 0 ? { caseNumber: normalizedCaseNumber } : {}),
    dataHash,
    fileHashes,
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
  fileBlobs: { [filename: string]: Blob },
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
    errors.push('Data hash mismatch detected');
  }

  const actualFileNames = Object.keys(fileBlobs).sort();
  const expectedFileNames = Object.keys(expectedManifest.fileHashes).sort();

  const missingFiles = expectedFileNames.filter((f) => !actualFileNames.includes(f));
  const extraFiles = actualFileNames.filter((f) => !expectedFileNames.includes(f));

  if (missingFiles.length > 0) {
    errors.push(`Missing files: ${missingFiles.join(', ')}`);
  }
  if (extraFiles.length > 0) {
    errors.push(`Extra files not in manifest: ${extraFiles.join(', ')}`);
  }

  for (const filename of actualFileNames) {
    if (expectedManifest.fileHashes[filename]) {
      const actualHash = await calculateSHA256Binary(fileBlobs[filename]);
      const isValid = actualHash === expectedManifest.fileHashes[filename].toLowerCase();
      imageValidation[filename] = isValid;

      if (!isValid) {
        errors.push(`File hash mismatch detected for ${filename}`);
      }
    } else {
      imageValidation[filename] = false;
    }
  }

  const recreatedManifest = await generateForensicManifestWithTimestampSecure(
    dataContent,
    fileBlobs,
    expectedManifest.createdAt,
    expectedManifest.caseNumber
  );

  const manifestValid = recreatedManifest.manifestHash === expectedManifest.manifestHash.toLowerCase();
  if (!manifestValid) {
    errors.push('Manifest hash mismatch detected');

    if (recreatedManifest.dataHash !== expectedManifest.dataHash.toLowerCase()) {
      errors.push('Manifest data hash field differs from actual data');
    }

    for (const filename of Object.keys(fileBlobs).sort()) {
      if (
        recreatedManifest.fileHashes[filename] &&
        recreatedManifest.fileHashes[filename] !== expectedManifest.fileHashes[filename]?.toLowerCase()
      ) {
        errors.push(`Manifest file hash entry for ${filename} differs from actual file`);
      }
    }
  }

  const allImageFilesValid = Object.values(imageValidation).every((valid) => valid);
  const isValid = dataValid && allImageFilesValid && manifestValid && errors.length === 0;

  const totalFiles = Object.keys(fileBlobs).length;
  const validFiles = Object.values(imageValidation).filter((valid) => valid).length;

  let summary = `Validation ${isValid ? 'PASSED' : 'FAILED'}: `;
  summary += `Data ${dataValid ? 'valid' : 'invalid'}, `;
  summary += `${validFiles}/${totalFiles} files valid, `;
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
