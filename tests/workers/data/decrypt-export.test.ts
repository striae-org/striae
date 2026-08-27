import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../workers/data-worker/src/types';
import { handleDecryptExport } from '../../../workers/data-worker/src/handlers/decrypt-export';
import {
	buildExportDecryptionContext,
	decryptExportDataWithRegistry,
} from '../../../workers/data-worker/src/registry/key-registry';

vi.mock('../../../workers/data-worker/src/registry/key-registry', () => ({
	buildExportDecryptionContext: vi.fn(async () => ({})),
	decryptExportDataWithRegistry: vi.fn(async () => ''),
	decryptExportImageWithRegistry: vi.fn(),
	getNonEmptyString: (value: unknown) => {
		if (typeof value !== 'string') {
			return null;
		}
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	},
}));

function createResponder() {
	return (body: unknown, status = 200): Response =>
		new Response(JSON.stringify(body), {
			status,
			headers: {
				'Content-Type': 'application/json',
			},
		});
}

function createRequest(userId: string, userEmail?: string): Request {
	const headers = new Headers({
		'Content-Type': 'application/json',
		'X-Striae-Authenticated-User-Id': userId,
	});
	if (userEmail) {
		headers.set('X-Striae-Authenticated-User-Email', userEmail);
	}

	return new Request('https://worker/api/forensic/decrypt-export', {
		method: 'POST',
		headers,
		body: JSON.stringify({
			userId,
			wrappedKey: 'wrapped-key',
			dataIv: 'iv-value',
			encryptedData: 'ciphertext',
		}),
	});
}

describe('handleDecryptExport designated reviewer gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows decrypt when designatedReviewerEmail is absent', async () => {
		vi.mocked(buildExportDecryptionContext).mockResolvedValueOnce({} as never);
		vi.mocked(decryptExportDataWithRegistry).mockResolvedValueOnce(
			JSON.stringify({
				metadata: {
					caseNumber: 'CASE-001',
				},
			})
		);

		const response = await handleDecryptExport(
			createRequest('owner-uid', 'owner@example.com'),
			{} as Env,
			createResponder()
		);
		const payload = await response.json() as { success?: boolean };

		expect(response.status).toBe(200);
		expect(payload.success).toBe(true);
	});

	it('denies decrypt when designated reviewer is set but authenticated email is missing', async () => {
		vi.mocked(buildExportDecryptionContext).mockResolvedValueOnce({} as never);
		vi.mocked(decryptExportDataWithRegistry).mockResolvedValueOnce(
			JSON.stringify({
				metadata: {
					designatedReviewerEmail: 'reviewer@example.com',
				},
			})
		);

		const response = await handleDecryptExport(
			createRequest('owner-uid'),
			{} as Env,
			createResponder()
		);
		const payload = await response.json() as { error?: string };

		expect(response.status).toBe(403);
		expect(payload.error).toContain('does not have an email address');
	});

	it('denies decrypt when designated reviewer email does not match authenticated email', async () => {
		vi.mocked(buildExportDecryptionContext).mockResolvedValueOnce({} as never);
		vi.mocked(decryptExportDataWithRegistry).mockResolvedValueOnce(
			JSON.stringify({
				metadata: {
					designatedReviewerEmail: 'reviewer@example.com',
				},
			})
		);

		const response = await handleDecryptExport(
			createRequest('owner-uid', 'other@example.com'),
			{} as Env,
			createResponder()
		);
		const payload = await response.json() as { error?: string };

		expect(response.status).toBe(403);
		expect(payload.error).toContain('restricted to the designated reviewer');
	});

	it('allows decrypt when designated reviewer email matches authenticated email case-insensitively', async () => {
		vi.mocked(buildExportDecryptionContext).mockResolvedValueOnce({} as never);
		vi.mocked(decryptExportDataWithRegistry).mockResolvedValueOnce(
			JSON.stringify({
				metadata: {
					designatedReviewerEmail: 'Reviewer@Example.com',
				},
			})
		);

		const response = await handleDecryptExport(
			createRequest('owner-uid', 'reviewer@example.com'),
			{} as Env,
			createResponder()
		);
		const payload = await response.json() as { success?: boolean };

		expect(response.status).toBe(200);
		expect(payload.success).toBe(true);
	});

	it('fails closed when decrypted payload cannot be parsed as JSON', async () => {
		vi.mocked(buildExportDecryptionContext).mockResolvedValueOnce({} as never);
		vi.mocked(decryptExportDataWithRegistry).mockResolvedValueOnce('not-json');

		const response = await handleDecryptExport(
			createRequest('owner-uid', 'owner@example.com'),
			{} as Env,
			createResponder()
		);
		const payload = await response.json() as { error?: string };

		expect(response.status).toBe(400);
		expect(payload.error).toContain('unable to validate designated reviewer metadata');
	});
});
