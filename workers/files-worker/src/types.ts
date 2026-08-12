export interface Env {
  STRIAE_FILES: R2Bucket;
  STRIAE_CONFIG: R2Bucket;
  REGISTRY_ENCRYPTION_KEY: string;
  DATA_AT_REST_ENCRYPTION_PRIVATE_KEY?: string;
  DATA_AT_REST_ENCRYPTION_PUBLIC_KEY: string;
  DATA_AT_REST_ENCRYPTION_KEY_ID: string;
  DATA_AT_REST_ENCRYPTION_KEYS_JSON?: string;
  DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID?: string;
  FILES_SIGNED_URL_SECRET?: string;
  FILES_SIGNED_URL_TTL_SECONDS?: string;
  FILES_SIGNED_URL_BASE_URL?: string;
  FILES_UPLOAD_RATE_LIMIT_PER_MINUTE?: string;
  FILES_SIGNED_URL_RATE_LIMIT_PER_MINUTE?: string;
  FILES_DELETE_RATE_LIMIT_PER_MINUTE?: string;
  FILES_MALWARE_SCAN_HOOK_URL?: string;
  FILES_MALWARE_SCAN_HOOK_TIMEOUT_MS?: string;
  FILES_MALWARE_SCAN_HOOK_TOKEN?: string;
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

export interface UploadResult {
  id: string;
  filename: string;
  uploaded: string;
  malwareScan?: MalwareScanStatus;
}

export type MalwareScanState = 'pending' | 'clean' | 'infected' | 'error';
export type MalwareScanHookState = 'queued' | 'unavailable' | 'failed';

export interface MalwareScanStatus {
  scanState: MalwareScanState;
  hookState: MalwareScanHookState;
  updatedAt: string;
  hookConfigured: boolean;
  hookError?: string;
}

export interface UploadResponse {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: UploadResult;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: string;
}

export interface SignedUrlResult {
  fileId: string;
  url: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export interface SignedUrlResponse {
  success: boolean;
  result: SignedUrlResult;
}

export type APIResponse = UploadResponse | SuccessResponse | ErrorResponse | SignedUrlResponse;

export interface SignedAccessPayload {
  fileId: string;
  iat: number;
  exp: number;
  nonce: string;
}

export type CreateResponse = (data: APIResponse, status?: number) => Response;