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

import {
  handleSignAuditExport,
  handleSignManifest
} from '../../../workers/data-worker/src/handlers/signing';
import { requireCaseAccess } from '../../../workers/data-worker/src/forensic-authorization';

describe('forensic endpoint authorization', () => {
  it('rejects manifest signing when the authenticated caller lacks case access', async () => {
    const request = new Request('https://worker/api/forensic/sign-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Striae-Authenticated-User-Id': 'reviewer-uid'
      },
      body: JSON.stringify({
        userId: 'reviewer-uid',
        caseNumber: 'CASE-LOCKED-001',
        manifest: {
          dataHash: 'a'.repeat(64),
          fileHashes: { 'image-1.jpg': 'b'.repeat(64) },
          manifestHash: 'c'.repeat(64),
          totalFiles: 1,
          createdAt: '2026-08-03T00:00:00.000Z'
        }
      })
    });

    const response = await handleSignManifest(
      request,
      {
        USER_WORKER: {
          fetch: vi.fn(async () => new Response(JSON.stringify({
            uid: 'reviewer-uid',
            cases: [],
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
    const payload = await response.json() as { error?: string };
    expect(payload.error).toContain('does not have access');
  });

  it('rejects audit export signing when a user-scoped export targets a different user', async () => {
    const request = new Request('https://worker/api/forensic/sign-audit-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Striae-Authenticated-User-Id': 'reviewer-uid'
      },
      body: JSON.stringify({
        userId: 'reviewer-uid',
        auditExport: {
          signatureVersion: '2.0',
          exportFormat: 'json',
          exportType: 'trail',
          scopeType: 'user',
          scopeIdentifier: 'victim-uid',
          generatedAt: '2026-08-03T00:00:00.000Z',
          totalEntries: 10,
          hash: 'a'.repeat(64)
        }
      })
    });

    const response = await handleSignAuditExport(
      request,
      {} as unknown as Env,
      (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json() as { error?: string };
    expect(payload.error).toContain('audit user scope');
  });
});

describe('forensic case authorization USER_WORKER dependency (regression)', () => {
  // Regression: workers/data-worker/wrangler.jsonc previously omitted the USER_WORKER
  // service binding, causing case-access lookups to throw and surface as a 502.
  it('requireCaseAccess fails closed with a 502 when env.USER_WORKER is not configured', async () => {
    const result = await requireCaseAccess({} as unknown as Env, 'reviewer-uid', 'CASE-001');

    expect(result).toEqual({
      allowed: false,
      status: 502,
      error: 'Unable to verify forensic case authorization'
    });
  });

  it('handleSignManifest surfaces a 502 (not an unhandled exception) when env.USER_WORKER is missing', async () => {
    const request = new Request('https://worker/api/forensic/sign-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Striae-Authenticated-User-Id': 'reviewer-uid'
      },
      body: JSON.stringify({
        userId: 'reviewer-uid',
        caseNumber: 'CASE-001',
        manifest: {
          caseNumber: 'CASE-001',
          dataHash: 'a'.repeat(64),
          fileHashes: { 'image-1.jpg': 'b'.repeat(64) },
          manifestHash: 'c'.repeat(64),
          totalFiles: 1,
          createdAt: '2026-08-03T00:00:00.000Z'
        }
      })
    });

    const response = await handleSignManifest(
      request,
      {} as unknown as Env,
      (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    expect(response.status).toBe(502);
    const payload = await response.json() as { error?: string };
    expect(payload.error).toBe('Unable to verify forensic case authorization');
  });

  it('requireCaseAccess succeeds once env.USER_WORKER is configured and the caller owns the case', async () => {
    const env = {
      USER_WORKER: {
        fetch: vi.fn(async () => new Response(JSON.stringify({
          uid: 'reviewer-uid',
          cases: [{ caseNumber: 'CASE-001' }],
          readOnlyCases: []
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }))
      }
    } as unknown as Env;

    const result = await requireCaseAccess(env, 'reviewer-uid', 'CASE-001');

    expect(result).toEqual({ allowed: true, status: 200 });
  });
});