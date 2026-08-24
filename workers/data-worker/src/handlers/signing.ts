// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { signPayload as signWithWorkerKey } from '../signature-utils';
import {
	getNonEmptyRequestString,
	requireAuthenticatedUserContext,
	requireCaseAccess,
	requireMatchingUserId,
} from '../forensic-authorization';
import {
	AUDIT_EXPORT_SIGNATURE_VERSION,
	CONFIRMATION_SIGNATURE_VERSION,
	FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
	FORENSIC_MANIFEST_VERSION,
	type AuditExportSigningPayload,
	type ConfirmationSigningPayload,
	type ForensicManifestPayload,
	createAuditExportSigningPayload,
	createConfirmationSigningPayload,
	createManifestSigningPayload,
	isValidAuditExportPayload,
	isValidConfirmationPayload,
	isValidManifestPayload,
} from '../signing-payload-utils';
import { getManifestSigningKeyContext } from '../registry/key-registry';
import type { CreateResponse, Env } from '../types';

async function signPayloadWithWorkerKey(
	payload: string,
	env: Env,
): Promise<{
	algorithm: string;
	keyId: string;
	signedAt: string;
	value: string;
}> {
	const signingContext = await getManifestSigningKeyContext(env);

	return signWithWorkerKey(payload, signingContext.privateKeyPem, signingContext.keyId, FORENSIC_MANIFEST_SIGNATURE_ALGORITHM);
}

async function signManifest(
	manifest: ForensicManifestPayload,
	env: Env,
): Promise<{
	algorithm: string;
	keyId: string;
	signedAt: string;
	value: string;
}> {
	const payload = createManifestSigningPayload(manifest);
	return signPayloadWithWorkerKey(payload, env);
}

async function signConfirmation(
	confirmationData: ConfirmationSigningPayload,
	env: Env,
): Promise<{
	algorithm: string;
	keyId: string;
	signedAt: string;
	value: string;
}> {
	const payload = createConfirmationSigningPayload(confirmationData);
	return signPayloadWithWorkerKey(payload, env);
}

async function signAuditExport(
	auditExportData: AuditExportSigningPayload,
	env: Env,
): Promise<{
	algorithm: string;
	keyId: string;
	signedAt: string;
	value: string;
}> {
	const payload = createAuditExportSigningPayload(auditExportData);
	return signPayloadWithWorkerKey(payload, env);
}

function getTopLevelRequestCaseNumber(requestBody: Record<string, unknown>): string | null {
	return getNonEmptyRequestString(requestBody.caseNumber);
}

function getManifestRequestCaseNumber(manifestBody: Record<string, unknown>): string | null {
	return getNonEmptyRequestString(manifestBody.caseNumber);
}

function getTopLevelRequestUserId(requestBody: Record<string, unknown>): string | null {
	return getNonEmptyRequestString(requestBody.userId);
}

export async function handleSignManifest(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	try {
		const authenticatedContext = requireAuthenticatedUserContext(request);
		if (!authenticatedContext.allowed || !authenticatedContext.userId) {
			return respond({ error: authenticatedContext.error || 'Unauthorized' }, authenticatedContext.status);
		}

		const requestBody = (await request.json()) as {
			manifest?: Partial<ForensicManifestPayload>;
			caseNumber?: string;
			userId?: string;
		} & Partial<ForensicManifestPayload>;
		const userMatchResult = requireMatchingUserId(
			authenticatedContext.userId,
			getTopLevelRequestUserId(requestBody as Record<string, unknown>),
		);
		if (!userMatchResult.allowed) {
			return respond({ error: userMatchResult.error || 'Forbidden' }, userMatchResult.status);
		}

		const topLevelCaseNumber = getTopLevelRequestCaseNumber(requestBody as Record<string, unknown>);
		const manifestCandidate: Partial<ForensicManifestPayload> = requestBody.manifest ?? requestBody;
		const manifestCaseNumber = getManifestRequestCaseNumber(manifestCandidate as Record<string, unknown>);

		if (topLevelCaseNumber && manifestCaseNumber && topLevelCaseNumber !== manifestCaseNumber) {
			return respond({ error: 'Request case number does not match manifest payload case number' }, 400);
		}

		const effectiveCaseNumber = manifestCaseNumber ?? topLevelCaseNumber;
		if (!effectiveCaseNumber) {
			return respond({ error: 'Missing case number for manifest signing authorization' }, 400);
		}

		const caseAccessResult = await requireCaseAccess(env, authenticatedContext.userId, effectiveCaseNumber);
		if (!caseAccessResult.allowed) {
			return respond({ error: caseAccessResult.error || 'Forbidden' }, caseAccessResult.status);
		}

		const normalizedManifestCandidate: Partial<ForensicManifestPayload> = {
			...manifestCandidate,
			fileHashes:
				(manifestCandidate as Partial<ForensicManifestPayload> & { imageHashes?: Record<string, string> }).fileHashes ??
				(manifestCandidate as Partial<ForensicManifestPayload> & { imageHashes?: Record<string, string> }).imageHashes,
			caseNumber: effectiveCaseNumber,
		};

		if (!manifestCandidate || !isValidManifestPayload(normalizedManifestCandidate)) {
			return respond({ error: 'Invalid manifest payload' }, 400);
		}

		const signature = await signManifest(normalizedManifestCandidate, env);

		return respond({
			success: true,
			manifestVersion: FORENSIC_MANIFEST_VERSION,
			signature,
		});
	} catch (error) {
		console.error('Manifest signing failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return respond({ error: errorMessage }, 500);
	}
}

export async function handleSignConfirmation(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	try {
		const authenticatedContext = requireAuthenticatedUserContext(request);
		if (!authenticatedContext.allowed || !authenticatedContext.userId) {
			return respond({ error: authenticatedContext.error || 'Unauthorized' }, authenticatedContext.status);
		}

		const requestBody = (await request.json()) as {
			confirmationData?: Partial<ConfirmationSigningPayload>;
			signatureVersion?: string;
			caseNumber?: string;
			userId?: string;
		} & Partial<ConfirmationSigningPayload>;

		const userMatchResult = requireMatchingUserId(
			authenticatedContext.userId,
			getTopLevelRequestUserId(requestBody as Record<string, unknown>),
		);
		if (!userMatchResult.allowed) {
			return respond({ error: userMatchResult.error || 'Forbidden' }, userMatchResult.status);
		}

		const requestedSignatureVersion =
			typeof requestBody.signatureVersion === 'string' && requestBody.signatureVersion.trim().length > 0
				? requestBody.signatureVersion
				: CONFIRMATION_SIGNATURE_VERSION;

		if (requestedSignatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
			return respond({ error: `Unsupported confirmation signature version: ${requestedSignatureVersion}` }, 400);
		}

		const confirmationCandidate: Partial<ConfirmationSigningPayload> = requestBody.confirmationData ?? requestBody;

		if (!confirmationCandidate || !isValidConfirmationPayload(confirmationCandidate)) {
			return respond({ error: 'Invalid confirmation payload' }, 400);
		}

		const requestCaseNumber = getTopLevelRequestCaseNumber(requestBody as Record<string, unknown>);
		if (requestCaseNumber && requestCaseNumber !== confirmationCandidate.metadata.caseNumber) {
			return respond({ error: 'Request case number does not match confirmation payload metadata' }, 400);
		}

		if (confirmationCandidate.metadata.exportedByUid !== authenticatedContext.userId) {
			return respond({ error: 'Authenticated user does not match confirmation exporter identity' }, 403);
		}

		const caseAccessResult = await requireCaseAccess(env, authenticatedContext.userId, confirmationCandidate.metadata.caseNumber);
		if (!caseAccessResult.allowed) {
			return respond({ error: caseAccessResult.error || 'Forbidden' }, caseAccessResult.status);
		}

		const signature = await signConfirmation(confirmationCandidate, env);

		return respond({
			success: true,
			signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
			signature,
		});
	} catch (error) {
		console.error('Confirmation signing failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return respond({ error: errorMessage }, 500);
	}
}

export async function handleSignAuditExport(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	try {
		const authenticatedContext = requireAuthenticatedUserContext(request);
		if (!authenticatedContext.allowed || !authenticatedContext.userId) {
			return respond({ error: authenticatedContext.error || 'Unauthorized' }, authenticatedContext.status);
		}

		const requestBody = (await request.json()) as {
			auditExport?: Partial<AuditExportSigningPayload>;
			signatureVersion?: string;
			caseNumber?: string;
			userId?: string;
		} & Partial<AuditExportSigningPayload>;

		const userMatchResult = requireMatchingUserId(
			authenticatedContext.userId,
			getTopLevelRequestUserId(requestBody as Record<string, unknown>),
		);
		if (!userMatchResult.allowed) {
			return respond({ error: userMatchResult.error || 'Forbidden' }, userMatchResult.status);
		}

		const requestedSignatureVersion =
			typeof requestBody.signatureVersion === 'string' && requestBody.signatureVersion.trim().length > 0
				? requestBody.signatureVersion
				: AUDIT_EXPORT_SIGNATURE_VERSION;

		if (requestedSignatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
			return respond({ error: `Unsupported audit export signature version: ${requestedSignatureVersion}` }, 400);
		}

		const auditExportCandidate: Partial<AuditExportSigningPayload> = requestBody.auditExport ?? requestBody;

		if (!auditExportCandidate || !isValidAuditExportPayload(auditExportCandidate)) {
			return respond({ error: 'Invalid audit export payload' }, 400);
		}

		if (auditExportCandidate.scopeType === 'user') {
			if (auditExportCandidate.scopeIdentifier !== authenticatedContext.userId) {
				return respond({ error: 'Authenticated user does not match requested audit user scope' }, 403);
			}
		} else {
			const requestCaseNumber = getTopLevelRequestCaseNumber(requestBody as Record<string, unknown>);
			if (requestCaseNumber && requestCaseNumber !== auditExportCandidate.scopeIdentifier) {
				return respond({ error: 'Request case number does not match requested audit case scope' }, 400);
			}

			const caseAccessResult = await requireCaseAccess(env, authenticatedContext.userId, auditExportCandidate.scopeIdentifier);
			if (!caseAccessResult.allowed) {
				return respond({ error: caseAccessResult.error || 'Forbidden' }, caseAccessResult.status);
			}
		}

		const signature = await signAuditExport(auditExportCandidate, env);

		return respond({
			success: true,
			signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
			signature,
		});
	} catch (error) {
		console.error('Audit export signing failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return respond({ error: errorMessage }, 500);
	}
}
