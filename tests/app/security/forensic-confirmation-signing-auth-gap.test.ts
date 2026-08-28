// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../workers/data-worker/src/registry/key-registry', () => ({
	getManifestSigningKeyContext: vi.fn(async () => ({
		keyId: 'mock-key',
		privateKeyPem: 'mock-private-key'
	}))
}));

vi.mock('../../../workers/data-worker/src/signature-utils', () => ({
	signPayload: vi.fn(async () => ({
		algorithm: 'RSASSA-PSS-SHA-256',
		keyId: 'mock-key',
		signedAt: '2026-08-03T00:00:00.000Z',
		value: 'mock-signature-value'
	}))
}));

import { handleSignConfirmation } from '../../../workers/data-worker/src/handlers/signing';
import type { Env } from '../../../workers/data-worker/src/types';

describe('forensic confirmation signing authorization', () => {
	it('rejects signing when the authenticated caller does not match the exportedByUid', async () => {
		const request = new Request('https://worker/api/forensic/sign-confirmation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Striae-Authenticated-User-Id': 'attacker-uid'
			},
			body: JSON.stringify({
				signatureVersion: '3.0',
				confirmationData: {
					metadata: {
						caseNumber: 'CASE-VICTIM-001',
						exportDate: '2026-08-03T00:00:00.000Z',
						exportedBy: 'victim-uid',
						exportedByUid: 'victim-uid',
						exportedByName: 'Victim User',
						exportedByCompany: 'Victim Lab',
						totalConfirmations: 0,
						version: '1.0',
						hash: 'a'.repeat(64)
					},
					confirmations: {}
				}
			})
		});

		const response = await handleSignConfirmation(
			request,
			{
				USER_WORKER: {
					fetch: vi.fn(async () => new Response(JSON.stringify({
						uid: 'attacker-uid',
						cases: [{ caseNumber: 'CASE-VICTIM-001' }],
						readOnlyCases: []
					}), {
						status: 200,
						headers: {
							'Content-Type': 'application/json'
						}
					}))
				}
			} as unknown as Env,
			(data, status = 200) => new Response(JSON.stringify(data), {
				status,
				headers: {
					'Content-Type': 'application/json'
				}
			})
		);

		expect(response.status).toBe(403);
		const payload = await response.json() as {
			error?: string;
		};
		expect(payload.error).toContain('exporter identity');
	});

	it('allows signing when the authenticated caller has access to the case and matches the exporter', async () => {
		const request = new Request('https://worker/api/forensic/sign-confirmation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Striae-Authenticated-User-Id': 'reviewer-uid'
			},
			body: JSON.stringify({
				signatureVersion: '3.0',
				caseNumber: 'CASE-REVIEW-001',
				userId: 'reviewer-uid',
				confirmationData: {
					metadata: {
						caseNumber: 'CASE-REVIEW-001',
						exportDate: '2026-08-03T00:00:00.000Z',
						exportedBy: 'reviewer-uid',
						exportedByUid: 'reviewer-uid',
						exportedByName: 'Reviewer User',
						exportedByCompany: 'Reviewer Lab',
						totalConfirmations: 0,
						version: '1.0',
						hash: 'a'.repeat(64)
					},
					confirmations: {}
				}
			})
		});

		const response = await handleSignConfirmation(
			request,
			{
				USER_WORKER: {
					fetch: vi.fn(async () => new Response(JSON.stringify({
						uid: 'reviewer-uid',
						cases: [],
						readOnlyCases: [{ caseNumber: 'CASE-REVIEW-001' }]
					}), {
						status: 200,
						headers: {
							'Content-Type': 'application/json'
						}
					}))
				}
			} as unknown as Env,
			(data, status = 200) => new Response(JSON.stringify(data), {
				status,
				headers: {
					'Content-Type': 'application/json'
				}
			})
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as {
			success?: boolean;
			signature?: { keyId?: string; value?: string };
		};
		expect(payload.success).toBe(true);
		expect(payload.signature?.keyId).toBe('mock-key');
		expect(payload.signature?.value).toBe('mock-signature-value');
	});
});
