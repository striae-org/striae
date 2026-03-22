import type { User } from 'firebase/auth';
import type { ForensicManifestSignature } from '~/utils/forensics/SHA256';

import type { AnnotationData } from '~/types';

export interface DataAccessResult {
  allowed: boolean;
  reason?: string;
}

export interface FileUpdate {
  fileId: string;
  annotations: AnnotationData;
}

export interface BatchUpdateResult {
  successful: string[];
  failed: { fileId: string; error: string }[];
}

export interface DataOperationOptions {
  includeTimestamp?: boolean;
  retryCount?: number;
  skipValidation?: boolean;
}

export interface ManifestSigningResponse {
  manifestVersion: string;
  signature: ForensicManifestSignature;
}

export interface ConfirmationSigningResponse {
  signatureVersion: string;
  signature: ForensicManifestSignature;
}

export interface AuditExportSigningResponse {
  signatureVersion: string;
  signature: ForensicManifestSignature;
}

export type DataOperation<T> = (user: User, ...args: unknown[]) => Promise<T>;
