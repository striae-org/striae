// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

export interface Env {
	STRIAE_AUDIT: R2Bucket;
	STRIAE_CONFIG: R2Bucket;
	REGISTRY_ENCRYPTION_KEY: string;
	DATA_AT_REST_ENCRYPTION_PRIVATE_KEY?: string;
	DATA_AT_REST_ENCRYPTION_PUBLIC_KEY?: string;
	DATA_AT_REST_ENCRYPTION_KEY_ID?: string;
	DATA_AT_REST_ENCRYPTION_KEYS_JSON?: string;
	DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID?: string;
}

export interface KeyRegistryPayload {
	activeKeyId?: unknown;
	keys?: unknown;
}

export type { PrivateKeyRegistry, DecryptionTelemetryOutcome } from '../../../shared/registry/key-candidates';

export interface AuditEntry {
	entryId: string;
	timestamp: string;
	userId: string;
	action: string;
	[key: string]: unknown;
}

export interface SuccessResponse {
	success: boolean;
	entryCount?: number;
	filename?: string;
	deduped?: boolean;
}

export interface ErrorResponse {
	error: string;
}

export interface AuditRetrievalResponse {
	entries: AuditEntry[];
	total: number;
}

export type APIResponse = SuccessResponse | ErrorResponse | AuditRetrievalResponse | Record<string, unknown>;

export type CreateResponse = (data: APIResponse, status?: number) => Response;

export type { DataAtRestEnvelope } from '../../../shared/crypto/rsa-oaep-private';
