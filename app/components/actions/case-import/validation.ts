import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getUserApiKey } from '~/utils/auth';
import { CaseExportData, ConfirmationImportData } from '~/types';
import { calculateSHA256Secure, ManifestSignatureVerificationResult } from '~/utils/SHA256';
import { verifyConfirmationSignature } from '~/utils/confirmation-signature';

const USER_WORKER_URL = paths.user_worker_url;

/**
 * Remove forensic warning from content for hash validation (supports both JSON and CSV formats)
 * This function ensures exact match with the content used during export hash generation
 */
export function removeForensicWarning(content: string): string {
  // Handle JSON forensic warnings (block comment format)
  // /* CASE DATA WARNING
  //  * This file contains evidence data for forensic examination.
  //  * Any modification may compromise the integrity of the evidence.
  //  * Handle according to your organization's chain of custody procedures.
  //  * 
  //  * File generated: YYYY-MM-DDTHH:mm:ss.sssZ
  //  */
  const jsonForensicWarningRegex = /^\/\*\s*CASE\s+DATA\s+WARNING[\s\S]*?\*\/\s*\r?\n*/;
  
  // Handle CSV forensic warnings (quoted string format at the beginning of file)
  // CRITICAL: The CSV forensic warning is ONLY the first quoted line, followed by two newlines
  // Format: "CASE DATA WARNING: This file contains evidence data for forensic examination. Any modification may compromise the integrity of the evidence. Handle according to your organization's chain of custody procedures."\n\n
  // 
  // After removal, what remains should be the csvWithHash content:
  // # Striae Case Export - Generated: ...
  // # Case: ...
  // # Total Files: ...
  // # SHA256 Hash: ...
  // # Verification: ...
  //
  // [actual CSV data]
  // More robust regex to handle various line endings and exact format from generation
  const csvForensicWarningRegex = /^"CASE DATA WARNING: This file contains evidence data for forensic examination\. Any modification may compromise the integrity of the evidence\. Handle according to your organization's chain of custody procedures\."(?:\r?\n){2}/;
  
  let cleaned = content;
  
  // Try JSON format first
  if (jsonForensicWarningRegex.test(content)) {
    cleaned = content.replace(jsonForensicWarningRegex, '');
  }
  // Try CSV format with exact pattern match
  else if (csvForensicWarningRegex.test(content)) {
    cleaned = content.replace(csvForensicWarningRegex, '');
  }
  // Fallback: try broader CSV pattern in case of slight format differences
  else if (content.startsWith('"CASE DATA WARNING:')) {
    // Find the end of the first quoted string followed by newlines
    const match = content.match(/^"[^"]*"(?:\r?\n)+/);
    if (match) {
      cleaned = content.substring(match[0].length);
    }
  }
  
  // Additional cleanup: remove any leading whitespace that might remain
  // This ensures we match exactly what the generation functions produce with protectForensicData: false
  cleaned = cleaned.replace(/^\s+/, '');
  
  return cleaned;
}

/**
 * Validate that a user exists in the database by UID and is not the current user
 */
export async function validateExporterUid(exporterUid: string, currentUser: User): Promise<{ exists: boolean; isSelf: boolean }> {
  try {
    const apiKey = await getUserApiKey();
    const response = await fetch(`${USER_WORKER_URL}/${exporterUid}`, {
      method: 'GET',
      headers: {
        'X-Custom-Auth-Key': apiKey
      }
    });
    
    const exists = response.status === 200;
    const isSelf = exporterUid === currentUser.uid;
    
    return { exists, isSelf };
  } catch (error) {
    console.error('Error validating exporter UID:', error);
    return { exists: false, isSelf: false };
  }
}

/**
 * Check if file is a confirmation data import
 */
export function isConfirmationDataFile(filename: string): boolean {
  return filename.startsWith('confirmation-data') && filename.endsWith('.json');
}

/**
 * Validate confirmation data file hash
 */
export async function validateConfirmationHash(jsonContent: string, expectedHash: string): Promise<boolean> {
  try {
    // Validate input parameters
    if (!expectedHash || typeof expectedHash !== 'string') {
      console.error('validateConfirmationHash: expected hash input is invalid');
      return false;
    }

    // Create data without hash for validation
    const data = JSON.parse(jsonContent);
    const dataWithoutHash = {
      ...data,
      metadata: {
        ...data.metadata,
        hash: undefined
      }
    };
    delete dataWithoutHash.metadata.hash;
    delete dataWithoutHash.metadata.signature;
    delete dataWithoutHash.metadata.signatureVersion;
    
    const contentForHash = JSON.stringify(dataWithoutHash, null, 2);
    const actualHash = await calculateSHA256Secure(contentForHash);
    
    if (!actualHash) {
      console.error('validateConfirmationHash: failed to calculate hash');
      return false;
    }
    
    return actualHash.toUpperCase() === expectedHash.toUpperCase();
  } catch {
    console.error('validateConfirmationHash: validation failed');
    return false;
  }
}

/**
 * Validate imported case data integrity (optional verification)
 */
export function validateCaseIntegrity(
  caseData: CaseExportData,
  imageFiles: { [filename: string]: Blob }
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check if all referenced images exist
  for (const fileEntry of caseData.files) {
    const filename = fileEntry.fileData.originalFilename;
    if (!imageFiles[filename]) {
      issues.push(`Missing image file: ${filename}`);
    }
  }
  
  // Check if there are extra images not referenced in case data
  const referencedFiles = new Set(caseData.files.map(f => f.fileData.originalFilename));
  for (const filename of Object.keys(imageFiles)) {
    if (!referencedFiles.has(filename)) {
      issues.push(`Unreferenced image file: ${filename}`);
    }
  }
  
  // Validate metadata completeness
  if (!caseData.metadata.caseNumber) {
    issues.push('Missing case number in metadata');
  }
  
  if (!caseData.metadata.exportDate) {
    issues.push('Missing export date in metadata');
  }
  
  // Validate annotation data
  for (const fileEntry of caseData.files) {
    if (fileEntry.hasAnnotations && !fileEntry.annotations) {
      issues.push(`File ${fileEntry.fileData.originalFilename} marked as having annotations but no annotation data found`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Validate confirmation data file signature.
 */
export async function validateConfirmationSignatureFile(
  confirmationData: Partial<ConfirmationImportData>
): Promise<ManifestSignatureVerificationResult> {
  return verifyConfirmationSignature(confirmationData);
}
