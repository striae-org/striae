import { FileData } from './file';
import { AnnotationData } from './annotations';

// Case-related types and interfaces

export interface CaseData {
  createdAt: string;
  caseNumber: string;
  files: FileData[];
}

export interface CaseMetadata {
  caseNumber: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
}

export interface CasesToDelete {
  casesToDelete: string[];
}

export interface CaseApiResponse {
  files: FileData[];
  metadata?: CaseMetadata;
}

export interface CaseExportData {
  metadata: {
    caseNumber: string;
    exportDate: string;
    exportedBy: string | null;
    exportVersion: string;
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
    lastModified?: string;
    exportError?: string;
  };
}

export interface AllCasesExportData {
  metadata: {
    exportDate: string;
    exportedBy: string | null;
    exportVersion: string;
    totalCases: number;
    totalFiles: number;
    totalAnnotations: number;
  };
  cases: CaseExportData[];
  summary?: {
    casesWithFiles: number;
    casesWithAnnotations: number;
    casesWithoutFiles: number;
    lastModified?: string;
  };
}