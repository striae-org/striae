// User-related types and interfaces

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
  createdAt: string;
  updatedAt?: string;
}

export interface UserLimits {
  maxCases: number;
  maxFilesPerCase: number;
}

export interface UserPermissions {
  canCreateCases: boolean;
  canUploadFiles: boolean;
  canDeleteCases: boolean;
  canExportPDF: boolean;
}