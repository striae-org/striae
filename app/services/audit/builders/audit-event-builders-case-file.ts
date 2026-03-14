import { User } from 'firebase/auth';
import { AuditResult, CreateAuditEntryParams } from '~/types';
import { getAuditFileTypeFromMime, isImageMimeType } from '../audit-file-type';

interface BuildCaseCreationAuditParamsInput {
  user: User;
  caseNumber: string;
  caseName: string;
}

export const buildCaseCreationAuditParams = (
  input: BuildCaseCreationAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'case-create',
    result: 'success',
    fileName: `${input.caseNumber}.case`,
    fileType: 'case-package',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    caseDetails: {
      newCaseName: input.caseName,
      createdDate: new Date().toISOString(),
      totalFiles: 0,
      totalAnnotations: 0
    }
  };
};

interface BuildCaseRenameAuditParamsInput {
  user: User;
  caseNumber: string;
  oldName: string;
  newName: string;
}

export const buildCaseRenameAuditParams = (
  input: BuildCaseRenameAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'case-rename',
    result: 'success',
    fileName: `${input.caseNumber}.case`,
    fileType: 'case-package',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    caseDetails: {
      oldCaseName: input.oldName,
      newCaseName: input.newName,
      lastModified: new Date().toISOString()
    }
  };
};

interface BuildCaseDeletionAuditParamsInput {
  user: User;
  caseNumber: string;
  caseName: string;
  deleteReason: string;
  backupCreated?: boolean;
}

export const buildCaseDeletionAuditParams = (
  input: BuildCaseDeletionAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'case-delete',
    result: 'success',
    fileName: `${input.caseNumber}.case`,
    fileType: 'case-package',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    caseDetails: {
      newCaseName: input.caseName,
      deleteReason: input.deleteReason,
      backupCreated: input.backupCreated || false,
      lastModified: new Date().toISOString()
    }
  };
};

interface BuildFileUploadAuditParamsInput {
  user: User;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadMethod: 'drag-drop' | 'file-picker' | 'api' | 'import';
  caseNumber: string;
  result?: AuditResult;
  processingTime?: number;
  fileId?: string;
}

export const buildFileUploadAuditParams = (
  input: BuildFileUploadAuditParamsInput
): CreateAuditEntryParams => {
  const result = input.result || 'success';

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'file-upload',
    result,
    fileName: input.fileName,
    fileType: getAuditFileTypeFromMime(input.mimeType),
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    fileDetails: {
      fileId: input.fileId || undefined,
      originalFileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadMethod: input.uploadMethod,
      processingTime: input.processingTime,
      thumbnailGenerated: result === 'success' && isImageMimeType(input.mimeType)
    },
    performanceMetrics: input.processingTime
      ? {
          processingTimeMs: input.processingTime,
          fileSizeBytes: input.fileSize
        }
      : undefined
  };
};

interface BuildFileDeletionAuditParamsInput {
  user: User;
  fileName: string;
  fileSize: number;
  deleteReason: string;
  caseNumber: string;
  fileId?: string;
  originalFileName?: string;
}

export const buildFileDeletionAuditParams = (
  input: BuildFileDeletionAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'file-delete',
    result: 'success',
    fileName: input.fileName,
    fileType: 'unknown',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    fileDetails: {
      fileId: input.fileId || undefined,
      originalFileName: input.originalFileName,
      fileSize: input.fileSize,
      deleteReason: input.deleteReason
    }
  };
};

interface BuildFileAccessAuditParamsInput {
  user: User;
  fileName: string;
  fileId: string;
  accessMethod: 'direct-url' | 'signed-url' | 'download';
  caseNumber: string;
  result?: AuditResult;
  processingTime?: number;
  accessReason?: string;
  originalFileName?: string;
}

export const buildFileAccessAuditParams = (
  input: BuildFileAccessAuditParamsInput
): CreateAuditEntryParams => {
  const result = input.result || 'success';

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'file-access',
    result,
    fileName: input.fileName,
    fileType: 'image-file',
    validationErrors: result === 'failure' ? ['File access failed'] : [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    fileDetails: {
      fileId: input.fileId,
      originalFileName: input.originalFileName,
      fileSize: 0,
      uploadMethod: input.accessMethod,
      processingTime: input.processingTime,
      sourceLocation: input.accessReason || 'Image viewer'
    },
    performanceMetrics: input.processingTime
      ? {
          processingTimeMs: input.processingTime,
          fileSizeBytes: 0
        }
      : undefined
  };
};

interface BuildPDFGenerationAuditParamsInput {
  user: User;
  fileName: string;
  caseNumber: string;
  result: AuditResult;
  processingTime: number;
  fileSize?: number;
  errors?: string[];
  sourceFileId?: string;
  sourceFileName?: string;
}

export const buildPDFGenerationAuditParams = (
  input: BuildPDFGenerationAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'pdf-generate',
    result: input.result,
    fileName: input.fileName,
    fileType: 'pdf-document',
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    performanceMetrics: {
      processingTimeMs: input.processingTime,
      fileSizeBytes: input.fileSize || 0
    },
    fileDetails: input.sourceFileId && input.sourceFileName
      ? {
          fileId: input.sourceFileId,
          originalFileName: input.sourceFileName,
          fileSize: 0
        }
      : undefined
  };
};
