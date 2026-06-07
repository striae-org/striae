export interface Env {
  USER_DB: KVNamespace;
  STRIAE_DATA: R2Bucket;
  STRIAE_FILES: R2Bucket;
  STRIAE_CONFIG: R2Bucket;
  DATA_AT_REST_ENCRYPTION_PRIVATE_KEY?: string;
  DATA_AT_REST_ENCRYPTION_KEY_ID?: string;
  DATA_AT_REST_ENCRYPTION_KEYS_JSON?: string;
  DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID?: string;
  PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  USER_KV_ENCRYPTION_PRIVATE_KEY: string;
  USER_KV_ENCRYPTION_PUBLIC_KEY: string;
  USER_KV_ENCRYPTION_KEY_ID: string;
  USER_KV_ENCRYPTION_KEYS_JSON?: string;
  USER_KV_ENCRYPTION_ACTIVE_KEY_ID?: string;
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

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  error: string;
}

export type APIResponse = SuccessResponse | ErrorResponse | UserData;

export type CreateResponse = (data: APIResponse, status?: number) => Response;

export interface CaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: unknown;
}

export interface ReadOnlyCaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: unknown;
}

export interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  badgeId?: string;
  permitted: boolean;
  cases: CaseItem[];
  readOnlyCases?: ReadOnlyCaseItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredCaseFileData {
  id: string;
}

export interface StoredCaseData {
  files?: StoredCaseFileData[];
}

export interface UserRequestData {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  badgeId?: string;
  permitted?: boolean;
  readOnlyCases?: ReadOnlyCaseItem[];
}

export interface AddCasesRequest {
  cases: CaseItem[];
}

export interface DeleteCasesRequest {
  casesToDelete: string[];
}

export interface AccountDeletionProgressEvent {
  event: 'start' | 'case-start' | 'case-complete' | 'complete' | 'error';
  totalCases: number;
  completedCases: number;
  currentCaseNumber?: string;
  success?: boolean;
  message?: string;
}

export interface GoogleOAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface FirebaseDeleteAccountErrorResponse {
  error?: {
    message?: string;
  };
}

export type ResponseHeaders = Record<string, string>;