// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

export interface Env {
	STRIAE_DATA: R2Bucket;
	STRIAE_CONFIG: R2Bucket;
	USER_WORKER: Fetcher;
	REGISTRY_ENCRYPTION_KEY: string;
	MANIFEST_SIGNING_PRIVATE_KEY?: string;
	MANIFEST_SIGNING_KEY_ID?: string;
	MANIFEST_SIGNING_KEYS_JSON?: string;
	MANIFEST_SIGNING_ACTIVE_KEY_ID?: string;
	EXPORT_ENCRYPTION_PRIVATE_KEY?: string;
	EXPORT_ENCRYPTION_KEY_ID?: string;
	EXPORT_ENCRYPTION_KEYS_JSON?: string;
	EXPORT_ENCRYPTION_ACTIVE_KEY_ID?: string;
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

export interface ExportDecryptionContext {
	recordKeyId: string | null;
	candidates: Array<{ keyId: string; privateKeyPem: string }>;
	primaryKeyId: string | null;
}

export interface SuccessResponse {
	success: boolean;
}

export interface ErrorResponse {
	error: string;
}

export type APIResponse = SuccessResponse | ErrorResponse | unknown[] | Record<string, unknown>;

export type CreateResponse = (data: APIResponse, status?: number) => Response;
