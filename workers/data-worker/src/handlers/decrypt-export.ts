// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import {
	buildExportDecryptionContext,
	decryptExportDataWithRegistry,
	decryptExportImageWithRegistry,
	getNonEmptyString,
} from '../registry/key-registry';
import {
	AUTHENTICATED_USER_EMAIL_HEADER,
	getNonEmptyRequestString,
	requireAuthenticatedUserContext,
	requireMatchingUserId,
} from '../forensic-authorization';
import type { CreateResponse, Env } from '../types';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	// Multiple of 3 so each chunk encodes independently without mid-stream base64 padding.
	const chunkSize = 8190;
	const base64Chunks: string[] = [];

	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
		let binary = '';
		for (let j = 0; j < chunk.length; j += 1) {
			binary += String.fromCharCode(chunk[j]);
		}
		base64Chunks.push(btoa(binary));
	}

	return base64Chunks.join('');
}

function emailsMatch(left: string, right: string): boolean {
	return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export async function handleDecryptExport(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	try {
		const authenticatedContext = requireAuthenticatedUserContext(request);
		if (!authenticatedContext.allowed || !authenticatedContext.userId) {
			return respond({ error: authenticatedContext.error || 'Unauthorized' }, authenticatedContext.status);
		}

		const requestBody = (await request.json()) as {
			wrappedKey?: string;
			dataIv?: string;
			encryptedData?: string;
			encryptedFiles?: Array<{ filename: string; encryptedData: string; iv?: string }>;
			encryptedImages?: Array<{ filename: string; encryptedData: string; iv?: string }>;
			keyId?: string;
			userId?: string;
		};

		const userMatchResult = requireMatchingUserId(authenticatedContext.userId, getNonEmptyRequestString(requestBody.userId));
		if (!userMatchResult.allowed) {
			return respond({ error: userMatchResult.error || 'Forbidden' }, userMatchResult.status);
		}

		const { wrappedKey, dataIv, encryptedData, encryptedFiles, encryptedImages, keyId } = requestBody;
		const encryptedEntries = Array.isArray(encryptedFiles) ? encryptedFiles : encryptedImages;

		if (
			!wrappedKey ||
			typeof wrappedKey !== 'string' ||
			!dataIv ||
			typeof dataIv !== 'string' ||
			!encryptedData ||
			typeof encryptedData !== 'string'
		) {
			return respond({ error: 'Missing or invalid required fields: wrappedKey, dataIv, encryptedData' }, 400);
		}

		const recordKeyId = getNonEmptyString(keyId);
		const decryptionContext = await buildExportDecryptionContext(recordKeyId, env);

		let plaintextData: string;
		try {
			plaintextData = await decryptExportDataWithRegistry(encryptedData, wrappedKey, dataIv, decryptionContext);
		} catch (error) {
			console.error('Data file decryption failed:', error);
			const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
			return respond({ error: `Failed to decrypt data file: ${errorMessage}` }, 500);
		}

		const authenticatedUserEmail = getNonEmptyRequestString(request.headers.get(AUTHENTICATED_USER_EMAIL_HEADER));

		try {
			const parsedPlaintext = JSON.parse(plaintextData) as {
				metadata?: {
					designatedReviewerEmail?: unknown;
				};
			};

			const designatedReviewerEmail = getNonEmptyRequestString(parsedPlaintext.metadata?.designatedReviewerEmail);
			if (designatedReviewerEmail) {
				if (!authenticatedUserEmail) {
					return respond(
						{
							error: 'Your account does not have an email address. This export is restricted to a designated reviewer.',
						},
						403,
					);
				}

				if (!emailsMatch(authenticatedUserEmail, designatedReviewerEmail)) {
					return respond(
						{
							error: `This export is restricted to the designated reviewer (${designatedReviewerEmail}).`,
						},
						403,
					);
				}
			}
		} catch {
			return respond({ error: 'Invalid export payload: unable to validate designated reviewer metadata' }, 400);
		}

		const decryptedImages: Array<{ filename: string; data: string }> = [];
		if (Array.isArray(encryptedEntries) && encryptedEntries.length > 0) {
			for (const imageEntry of encryptedEntries) {
				try {
					if (!imageEntry.iv || typeof imageEntry.iv !== 'string') {
						return respond({ error: `Missing IV for image ${imageEntry.filename}` }, 400);
					}

					const imageBlob = await decryptExportImageWithRegistry(imageEntry.encryptedData, wrappedKey, imageEntry.iv, decryptionContext);

					const base64Data = arrayBufferToBase64(await imageBlob.arrayBuffer());
					decryptedImages.push({
						filename: imageEntry.filename,
						data: base64Data,
					});
				} catch (error) {
					console.error(`Image decryption failed for ${imageEntry.filename}:`, error);
					const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
					return respond({ error: `Failed to decrypt image ${imageEntry.filename}: ${errorMessage}` }, 500);
				}
			}
		}

		return respond({
			success: true,
			plaintext: plaintextData,
			decryptedImages,
		});
	} catch (error) {
		console.error('Export decryption request failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return respond({ error: errorMessage }, 500);
	}
}
