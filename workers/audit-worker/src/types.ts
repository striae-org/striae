export interface Env {
  STRIAE_AUDIT: R2Bucket;
  STRIAE_CONFIG: R2Bucket;
  REGISTRY_ENCRYPTION_KEY: string;
  DATA_AT_REST_ENCRYPTION_ENABLED?: string;
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

export interface PrivateKeyRegistry {
  activeKeyId: string | null;
  keys: Record<string, string>;
}

export type DecryptionTelemetryOutcome = 'primary-hit' | 'fallback-hit' | 'all-failed';

export interface AuditEntry {
  timestamp: string;
  userId: string;
  action: string;
  [key: string]: unknown;
}

export interface SuccessResponse {
  success: boolean;
  entryCount?: number;
  filename?: string;
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

export interface DataAtRestEnvelope {
  algorithm: string;
  encryptionVersion: string;
  keyId: string;
  dataIv: string;
  wrappedKey: string;
}