import { describe, it, expect } from 'vitest';
import { getManifestSigningKeyContext } from '../../../workers/data-worker/src/registry/key-registry';
import type { Env } from '../../../workers/data-worker/src/types';

function buildEnv(overrides: Partial<Env>): Env {
  return {
    STRIAE_DATA: {} as R2Bucket,
    ...overrides,
  } as Env;
}

describe('getManifestSigningKeyContext', () => {
  it('uses legacy manifest signing key fields when registry is not configured', () => {
    const env = buildEnv({
      MANIFEST_SIGNING_KEY_ID: 'legacy-key',
      MANIFEST_SIGNING_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nlegacy\\n-----END PRIVATE KEY-----',
    });

    const context = getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('legacy-key');
    expect(context.privateKeyPem).toContain('legacy');
  });

  it('uses active key from manifest signing registry when configured', () => {
    const env = buildEnv({
      MANIFEST_SIGNING_KEYS_JSON: JSON.stringify({
        activeKeyId: 'registry-key',
        keys: {
          'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
          'old-key': '-----BEGIN PRIVATE KEY-----\\nold\\n-----END PRIVATE KEY-----',
        },
      }),
    });

    const context = getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('registry-key');
    expect(context.privateKeyPem).toContain('registry');
  });

  it('allows env active key override to select a different registry key', () => {
    const env = buildEnv({
      MANIFEST_SIGNING_KEYS_JSON: JSON.stringify({
        activeKeyId: 'registry-key',
        keys: {
          'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
          'override-key': '-----BEGIN PRIVATE KEY-----\\noverride\\n-----END PRIVATE KEY-----',
        },
      }),
      MANIFEST_SIGNING_ACTIVE_KEY_ID: 'override-key',
    });

    const context = getManifestSigningKeyContext(env);

    expect(context.keyId).toBe('override-key');
    expect(context.privateKeyPem).toContain('override');
  });

  it('throws when resolved active key is missing from registry', () => {
    const env = buildEnv({
      MANIFEST_SIGNING_KEYS_JSON: JSON.stringify({
        keys: {
          'registry-key': '-----BEGIN PRIVATE KEY-----\\nregistry\\n-----END PRIVATE KEY-----',
        },
      }),
      MANIFEST_SIGNING_KEY_ID: 'missing-key',
    });

    expect(() => getManifestSigningKeyContext(env)).toThrow('Manifest signing active key ID is not present in key registry');
  });
});
