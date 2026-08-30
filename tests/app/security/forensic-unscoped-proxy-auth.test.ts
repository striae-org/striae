// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../functions/api/_shared/firebase-auth', () => ({
	verifyFirebaseIdentityFromRequest: vi.fn(),
}));

import { verifyFirebaseIdentityFromRequest } from '../../../functions/api/_shared/firebase-auth';
import { onRequest } from '../../../functions/api/data/[[path]]';

// Derived from onRequest's own (unexported) parameter type to avoid colliding with the ambient global Env.
type ProxyEnv = Parameters<typeof onRequest>[0]['env'];

describe('data proxy forensic auth forwarding', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards trusted authenticated identity headers for forensic signing requests', async () => {
		vi.mocked(verifyFirebaseIdentityFromRequest).mockResolvedValue({
			uid: 'attacker-uid',
			email: 'attacker@example.com',
		} as never);

		const upstreamFetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				}),
		);

		const request = new Request('https://example.com/api/data/api/forensic/sign-confirmation', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				confirmationData: {
					metadata: {
						caseNumber: 'CASE-VICTIM-001',
						exportDate: '2026-08-03T00:00:00.000Z',
						exportedBy: 'victim-uid',
						exportedByUid: 'victim-uid',
						exportedByName: 'Victim User',
						exportedByCompany: 'Lab',
						totalConfirmations: 0,
						version: '1.0',
						hash: 'a'.repeat(64),
					},
					confirmations: {},
				},
			}),
		});

		const response = await onRequest({
			request,
			env: {
				DATA_WORKER: {
					fetch: upstreamFetch,
				},
			} as unknown as ProxyEnv,
		});

		expect(response.status).toBe(200);
		expect(upstreamFetch).toHaveBeenCalledTimes(1);
		const firstCall = upstreamFetch.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?] | undefined;
		if (!firstCall) {
			throw new Error('Expected upstream fetch to be called');
		}
		expect(String(firstCall[0])).toContain('/api/forensic/sign-confirmation');
		const forwardedInit = firstCall[1] as RequestInit | undefined;
		const forwardedHeaders = new Headers(forwardedInit?.headers);
		expect(forwardedHeaders.get('X-Striae-Authenticated-User-Id')).toBe('attacker-uid');
		expect(forwardedHeaders.get('X-Striae-Authenticated-User-Email')).toBe('attacker@example.com');
	});
});
