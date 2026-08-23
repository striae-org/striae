import type { User } from 'firebase/auth';
import type { ConfirmationImportData } from '~/types';

import { fetchDataApi } from '../../api';
import {
	AUDIT_EXPORT_SIGNATURE_VERSION,
	type AuditExportSigningPayload,
	isValidAuditExportSigningPayload,
} from '../../forensics/audit-export-signature';
import { CONFIRMATION_SIGNATURE_VERSION } from '../../forensics/confirmation-signature';
import { type ForensicManifestData, type ForensicManifestSignature, FORENSIC_MANIFEST_VERSION } from '../../forensics/SHA256';
import { getEncryptedManifestEntries, type EncryptionManifest } from '../../forensics/export-encryption';
import { canAccessCase, validateUserSession } from '../permissions';
import type { AuditExportSigningResponse, ConfirmationSigningResponse, ManifestSigningResponse } from './types';

/**
 * Request a server-side signature for a forensic manifest.
 */
export const signForensicManifest = async (
	user: User,
	caseNumber: string,
	manifest: ForensicManifestData,
): Promise<ManifestSigningResponse> => {
	try {
		if (typeof manifest.caseNumber !== 'string' || manifest.caseNumber.trim().length === 0) {
			throw new Error('Manifest signing request requires manifest.caseNumber');
		}

		if (manifest.caseNumber !== caseNumber) {
			throw new Error('Manifest case number must match the requested signing case number');
		}

		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		const accessCheck = await canAccessCase(user, caseNumber);
		if (!accessCheck.allowed) {
			throw new Error(`Manifest signing denied: ${accessCheck.reason}`);
		}

		const response = await fetchDataApi(user, '/api/forensic/sign-manifest', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userId: user.uid,
				caseNumber,
				manifest,
			}),
		});

		const responseData = (await response.json().catch(() => null)) as {
			success?: boolean;
			error?: string;
			manifestVersion?: string;
			signature?: ForensicManifestSignature;
		} | null;

		if (!response.ok) {
			throw new Error(responseData?.error || `Failed to sign forensic manifest: ${response.status} ${response.statusText}`);
		}

		if (!responseData?.success || !responseData.signature || !responseData.manifestVersion) {
			throw new Error('Invalid manifest signing response from data worker');
		}

		if (responseData.manifestVersion !== FORENSIC_MANIFEST_VERSION) {
			throw new Error(`Unexpected manifest version from signer: ${responseData.manifestVersion}`);
		}

		return {
			manifestVersion: responseData.manifestVersion,
			signature: responseData.signature,
		};
	} catch (error) {
		console.error(`Error signing forensic manifest for ${caseNumber}:`, error);
		throw error;
	}
};

/**
 * Request a server-side signature for confirmation export data.
 */
export const signConfirmationData = async (
	user: User,
	caseNumber: string,
	confirmationData: ConfirmationImportData,
): Promise<ConfirmationSigningResponse> => {
	try {
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		const accessCheck = await canAccessCase(user, caseNumber);
		if (!accessCheck.allowed) {
			throw new Error(`Confirmation signing denied: ${accessCheck.reason}`);
		}

		const response = await fetchDataApi(user, '/api/forensic/sign-confirmation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userId: user.uid,
				caseNumber,
				confirmationData,
				signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
			}),
		});

		const responseData = (await response.json().catch(() => null)) as {
			success?: boolean;
			error?: string;
			signatureVersion?: string;
			signature?: ForensicManifestSignature;
		} | null;

		if (!response.ok) {
			throw new Error(responseData?.error || `Failed to sign confirmation data: ${response.status} ${response.statusText}`);
		}

		if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
			throw new Error('Invalid confirmation signing response from data worker');
		}

		if (responseData.signatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
			throw new Error(`Unexpected confirmation signature version from signer: ${responseData.signatureVersion}`);
		}

		return {
			signatureVersion: responseData.signatureVersion,
			signature: responseData.signature,
		};
	} catch (error) {
		console.error(`Error signing confirmation data for ${caseNumber}:`, error);
		throw error;
	}
};

/**
 * Request a server-side signature for audit export metadata.
 */
export const signAuditExportData = async (
	user: User,
	auditExport: AuditExportSigningPayload,
	options: { caseNumber?: string } = {},
): Promise<AuditExportSigningResponse> => {
	try {
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		if (!isValidAuditExportSigningPayload(auditExport)) {
			throw new Error('Invalid audit export payload for signing');
		}

		const caseNumber = options.caseNumber;
		if (caseNumber) {
			const accessCheck = await canAccessCase(user, caseNumber);
			if (!accessCheck.allowed) {
				throw new Error(`Audit export signing denied: ${accessCheck.reason}`);
			}
		}

		const response = await fetchDataApi(user, '/api/forensic/sign-audit-export', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userId: user.uid,
				caseNumber,
				auditExport,
				signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
			}),
		});

		const responseData = (await response.json().catch(() => null)) as {
			success?: boolean;
			error?: string;
			signatureVersion?: string;
			signature?: ForensicManifestSignature;
		} | null;

		if (!response.ok) {
			throw new Error(responseData?.error || `Failed to sign audit export data: ${response.status} ${response.statusText}`);
		}

		if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
			throw new Error('Invalid audit export signing response from data worker');
		}

		if (responseData.signatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
			throw new Error(`Unexpected audit export signature version from signer: ${responseData.signatureVersion}`);
		}

		return {
			signatureVersion: responseData.signatureVersion,
			signature: responseData.signature,
		};
	} catch (error) {
		console.error('Error signing audit export data:', error);
		throw error;
	}
};

// Data worker isolates have a fixed 128MB memory limit; decrypting + base64 re-encoding every
// file in one request can exceed that for larger exports. Cap each request's decoded payload
// size so per-file decryption is spread across multiple requests instead of one large one.
const MAX_DECRYPT_BATCH_DECODED_BYTES = 4 * 1024 * 1024;
const MAX_DECRYPT_BATCH_FILE_COUNT = 20;

interface EncryptedFileEntry {
	filename: string;
	encryptedData: string;
	iv?: string;
}

function chunkEncryptedFiles(files: EncryptedFileEntry[]): EncryptedFileEntry[][] {
	const batches: EncryptedFileEntry[][] = [];
	let currentBatch: EncryptedFileEntry[] = [];
	let currentBatchBytes = 0;

	for (const file of files) {
		// Base64 decodes to roughly 3/4 of its encoded length.
		const estimatedBytes = Math.ceil((file.encryptedData.length * 3) / 4);

		if (
			currentBatch.length > 0 &&
			(currentBatchBytes + estimatedBytes > MAX_DECRYPT_BATCH_DECODED_BYTES || currentBatch.length >= MAX_DECRYPT_BATCH_FILE_COUNT)
		) {
			batches.push(currentBatch);
			currentBatch = [];
			currentBatchBytes = 0;
		}

		currentBatch.push(file);
		currentBatchBytes += estimatedBytes;
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	return batches;
}

/**
 * Request batch decryption of export data file and associated files from the data worker
 */
export const decryptExportBatch = async (
	user: User,
	encryptionManifest: EncryptionManifest,
	encryptedDataBase64: string,
	encryptedFileMap: Record<string, string>,
): Promise<{ plaintext: string; decryptedImages: Record<string, Blob> }> => {
	try {
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		// Convert encrypted file map to array format expected by worker, including per-file IV from manifest.
		const manifestEntries = getEncryptedManifestEntries(encryptionManifest);
		const ivByFilename = new Map(manifestEntries.map((entry) => [entry.filename, entry.iv]));
		const encryptedFiles: EncryptedFileEntry[] = Object.entries(encryptedFileMap).map(([filename, encryptedData]) => ({
			filename,
			encryptedData,
			iv: ivByFilename.get(filename),
		}));

		// Always issue at least one request (for the data file) even if there are no associated files.
		const batches = encryptedFiles.length > 0 ? chunkEncryptedFiles(encryptedFiles) : [[]];

		let plaintext: string | undefined;
		const decryptedImages: Record<string, Blob> = {};

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
			const batch = batches[batchIndex];

			const response = await fetchDataApi(user, '/api/forensic/decrypt-export', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.uid,
					wrappedKey: encryptionManifest.wrappedKey,
					dataIv: encryptionManifest.dataIv,
					encryptedData: encryptedDataBase64,
					encryptedFiles: batch,
					keyId: encryptionManifest.keyId,
				}),
			});

			const responseData = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
				plaintext?: string;
				decryptedImages?: Array<{ filename: string; data: string }>;
			} | null;

			if (!response.ok) {
				const errorMessage =
					responseData?.error || `Failed to decrypt export (batch ${batchIndex + 1}/${batches.length}): ${response.status} ${response.statusText}`;

				// Special handling for encrypted exports without configured key
				if (response.status === 400 && errorMessage.includes('not configured')) {
					throw new Error('This export is encrypted. To import it, your Striae instance must have EXPORT_ENCRYPTION_PRIVATE_KEY configured.');
				}

				throw new Error(errorMessage);
			}

			if (!responseData?.success || !responseData.plaintext) {
				throw new Error('Invalid decrypt response from data worker');
			}

			if (plaintext === undefined) {
				plaintext = responseData.plaintext;
			}

			// Convert decrypted file base64 data back to Blobs
			if (Array.isArray(responseData.decryptedImages)) {
				for (const imageEntry of responseData.decryptedImages) {
					try {
						const binaryString = atob(imageEntry.data);
						const bytes = new Uint8Array(binaryString.length);
						for (let i = 0; i < binaryString.length; i++) {
							bytes[i] = binaryString.charCodeAt(i);
						}
						decryptedImages[imageEntry.filename] = new Blob([bytes]);
					} catch (error) {
						console.error(`Failed to convert decrypted image ${imageEntry.filename}:`, error);
						throw new Error(`Failed to convert decrypted image: ${imageEntry.filename}`, { cause: error });
					}
				}
			}
		}

		if (plaintext === undefined) {
			throw new Error('Invalid decrypt response from data worker');
		}

		return {
			plaintext,
			decryptedImages,
		};
	} catch (error) {
		console.error('Error decrypting export batch:', error);
		throw error;
	}
};
