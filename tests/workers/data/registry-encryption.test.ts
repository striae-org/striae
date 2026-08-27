/**
 * Tests for shared/registry/registry-encryption.ts
 *
 * Validates AES-256-GCM encrypt/decrypt round-trips for key registry envelopes.
 *
 * These run in the Cloudflare Workers miniflare environment (provides crypto.subtle).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  encryptRegistryJson,
  decryptRegistryJson,
  isEncryptedEnvelope,
  type EncryptedRegistryEnvelope,
} from '../../../shared/registry/registry-encryption';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTestKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of keyBytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('encryptRegistryJson / decryptRegistryJson', () => {
  let testKey: string;

  beforeAll(() => {
    testKey = generateTestKey();
  });

  it('round-trips a simple registry JSON', async () => {
    const registry = JSON.stringify({
      activeKeyId: 'key-v1',
      keys: {
        'key-v1': '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
      },
    });

    const envelope = await encryptRegistryJson(registry, testKey);
    const decrypted = await decryptRegistryJson(envelope, testKey);

    expect(decrypted).toBe(registry);
  });

  it('round-trips a multi-key registry', async () => {
    const registry = JSON.stringify({
      activeKeyId: 'ear-key-v2',
      keys: {
        'ear-key-v2': '-----BEGIN PRIVATE KEY-----\nNEW_KEY_DATA\n-----END PRIVATE KEY-----',
        'ear-key-v1': '-----BEGIN PRIVATE KEY-----\nOLD_KEY_DATA\n-----END PRIVATE KEY-----',
      },
    });

    const envelope = await encryptRegistryJson(registry, testKey);
    const decrypted = await decryptRegistryJson(envelope, testKey);

    expect(decrypted).toBe(registry);
  });

  it('round-trips empty keys object', async () => {
    const registry = JSON.stringify({ activeKeyId: null, keys: {} });

    const envelope = await encryptRegistryJson(registry, testKey);
    const decrypted = await decryptRegistryJson(envelope, testKey);

    expect(decrypted).toBe(registry);
  });

  it('produces a valid EncryptedRegistryEnvelope', async () => {
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });

    const envelope = await encryptRegistryJson(registry, testKey);

    expect(envelope.encrypted).toBe(true);
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.version).toBe('1.0');
    expect(typeof envelope.iv).toBe('string');
    expect(envelope.iv.length).toBeGreaterThan(0);
    expect(typeof envelope.ciphertext).toBe('string');
    expect(envelope.ciphertext.length).toBeGreaterThan(0);
  });

  it('generates unique IVs for each encryption', async () => {
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });

    const envelope1 = await encryptRegistryJson(registry, testKey);
    const envelope2 = await encryptRegistryJson(registry, testKey);

    expect(envelope1.iv).not.toBe(envelope2.iv);
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
  });

  it('fails decryption with wrong key', async () => {
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });
    const wrongKey = generateTestKey();

    const envelope = await encryptRegistryJson(registry, testKey);

    await expect(decryptRegistryJson(envelope, wrongKey)).rejects.toThrow();
  });

  it('fails decryption with tampered ciphertext', async () => {
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });

    const envelope = await encryptRegistryJson(registry, testKey);
    const tampered: EncryptedRegistryEnvelope = {
      ...envelope,
      ciphertext: envelope.ciphertext.slice(0, -4) + 'XXXX',
    };

    await expect(decryptRegistryJson(tampered, testKey)).rejects.toThrow();
  });

  it('fails decryption with tampered IV', async () => {
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });

    const envelope = await encryptRegistryJson(registry, testKey);
    const tampered: EncryptedRegistryEnvelope = {
      ...envelope,
      iv: 'AAAAAAAAAAAAAAAAAA',
    };

    await expect(decryptRegistryJson(tampered, testKey)).rejects.toThrow();
  });

  it('rejects key with wrong length', async () => {
    const shortKey = btoa('tooshort').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const registry = JSON.stringify({ activeKeyId: 'k1', keys: { k1: 'pem' } });

    await expect(encryptRegistryJson(registry, shortKey)).rejects.toThrow('must be 32 bytes');
  });
});

describe('isEncryptedEnvelope', () => {
  it('returns true for a valid envelope', () => {
    const envelope: EncryptedRegistryEnvelope = {
      encrypted: true,
      algorithm: 'AES-256-GCM',
      version: '1.0',
      iv: 'abc123',
      ciphertext: 'def456',
    };

    expect(isEncryptedEnvelope(envelope)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEncryptedEnvelope(null)).toBe(false);
  });

  it('returns false for a plain registry JSON object', () => {
    const registry = {
      activeKeyId: 'k1',
      keys: { k1: '-----BEGIN PRIVATE KEY-----\n...' },
    };

    expect(isEncryptedEnvelope(registry)).toBe(false);
  });

  it('returns false when encrypted field is missing', () => {
    expect(isEncryptedEnvelope({
      algorithm: 'AES-256-GCM',
      version: '1.0',
      iv: 'abc',
      ciphertext: 'def',
    })).toBe(false);
  });

  it('returns false when algorithm is wrong', () => {
    expect(isEncryptedEnvelope({
      encrypted: true,
      algorithm: 'AES-128-GCM',
      version: '1.0',
      iv: 'abc',
      ciphertext: 'def',
    })).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isEncryptedEnvelope('string')).toBe(false);
    expect(isEncryptedEnvelope(42)).toBe(false);
    expect(isEncryptedEnvelope(undefined)).toBe(false);
  });
});
