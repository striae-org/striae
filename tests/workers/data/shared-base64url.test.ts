/**
 * Tests for shared/crypto/base64url.ts
 *
 * These run in the Cloudflare Workers miniflare environment (provides crypto.subtle).
 */

import { describe, it, expect } from 'vitest';
import { base64UrlEncode, base64UrlDecode } from '../../../shared/crypto/base64url';

describe('base64UrlEncode / base64UrlDecode', () => {
  it('round-trips arbitrary bytes', () => {
    const original = crypto.getRandomValues(new Uint8Array(64));
    const encoded = base64UrlEncode(original);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('round-trips a large byte array (multi-chunk)', () => {
    const original = crypto.getRandomValues(new Uint8Array(20000));
    const encoded = base64UrlEncode(original);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('encoded string contains no +, /, or = characters', () => {
    const bytes = new Uint8Array(48).fill(0xff);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('encodes and decodes empty byte array', () => {
    const empty = new Uint8Array(0);
    const encoded = base64UrlEncode(empty);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(empty);
  });

  it('decode handles base64url characters - and _', () => {
    // bytes that produce + and / in standard base64
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    const standardBase64 = btoa(String.fromCharCode(...bytes));
    const base64url = standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = base64UrlDecode(base64url);
    expect(decoded).toEqual(bytes);
  });
});
