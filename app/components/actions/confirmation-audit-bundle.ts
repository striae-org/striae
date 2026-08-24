// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { User } from 'firebase/auth';
import type { AuditTrail, ValidationAuditEntry } from '~/types';
import {
	calculateSHA256Secure,
	verifyAuditExportSignature,
	type AuditExportSigningPayload,
	type ForensicManifestSignature,
} from '~/utils/forensics';
import { signAuditExport } from '~/services/audit/audit-export-signing';
import { generateAuditSummary, sortAuditEntriesNewestFirst } from '~/services/audit/audit-query-helpers';

const AUDIT_BUNDLE_EXPORT_VERSION = '1.0';

interface ConfirmationAuditBundleBaseMetadata {
	exportTimestamp: string;
	exportVersion: string;
	totalEntries: number;
	application: 'Striae';
	exportType: 'trail';
	scopeType: 'case';
	scopeIdentifier: string;
}

interface SignedConfirmationAuditTrail {
	metadata: ConfirmationAuditBundleBaseMetadata & {
		hash: string;
		signatureVersion: string;
		signatureMetadata: AuditExportSigningPayload;
		signature: ForensicManifestSignature;
	};
	auditTrail: AuditTrail;
}

const buildBaseMetadata = (caseNumber: string, exportTimestamp: string, totalEntries: number): ConfirmationAuditBundleBaseMetadata => ({
	exportTimestamp,
	exportVersion: AUDIT_BUNDLE_EXPORT_VERSION,
	totalEntries,
	application: 'Striae',
	exportType: 'trail',
	scopeType: 'case',
	scopeIdentifier: caseNumber,
});

/**
 * Builds a signed, self-contained audit-trail JSON for the reviewing examiner's case entries.
 * The hash covers the unsigned { metadata, auditTrail } payload, matching the verification path.
 */
export const buildSignedConfirmationAuditTrail = async (
	user: User,
	caseNumber: string,
	entries: ValidationAuditEntry[],
): Promise<string> => {
	const sortedEntries = sortAuditEntriesNewestFirst(entries);
	const auditTrail: AuditTrail = {
		caseNumber,
		workflowId: `${caseNumber}-confirmation-${Date.now()}`,
		entries: sortedEntries,
		summary: generateAuditSummary(sortedEntries),
	};

	const exportTimestamp = new Date().toISOString();
	const baseMetadata = buildBaseMetadata(caseNumber, exportTimestamp, auditTrail.summary.totalEvents);
	const unsignedPayload = { metadata: baseMetadata, auditTrail };
	const hash = (await calculateSHA256Secure(JSON.stringify(unsignedPayload, null, 2))).toUpperCase();

	const signed = await signAuditExport(
		{
			exportFormat: 'json',
			exportType: 'trail',
			generatedAt: exportTimestamp,
			totalEntries: baseMetadata.totalEntries,
			hash,
		},
		{
			user,
			scopeType: 'case',
			scopeIdentifier: caseNumber,
			caseNumber,
		},
	);

	const signedAuditTrail: SignedConfirmationAuditTrail = {
		metadata: {
			...baseMetadata,
			hash,
			signatureVersion: signed.signatureMetadata.signatureVersion,
			signatureMetadata: signed.signatureMetadata,
			signature: signed.signature,
		},
		auditTrail,
	};

	return JSON.stringify(signedAuditTrail, null, 2);
};

export interface VerifiedConfirmationAuditBundle {
	entries: ValidationAuditEntry[];
	exportTimestamp?: string;
	totalEntries?: number;
	scopeIdentifier?: string;
	auditTrailCaseNumber?: string;
}

/**
 * Verifies hash + signature of a signed confirmation audit-trail JSON and returns its entries.
 * Throws on malformed content, hash mismatch, or invalid signature.
 */
export const verifyConfirmationAuditTrail = async (
	signedAuditTrailJson: string,
	verificationPublicKeyPem?: string,
): Promise<VerifiedConfirmationAuditBundle> => {
	let parsed: Partial<SignedConfirmationAuditTrail>;
	try {
		parsed = JSON.parse(signedAuditTrailJson) as Partial<SignedConfirmationAuditTrail>;
	} catch (error) {
		throw new Error('Confirmation audit bundle is not valid JSON.', { cause: error });
	}

	const metadata = parsed?.metadata;
	const auditTrail = parsed?.auditTrail;
	if (!metadata || !auditTrail || !Array.isArray(auditTrail.entries)) {
		throw new Error('Confirmation audit bundle is malformed.');
	}

	const baseMetadata = buildBaseMetadata(metadata.scopeIdentifier, metadata.exportTimestamp, metadata.totalEntries);
	const unsignedPayload = { metadata: baseMetadata, auditTrail };
	const recomputedHash = (await calculateSHA256Secure(JSON.stringify(unsignedPayload, null, 2))).toUpperCase();

	if (recomputedHash !== String(metadata.hash).toUpperCase()) {
		throw new Error('Confirmation audit bundle failed integrity verification.');
	}

	const signaturePayload: Partial<AuditExportSigningPayload> = metadata.signatureMetadata ?? {
		signatureVersion: metadata.signatureVersion,
		exportFormat: 'json',
		exportType: 'trail',
		scopeType: metadata.scopeType,
		scopeIdentifier: metadata.scopeIdentifier,
		generatedAt: metadata.exportTimestamp,
		totalEntries: metadata.totalEntries,
		hash: metadata.hash,
	};

	const signatureResult = await verifyAuditExportSignature(signaturePayload, metadata.signature, verificationPublicKeyPem);

	if (!signatureResult.isValid) {
		throw new Error(`Confirmation audit bundle signature verification failed: ${signatureResult.error || 'Unknown signature error'}`);
	}

	return {
		entries: auditTrail.entries,
		exportTimestamp: metadata.exportTimestamp,
		totalEntries: metadata.totalEntries,
		scopeIdentifier: metadata.scopeIdentifier,
		auditTrailCaseNumber: auditTrail.caseNumber,
	};
};
