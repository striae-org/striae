import { type FileData } from './file';
import { type AnnotationData, type ConfirmationData } from './annotations';

// Case-related types and interfaces

export type CaseActionType = 'loaded' | 'created' | 'deleted' | null;

export interface CaseData {
  createdAt: string;
  caseNumber: string;
  files: FileData[];
}

export interface ReadOnlyCaseData extends CaseData {
  isReadOnly?: boolean;
}

export interface CasesToDelete {
  casesToDelete: string[];
}

export interface CaseExportData {
  metadata: {
    caseNumber: string;
    caseCreatedDate: string;
    exportDate: string;
    exportedBy: string | null;
    exportedByUid: string;
    exportedByName: string;
    exportedByCompany: string;
    striaeExportSchemaVersion: string;
    totalFiles: number;
  };
  files: Array<{
    fileData: FileData;
    annotations?: AnnotationData;
    hasAnnotations: boolean;
  }>;
  summary?: {
    filesWithAnnotations: number;
    filesWithoutAnnotations: number;
    totalBoxAnnotations: number;
    filesWithConfirmations?: number;
    filesWithConfirmationsRequested?: number;
    lastModified?: string;
    earliestAnnotationDate?: string;
    latestAnnotationDate?: string;
    exportError?: string;
  };
}

export interface AllCasesExportData {
  metadata: {
    exportDate: string;
    exportedBy: string | null;
    exportedByUid: string;
    exportedByName: string;
    exportedByCompany: string;
    striaeExportSchemaVersion: string;
    totalCases: number;
    totalFiles: number;
    totalAnnotations: number;
    totalConfirmations: number;
    totalConfirmationsRequested: number;
  };
  cases: CaseExportData[];
  summary?: {
    casesWithFiles: number;
    casesWithAnnotations: number;
    casesWithoutFiles: number;
    lastModified?: string;
    earliestAnnotationDate?: string;
    latestAnnotationDate?: string;
  };
}

// Confirmation-related case types
export interface CaseConfirmations {
  [originalImageId: string]: ConfirmationData[];
}

export interface CaseDataWithConfirmations {
  createdAt: string;
  caseNumber: string;
  files: FileData[];
  isReadOnly?: boolean;
  importedAt?: string;
  originalImageIds?: { [originalId: string]: string };
  confirmations?: CaseConfirmations;
}