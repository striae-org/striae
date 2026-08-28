// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';

const {
  decryptExportDataWithRegistry,
  decryptExportImageWithRegistry
} = vi.hoisted(() => ({
  decryptExportDataWithRegistry: vi.fn(),
  decryptExportImageWithRegistry: vi.fn()
}));

vi.mock('../../../workers/data-worker/src/registry/key-registry', () => ({
  buildExportDecryptionContext: vi.fn(async () => ({
    recordKeyId: null,
    candidates: [{ keyId: 'mock-key', privateKeyPem: 'mock-private-key' }],
    primaryKeyId: 'mock-key'
  })),
  decryptExportDataWithRegistry,
  decryptExportImageWithRegistry,
  getNonEmptyString: (value: unknown) => typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}));

import { handleDecryptExport } from '../../../workers/data-worker/src/handlers/decrypt-export';
import type { Env } from '../../../workers/data-worker/src/types';

describe('forensic decrypt export authorization', () => {
  it('rejects decrypt requests when the claimed request user does not match the authenticated caller', async () => {
    decryptExportDataWithRegistry.mockReset();

    const request = new Request('https://worker/api/forensic/decrypt-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Striae-Authenticated-User-Id': 'owner-uid'
      },
      body: JSON.stringify({
        userId: 'attacker-uid',
        wrappedKey: 'wrapped-key',
        dataIv: 'data-iv',
        encryptedData: 'encrypted-data'
      })
    });

    const response = await handleDecryptExport(
      request,
      {} as Env,
      (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    expect(response.status).toBe(403);
    expect(decryptExportDataWithRegistry).not.toHaveBeenCalled();
  });

  it('allows decrypt for authenticated users when no designated reviewer is set (even if originalCaseOwnerUid differs)', async () => {
    decryptExportDataWithRegistry.mockReset();
    decryptExportDataWithRegistry.mockResolvedValue(JSON.stringify({
      metadata: {
        originalCaseOwnerUid: 'owner-uid'
      }
    }));
    decryptExportImageWithRegistry.mockReset();

    const request = new Request('https://worker/api/forensic/decrypt-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Striae-Authenticated-User-Id': 'other-user'
      },
      body: JSON.stringify({
        userId: 'other-user',
        wrappedKey: 'wrapped-key',
        dataIv: 'data-iv',
        encryptedData: 'encrypted-data'
      })
    });

    const response = await handleDecryptExport(
      request,
      {} as Env,
      (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as { success?: boolean };
    expect(payload.success).toBe(true);
  });
});