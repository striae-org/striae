// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for workers/data-worker/src/signature-utils.ts
 *
 * Validates that signPayload:
 * - Produces a correctly structured WorkerSignatureEnvelope
 * - Produces a signature verifiable by the app-side verifySignaturePayload
 * - Throws when private key or keyId is missing
 *
 * These run in the Cloudflare Workers miniflare environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  signPayload,
  type WorkerSignatureEnvelope,
} from '../../../workers/data-worker/src/signature-utils';

// ---------------------------------------------------------------------------
// Helpers: generate ephemeral RSA-PSS key pair, export to PEM
// ---------------------------------------------------------------------------

async function generateRsaPssKeyPair(modulusLength = 2048): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function exportToPkcs8Pem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const lines = base64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

async function exportToSpkiPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const lines = base64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Verify an RSA-PSS-SHA-256 signature with salt=32 using a raw public key */
async function verifyRsaPss(
  payload: string,
  signatureBase64url: string,
  publicKeyPem: string
): Promise<boolean> {
  const pemBody = publicKeyPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(pemBody);
  const spkiBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) spkiBytes[i] = binary.charCodeAt(i);

  const key = await crypto.subtle.importKey(
    'spki',
    spkiBytes.buffer,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    key,
    base64UrlToUint8Array(signatureBase64url) as BufferSource,
    new TextEncoder().encode(payload) as BufferSource
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TEST_ALGORITHM = 'RSASSA-PSS-SHA-256';
const TEST_KEY_ID = 'test-signing-key-1';

describe.each([2048, 3072])('signPayload (modulusLength=%i)', (modulusLength) => {
  let privateKeyPem: string;
  let publicKeyPem: string;

  beforeAll(async () => {
    const keyPair = await generateRsaPssKeyPair(modulusLength);
    privateKeyPem = await exportToPkcs8Pem(keyPair.privateKey);
    publicKeyPem = await exportToSpkiPem(keyPair.publicKey);
  });

  it('returns a WorkerSignatureEnvelope with the correct shape', async () => {
    const envelope = await signPayload('test payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);

    expect(typeof envelope.algorithm).toBe('string');
    expect(typeof envelope.keyId).toBe('string');
    expect(typeof envelope.signedAt).toBe('string');
    expect(typeof envelope.value).toBe('string');
  });

  it('returns the provided algorithm and keyId', async () => {
    const envelope = await signPayload('test payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);

    expect(envelope.algorithm).toBe(TEST_ALGORITHM);
    expect(envelope.keyId).toBe(TEST_KEY_ID);
  });

  it('signedAt is a valid ISO date string', async () => {
    const envelope = await signPayload('payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);
    expect(Number.isNaN(Date.parse(envelope.signedAt))).toBe(false);
  });

  it('value is a non-empty base64url string (no +, /, =)', async () => {
    const envelope = await signPayload('payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);
    expect(envelope.value.length).toBeGreaterThan(0);
    expect(envelope.value).not.toMatch(/[+/=]/);
  });

  it('produces different signatures on successive calls (non-deterministic PSS)', async () => {
    const [e1, e2] = await Promise.all([
      signPayload('same payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM),
      signPayload('same payload', privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM),
    ]);
    // RSA-PSS is randomized; signatures should differ
    expect(e1.value).not.toBe(e2.value);
  });

  it('produces a signature verifiable with the corresponding public key', async () => {
    const payload = JSON.stringify({ manifestVersion: '3.0', dataHash: 'a'.repeat(64) });
    const envelope: WorkerSignatureEnvelope = await signPayload(
      payload,
      privateKeyPem,
      TEST_KEY_ID,
      TEST_ALGORITHM
    );

    const isValid = await verifyRsaPss(payload, envelope.value, publicKeyPem);
    expect(isValid).toBe(true);
  });

  it('signature does NOT verify against a different payload', async () => {
    const payload = 'original payload';
    const envelope = await signPayload(payload, privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);

    const isValid = await verifyRsaPss('tampered payload', envelope.value, publicKeyPem);
    expect(isValid).toBe(false);
  });

  it('signature does NOT verify with a different public key', async () => {
    const payload = 'some payload';
    const envelope = await signPayload(payload, privateKeyPem, TEST_KEY_ID, TEST_ALGORITHM);

    const otherPair = await generateRsaPssKeyPair(modulusLength);
    const otherPublicPem = await exportToSpkiPem(otherPair.publicKey);

    const isValid = await verifyRsaPss(payload, envelope.value, otherPublicPem);
    expect(isValid).toBe(false);
  });

  it('throws when privateKey is undefined', async () => {
    await expect(
      signPayload('payload', undefined, TEST_KEY_ID, TEST_ALGORITHM)
    ).rejects.toThrow();
  });

  it('throws when keyId is undefined', async () => {
    await expect(
      signPayload('payload', privateKeyPem, undefined, TEST_ALGORITHM)
    ).rejects.toThrow();
  });

  it('uses the custom error message when provided', async () => {
    await expect(
      signPayload('payload', undefined, undefined, TEST_ALGORITHM, 'Custom error: secrets not set')
    ).rejects.toThrow('Custom error: secrets not set');
  });
});
