// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for shared/registry/key-candidates.ts
 *
 * Validates the record-key -> active-key -> remaining-keys fallback chain and
 * decryption telemetry logging used by every worker's key registry.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildPrivateKeyCandidates,
  logKeyRegistryDecryptionTelemetry,
} from '../../../shared/registry/key-candidates';
import type { PrivateKeyRegistry } from '../../../shared/registry/r2-key-registry';

describe('buildPrivateKeyCandidates', () => {
  const registry: PrivateKeyRegistry = {
    activeKeyId: 'key-active',
    keys: {
      'key-active': 'active-pem',
      'key-old': 'old-pem',
      'key-record': 'record-pem',
    },
  };

  it('orders candidates: record key, then active key, then remaining keys', () => {
    const candidates = buildPrivateKeyCandidates('key-record', registry);
    expect(candidates.map((c) => c.keyId)).toEqual(['key-record', 'key-active', 'key-old']);
  });

  it('de-duplicates when record key equals active key', () => {
    const candidates = buildPrivateKeyCandidates('key-active', registry);
    expect(candidates.map((c) => c.keyId)).toEqual(['key-active', 'key-old', 'key-record']);
  });

  it('skips a record key id not present in the registry', () => {
    const candidates = buildPrivateKeyCandidates('key-missing', registry);
    expect(candidates.map((c) => c.keyId)).toEqual(['key-active', 'key-old', 'key-record']);
  });

  it('handles a null record key id', () => {
    const candidates = buildPrivateKeyCandidates(null, registry);
    expect(candidates.map((c) => c.keyId)).toEqual(['key-active', 'key-old', 'key-record']);
  });

  it('returns an empty array for an empty registry', () => {
    const emptyRegistry: PrivateKeyRegistry = { activeKeyId: null, keys: {} };
    expect(buildPrivateKeyCandidates('key-record', emptyRegistry)).toEqual([]);
  });

  it('treats a blank-string record key id as absent', () => {
    const candidates = buildPrivateKeyCandidates('   ', registry);
    expect(candidates.map((c) => c.keyId)).toEqual(['key-active', 'key-old', 'key-record']);
  });
});

describe('logKeyRegistryDecryptionTelemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs to console.info for a primary-hit outcome', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logKeyRegistryDecryptionTelemetry({
      scope: 'data-at-rest',
      recordKeyId: 'key-1',
      selectedKeyId: 'key-1',
      attemptCount: 1,
      outcome: 'primary-hit',
    });
    expect(infoSpy).toHaveBeenCalledWith(
      'Key registry decryption resolved',
      expect.objectContaining({ scope: 'data-at-rest', outcome: 'primary-hit', fallbackUsed: false })
    );
  });

  it('logs to console.info with fallbackUsed=true for a fallback-hit outcome', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logKeyRegistryDecryptionTelemetry({
      scope: 'user-kv',
      recordKeyId: 'key-1',
      selectedKeyId: 'key-2',
      attemptCount: 2,
      outcome: 'fallback-hit',
    });
    expect(infoSpy).toHaveBeenCalledWith(
      'Key registry decryption resolved',
      expect.objectContaining({ scope: 'user-kv', outcome: 'fallback-hit', fallbackUsed: true })
    );
  });

  it('logs to console.warn for an all-failed outcome', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logKeyRegistryDecryptionTelemetry({
      scope: 'audit-at-rest',
      recordKeyId: 'key-1',
      selectedKeyId: null,
      attemptCount: 3,
      outcome: 'all-failed',
      reason: 'no candidates decrypted successfully',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Key registry decryption failed',
      expect.objectContaining({ scope: 'audit-at-rest', outcome: 'all-failed', reason: 'no candidates decrypted successfully' })
    );
  });
});
