import { describe, it, expect, beforeAll } from 'vitest';
import { getManifestSigningKeyContext } from '../../../workers/data-worker/src/registry/key-registry';
import { encryptRegistryJson } from '../../../shared/registry/registry-encryption';
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

// Generate a stable test encryption key (32 bytes, base64url)
function generateTestKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of keyBytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createEncryptedMockR2Bucket(registryJson: string, key: string): Promise<R2Bucket> {
  const envelope = await encryptRegistryJson(registryJson, key);
  return createMockR2Bucket(JSON.stringify(envelope));
}

function buildEnv(overrides: Partial<Env> & { STRIAE_CONFIG?: R2Bucket }): Env {
  return {
    STRIAE_DATA: {} as R2Bucket,
    STRIAE_CONFIG: createMockR2Bucket(null),
    REGISTRY_ENCRYPTION_KEY: 'placeholder',
    ...overrides,
  } as Env;
}

describe('getManifestSigningKeyContext', () => {
  let testKey: string;

  beforeAll(() => {
    testKey = generateTestKey();
  });

  it('uses active key from manifest signing registry in R2', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'registry-key',
      keys: {
        'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
        'old-key': '-----BEGIN PRIVATE KEY-----\\nold\\n-----END PRIVATE KEY-----',
      },
    });

    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: testKey,
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
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      MANIFEST_SIGNING_ACTIVE_KEY_ID: 'override-key',
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    const context = await getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('override-key');
    expect(context.privateKeyPem).toContain('override');
  });

  it('throws when R2 object is not found', async () => {
    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(null),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('R2 object "manifest-signing-keys.json" not found');
  });

  it('throws when content is not an encrypted envelope', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'some-key',
      keys: { 'some-key': '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----' },
    });

    const env = buildEnv({
      STRIAE_CONFIG: createMockR2Bucket(registryJson),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('not an encrypted registry envelope');
  });

  it('throws when decryption key is wrong', async () => {
    const registryJson = JSON.stringify({
      activeKeyId: 'some-key',
      keys: { 'some-key': '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----' },
    });

    const wrongKey = generateTestKey();
    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: wrongKey,
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('failed to decrypt registry');
  });

  it('throws when active key ID is not configured', async () => {
    const registryJson = JSON.stringify({
      keys: {
        'some-key': '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----',
      },
    });

    const env = buildEnv({
      STRIAE_CONFIG: await createEncryptedMockR2Bucket(registryJson, testKey),
      REGISTRY_ENCRYPTION_KEY: testKey,
    });

    await expect(getManifestSigningKeyContext(env)).rejects.toThrow('Manifest signing active key ID is not configured');
  });
});
