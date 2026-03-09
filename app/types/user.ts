// User-related types and interfaces

import { ReadOnlyCaseMetadata } from './import';

export interface UserData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: Array<{
    caseNumber: string;
    createdAt: string;
  }>;
  readOnlyCases?: Array<{
    caseNumber: string;
    importedAt: string;
    originalExportDate: string;
    originalExportedBy: string;
    sourceHash?: string;
    sourceManifestVersion?: string;
    sourceSignatureKeyId?: string;
    sourceSignatureValid?: boolean;
    isReadOnly: true;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface ExtendedUserData extends UserData {
  readOnlyCases?: ReadOnlyCaseMetadata[];
}

export interface UserLimits {
  maxCases: number;
  maxFilesPerCase: number;
}