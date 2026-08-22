import type { Env } from './types';

export function requireUserKvReadConfig(env: Env): void {
	const hasLegacyPrivateKey =
		typeof env.USER_KV_ENCRYPTION_PRIVATE_KEY === 'string' && env.USER_KV_ENCRYPTION_PRIVATE_KEY.trim().length > 0;
	const hasRegistryPrivateKeys = typeof env.USER_KV_ENCRYPTION_KEYS_JSON === 'string' && env.USER_KV_ENCRYPTION_KEYS_JSON.trim().length > 0;

	if (!hasLegacyPrivateKey && !hasRegistryPrivateKeys) {
		throw new Error('User KV encryption is not fully configured');
	}
}

export function requireUserKvWriteConfig(env: Env): void {
	const hasLegacyPrivateKey =
		typeof env.USER_KV_ENCRYPTION_PRIVATE_KEY === 'string' && env.USER_KV_ENCRYPTION_PRIVATE_KEY.trim().length > 0;
	const hasRegistryPrivateKeys = typeof env.USER_KV_ENCRYPTION_KEYS_JSON === 'string' && env.USER_KV_ENCRYPTION_KEYS_JSON.trim().length > 0;

	if (!env.USER_KV_ENCRYPTION_PUBLIC_KEY || !env.USER_KV_ENCRYPTION_KEY_ID || (!hasLegacyPrivateKey && !hasRegistryPrivateKeys)) {
		throw new Error('User KV encryption is not fully configured');
	}
}
