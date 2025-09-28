// Import-related types and interfaces

export interface ImportOptions {
  overwriteExisting?: boolean;
  validateIntegrity?: boolean;
  preserveTimestamps?: boolean;
}

export interface ImportResult {
  success: boolean;
  caseNumber: string;
  isReadOnly: boolean;
  filesImported: number;
  annotationsImported: number;
  errors?: string[];
  warnings?: string[];
}

export interface ReadOnlyCaseMetadata {
  caseNumber: string;
  importedAt: string;
  originalExportDate: string;
  originalExportedBy: string;
  sourceHash?: string;
  isReadOnly: true;
}

export interface ConfirmationImportResult {
  success: boolean;
  caseNumber: string;
  confirmationsImported: number;
  imagesUpdated: number;
  errors?: string[];
  warnings?: string[];
}

export interface R2ObjectMetadata {
  lastModified: string;
  size: number;
  etag: string;
}

export interface ConfirmationImportData {
  metadata: {
    caseNumber: string;
    exportDate: string;
    exportedBy: string;
    exportedByUid: string;
    exportedByName: string;
    exportedByCompany: string;
    totalConfirmations: number;
    version: string;
    hash: string;
    originalExportCreatedAt?: string;
  };
  confirmations: {
    [originalImageId: string]: Array<{
      fullName: string;
      badgeId: string;
      timestamp: string;
      confirmationId: string;
      confirmedBy: string;
      confirmedByEmail: string;
      confirmedByCompany: string;
      confirmedAt: string;
    }>;
  };
}

export interface CaseImportPreview {
  caseNumber: string;
  exportedBy: string | null;
  exportedByName: string | null;
  exportedByCompany: string | null;
  exportDate: string;
  totalFiles: number;
  caseCreatedDate?: string;
  hashValid?: boolean;
  hashError?: string;
  expectedHash?: string;
  actualHash?: string;
  hasAnnotations: boolean;
  validationSummary: string;
  errors?: string[];
  // Enhanced validation details
  validationDetails?: {
    hasForensicManifest: boolean;
    dataValid?: boolean;
    imageValidation?: { [filename: string]: boolean };
    manifestValid?: boolean;
    validationSummary?: string;
    integrityErrors?: string[];
  };
}