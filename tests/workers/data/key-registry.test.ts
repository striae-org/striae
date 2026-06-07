import { describe, it, expect } from 'vitest';
import { getManifestSigningKeyContext } from '../../../workers/data-worker/src/registry/key-registry';
import type { Env } from '../../../workers/data-worker/src/types';

function createMockR2Bucket(content: string | null): R2Bucket {
  return {
    get: async () => content === null ? null : ({
      text: async () => content,
    } as unknown as R2ObjectBody),
    put: async () => ({} as R2Object),
    delete: async () => {},
    list: async () => ({ objects: [], truncated: false, delimitedPrefixes: [] } as unknown as R2Objects),
    head: async () => null,
    createMultipartUpload: async () => ({} as R2MultipartUpload),
    resumeMultipartUpload: () => ({} as R2MultipartUpload),
  } as unknown as R2Bucket;
}

function buildEnv(overrides: Partial<Env> & { STRIAE_CONFIG?: R2Bucket }): Env {
  return {
    STRIAE_DATA: {} as R2Bucket,
    STRIAE_CONFIG: createMockR2Bucket(null),
    ...overrides,
  } as Env;
}

describe('getManifestSigningKeyContext', () => {
  it('uses active key from manifest signing registry in R2', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'registry-key',
      keys: {
        'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
        'old-key': '-----BEGIN PRIVATE KEY-----\\nold\\n-----END PRIVATE KEY-----',
      },
    });

    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(registryJson),
    });

    const context = await getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('registry-key');
    expect(context.privateKeyPem).toContain('registry');
  });

  it('allows env active key override to select a different registry key', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'registry-key',
      keys: {
        'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
        'override-key': '-----BEGIN PRIVATE KEY-----\\noverride\\n-----END PRIVATE KEY-----',
      },
    });

    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(registryJson),
      MANIFEST_SIGNING_ACTIVE_KEY_ID: 'override-key',
    });

    const context = await getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('override-key');
    expect(context.privateKeyPem).toContain('override');
  });

  it('throws when R2 object is not found', async () => {
    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(null),
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('R2 object "manifest-signing-keys.json" not found');
  });

  it('throws when active key ID is not configured', async () => {
    const registryJson = JSON.stringify({
      keys: {
        'some-key': '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----',
      },
    });

    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(registryJson),
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('Manifest signing active key ID is not configured');
  });
});
