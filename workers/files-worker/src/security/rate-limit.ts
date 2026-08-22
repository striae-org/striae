import type { Env } from '../types';

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_UPLOAD_LIMIT_PER_MINUTE = 30;
const DEFAULT_SIGNED_URL_LIMIT_PER_MINUTE = 120;
const DEFAULT_DELETE_LIMIT_PER_MINUTE = 30;
const MAX_BUCKETS = 5000;

type RateLimitAction = 'upload' | 'signed-url' | 'delete';

interface RateLimitBucket {
	count: number;
	resetAt: number;
}

interface RateLimitConfig {
	limit: number;
	scope: string;
}

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	retryAfterSeconds: number;
	resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

function parsePositiveInteger(value: string | undefined, fallback: number): number {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
}

function resolveRateLimitConfig(action: RateLimitAction, env: Env): RateLimitConfig {
	switch (action) {
		case 'upload':
			return {
				limit: parsePositiveInteger(env.FILES_UPLOAD_RATE_LIMIT_PER_MINUTE, DEFAULT_UPLOAD_LIMIT_PER_MINUTE),
				scope: 'upload-per-minute',
			};
		case 'signed-url':
			return {
				limit: parsePositiveInteger(env.FILES_SIGNED_URL_RATE_LIMIT_PER_MINUTE, DEFAULT_SIGNED_URL_LIMIT_PER_MINUTE),
				scope: 'signed-url-per-minute',
			};
		case 'delete':
			return {
				limit: parsePositiveInteger(env.FILES_DELETE_RATE_LIMIT_PER_MINUTE, DEFAULT_DELETE_LIMIT_PER_MINUTE),
				scope: 'delete-per-minute',
			};
	}
}

function normalizeActorId(request: Request): string {
	const uidHeader = (request.headers.get('X-Striae-Authenticated-Uid') || '').trim();
	if (uidHeader.length > 0) {
		return `uid:${uidHeader}`;
	}

	const connectingIp = (request.headers.get('CF-Connecting-IP') || '').trim();
	if (connectingIp.length > 0) {
		return `ip:${connectingIp}`;
	}

	const forwardedFor = request.headers.get('X-Forwarded-For') || '';
	const firstForwardedIp = forwardedFor.split(',')[0]?.trim() || '';
	if (firstForwardedIp.length > 0) {
		return `ip:${firstForwardedIp}`;
	}

	return 'anonymous';
}

function cleanupExpiredBuckets(now: number): void {
	if (buckets.size <= MAX_BUCKETS) {
		return;
	}

	for (const [key, bucket] of buckets.entries()) {
		if (bucket.resetAt <= now) {
			buckets.delete(key);
		}
	}
}

export function checkRateLimit(request: Request, env: Env, action: RateLimitAction): RateLimitResult {
	const now = Date.now();
	cleanupExpiredBuckets(now);

	const config = resolveRateLimitConfig(action, env);
	const actorId = normalizeActorId(request);
	const bucketKey = `${config.scope}:${actorId}`;

	const existing = buckets.get(bucketKey);
	if (!existing || existing.resetAt <= now) {
		const resetAt = now + RATE_LIMIT_WINDOW_MS;
		buckets.set(bucketKey, { count: 1, resetAt });

		return {
			allowed: true,
			limit: config.limit,
			remaining: Math.max(config.limit - 1, 0),
			retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
			resetAt,
		};
	}

	if (existing.count >= config.limit) {
		return {
			allowed: false,
			limit: config.limit,
			remaining: 0,
			retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
			resetAt: existing.resetAt,
		};
	}

	existing.count += 1;

	return {
		allowed: true,
		limit: config.limit,
		remaining: Math.max(config.limit - existing.count, 0),
		retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
		resetAt: existing.resetAt,
	};
}
