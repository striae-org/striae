// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { Env } from './types';

export const AUTHENTICATED_USER_ID_HEADER = 'X-Striae-Authenticated-User-Id';
export const AUTHENTICATED_USER_EMAIL_HEADER = 'X-Striae-Authenticated-User-Email';

interface CaseAccessItem {
	caseNumber?: unknown;
}

interface UserAccessRecord {
	uid?: unknown;
	cases?: CaseAccessItem[];
	readOnlyCases?: CaseAccessItem[];
}

export interface ForensicAuthorizationResult {
	allowed: boolean;
	status: number;
	error?: string;
}

function getNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

async function readUserAccessRecord(env: Env, userId: string): Promise<UserAccessRecord | null> {
	if (!env.USER_WORKER) {
		throw new Error('User service not configured');
	}

	const response = await env.USER_WORKER.fetch(`https://worker/${encodeURIComponent(userId)}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
		},
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`User service authorization lookup failed (${response.status} ${response.statusText})`);
	}

	return (await response.json()) as UserAccessRecord;
}

function hasCaseAccess(userRecord: UserAccessRecord, caseNumber: string): boolean {
	const ownsCase = Array.isArray(userRecord.cases) && userRecord.cases.some((entry) => getNonEmptyString(entry?.caseNumber) === caseNumber);

	if (ownsCase) {
		return true;
	}

	return (
		Array.isArray(userRecord.readOnlyCases) && userRecord.readOnlyCases.some((entry) => getNonEmptyString(entry?.caseNumber) === caseNumber)
	);
}

export function getAuthenticatedUserIdFromRequest(request: Request): string | null {
	return getNonEmptyString(request.headers.get(AUTHENTICATED_USER_ID_HEADER));
}

export function requireAuthenticatedUserContext(request: Request): ForensicAuthorizationResult & { userId?: string } {
	const userId = getAuthenticatedUserIdFromRequest(request);
	if (!userId) {
		return {
			allowed: false,
			status: 401,
			error: 'Missing authenticated proxy user context',
		};
	}

	return {
		allowed: true,
		status: 200,
		userId,
	};
}

export function requireMatchingUserId(authenticatedUserId: string, claimedUserId: unknown): ForensicAuthorizationResult {
	const normalizedClaimedUserId = getNonEmptyString(claimedUserId);
	if (!normalizedClaimedUserId) {
		return {
			allowed: true,
			status: 200,
		};
	}

	if (normalizedClaimedUserId !== authenticatedUserId) {
		return {
			allowed: false,
			status: 403,
			error: 'Authenticated user does not match request user context',
		};
	}

	return {
		allowed: true,
		status: 200,
	};
}

export async function requireCaseAccess(env: Env, authenticatedUserId: string, caseNumber: unknown): Promise<ForensicAuthorizationResult> {
	const normalizedCaseNumber = getNonEmptyString(caseNumber);
	if (!normalizedCaseNumber) {
		return {
			allowed: false,
			status: 400,
			error: 'Missing case number for forensic authorization',
		};
	}

	try {
		const userRecord = await readUserAccessRecord(env, authenticatedUserId);
		if (!userRecord) {
			return {
				allowed: false,
				status: 403,
				error: 'Authenticated user is not registered for case authorization',
			};
		}

		if (!hasCaseAccess(userRecord, normalizedCaseNumber)) {
			return {
				allowed: false,
				status: 403,
				error: 'Authenticated user does not have access to the requested case',
			};
		}

		return {
			allowed: true,
			status: 200,
		};
	} catch (error) {
		console.error('Forensic case authorization lookup failed:', error);
		return {
			allowed: false,
			status: 502,
			error: 'Unable to verify forensic case authorization',
		};
	}
}

export function getNonEmptyRequestString(value: unknown): string | null {
	return getNonEmptyString(value);
}
