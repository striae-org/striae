/**
 * Private-key candidate fallback chain + decryption telemetry, shared across
 * workers' key registries (record key -> active key -> remaining keys).
 */

import type { PrivateKeyRegistry } from './r2-key-registry';

export type { PrivateKeyRegistry };
export type DecryptionTelemetryOutcome = 'primary-hit' | 'fallback-hit' | 'all-failed';

export interface PrivateKeyCandidate {
	keyId: string;
	privateKeyPem: string;
}

function getNonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function buildPrivateKeyCandidates(recordKeyId: string | null, registry: PrivateKeyRegistry): PrivateKeyCandidate[] {
	const candidates: PrivateKeyCandidate[] = [];
	const seen = new Set<string>();

	const appendCandidate = (candidateKeyId: string | null): void => {
		if (!candidateKeyId || seen.has(candidateKeyId)) {
			return;
		}

		const privateKeyPem = registry.keys[candidateKeyId];
		if (!privateKeyPem) {
			return;
		}

		seen.add(candidateKeyId);
		candidates.push({ keyId: candidateKeyId, privateKeyPem });
	};

	appendCandidate(getNonEmptyString(recordKeyId));
	appendCandidate(registry.activeKeyId);

	for (const keyId of Object.keys(registry.keys)) {
		appendCandidate(keyId);
	}

	return candidates;
}

export function logKeyRegistryDecryptionTelemetry(input: {
	scope: string;
	recordKeyId: string | null;
	selectedKeyId: string | null;
	attemptCount: number;
	outcome: DecryptionTelemetryOutcome;
	reason?: string;
}): void {
	const details = {
		scope: input.scope,
		recordKeyId: input.recordKeyId,
		selectedKeyId: input.selectedKeyId,
		attemptCount: input.attemptCount,
		fallbackUsed: input.outcome === 'fallback-hit',
		outcome: input.outcome,
		reason: input.reason ?? null,
	};

	if (input.outcome === 'all-failed') {
		console.warn('Key registry decryption failed', details);
		return;
	}

	console.info('Key registry decryption resolved', details);
}
