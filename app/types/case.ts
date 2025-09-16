import { FileData } from './file';

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