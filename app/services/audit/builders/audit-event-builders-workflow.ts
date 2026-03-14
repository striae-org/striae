import type { User } from 'firebase/auth';
import {
  type AuditFileType,
  type AuditResult,
  type CreateAuditEntryParams,
  type PerformanceMetrics,
  type SecurityCheckResults
} from '~/types';

interface SignatureDetailsInput {
  present?: boolean;
  valid?: boolean;
  keyId?: string;
}

interface BuildCaseExportAuditParamsInput {
  user: User;
  caseNumber: string;
  fileName: string;
  result: AuditResult;
  errors?: string[];
  performanceMetrics?: PerformanceMetrics;
  exportFormat?: 'json' | 'csv' | 'xlsx' | 'zip';
  signatureDetails?: SignatureDetailsInput;
}

const resolveCaseExportFileType = (
  fileName: string,
  exportFormat?: 'json' | 'csv' | 'xlsx' | 'zip'
): AuditFileType => {
  if (exportFormat) {
    switch (exportFormat) {
      case 'json':
        return 'json-data';
      case 'csv':
      case 'xlsx':
        return 'csv-export';
      case 'zip':
      default:
        return 'case-package';
    }
  }

  if (fileName.includes('.json')) return 'json-data';
  if (fileName.includes('.csv') || fileName.includes('.xlsx')) return 'csv-export';
  return 'case-package';
};

export const buildCaseExportAuditParams = (
  input: BuildCaseExportAuditParamsInput
): CreateAuditEntryParams => {
  const securityChecks: SecurityCheckResults = {
    selfConfirmationPrevented: false,
    fileIntegrityValid: input.result === 'success',
    manifestSignaturePresent: input.signatureDetails?.present,
    manifestSignatureValid: input.signatureDetails?.valid,
    manifestSignatureKeyId: input.signatureDetails?.keyId
  };

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'export',
    result: input.result,
    fileName: input.fileName,
    fileType: resolveCaseExportFileType(input.fileName, input.exportFormat),
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    workflowPhase: 'case-export',
    securityChecks,
    performanceMetrics: input.performanceMetrics,
    originalExaminerUid: input.user.uid
  };
};

interface BuildCaseImportAuditParamsInput {
  user: User;
  caseNumber: string;
  fileName: string;
  result: AuditResult;
  hashValid: boolean;
  errors?: string[];
  originalExaminerUid?: string;
  performanceMetrics?: PerformanceMetrics;
  exporterUidValidated?: boolean;
  signatureDetails?: SignatureDetailsInput;
}

export const buildCaseImportAuditParams = (
  input: BuildCaseImportAuditParamsInput
): CreateAuditEntryParams => {
  const securityChecks: SecurityCheckResults = {
    selfConfirmationPrevented: input.originalExaminerUid
      ? input.originalExaminerUid !== input.user.uid
      : false,
    fileIntegrityValid: input.hashValid,
    exporterUidValidated:
      input.exporterUidValidated !== undefined
        ? input.exporterUidValidated
        : !!input.originalExaminerUid,
    manifestSignaturePresent: input.signatureDetails?.present,
    manifestSignatureValid: input.signatureDetails?.valid,
    manifestSignatureKeyId: input.signatureDetails?.keyId
  };

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'import',
    result: input.result,
    fileName: input.fileName,
    fileType: 'case-package',
    hashValid: input.hashValid,
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    workflowPhase: 'case-import',
    securityChecks,
    performanceMetrics: input.performanceMetrics,
    originalExaminerUid: input.originalExaminerUid,
    reviewingExaminerUid: input.user.uid
  };
};

interface BuildConfirmationCreationAuditParamsInput {
  user: User;
  caseNumber: string;
  confirmationId: string;
  result: AuditResult;
  errors?: string[];
  originalExaminerUid?: string;
  performanceMetrics?: PerformanceMetrics;
  imageFileId?: string;
  originalImageFileName?: string;
}

export const buildConfirmationCreationAuditParams = (
  input: BuildConfirmationCreationAuditParamsInput
): CreateAuditEntryParams => {
  const securityChecks: SecurityCheckResults = {
    selfConfirmationPrevented: false,
    fileIntegrityValid: true
  };

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'confirm',
    result: input.result,
    fileName: `confirmation-${input.confirmationId}`,
    fileType: 'confirmation-data',
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    confirmationId: input.confirmationId,
    workflowPhase: 'confirmation',
    securityChecks,
    performanceMetrics: input.performanceMetrics,
    originalExaminerUid: input.originalExaminerUid,
    reviewingExaminerUid: input.user.uid,
    fileDetails: input.imageFileId && input.originalImageFileName
      ? {
          fileId: input.imageFileId,
          originalFileName: input.originalImageFileName,
          fileSize: 0
        }
      : undefined
  };
};

interface BuildConfirmationExportAuditParamsInput {
  user: User;
  caseNumber: string;
  fileName: string;
  result: AuditResult;
  errors?: string[];
  originalExaminerUid?: string;
  performanceMetrics?: PerformanceMetrics;
  signatureDetails?: SignatureDetailsInput;
}

export const buildConfirmationExportAuditParams = (
  input: BuildConfirmationExportAuditParamsInput
): CreateAuditEntryParams => {
  const securityChecks: SecurityCheckResults = {
    selfConfirmationPrevented: false,
    fileIntegrityValid: input.result === 'success',
    manifestSignaturePresent: input.signatureDetails?.present,
    manifestSignatureValid: input.signatureDetails?.valid,
    manifestSignatureKeyId: input.signatureDetails?.keyId
  };

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'export',
    result: input.result,
    fileName: input.fileName,
    fileType: 'confirmation-data',
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    workflowPhase: 'confirmation',
    securityChecks,
    performanceMetrics: input.performanceMetrics,
    originalExaminerUid: input.originalExaminerUid,
    reviewingExaminerUid: input.user.uid
  };
};

interface BuildConfirmationImportAuditParamsInput {
  user: User;
  caseNumber: string;
  fileName: string;
  result: AuditResult;
  hashValid: boolean;
  confirmationsImported: number;
  errors?: string[];
  reviewingExaminerUid?: string;
  performanceMetrics?: PerformanceMetrics;
  exporterUidValidated?: boolean;
  totalConfirmationsInFile?: number;
  signatureDetails?: SignatureDetailsInput;
}

export const buildConfirmationImportAuditParams = (
  input: BuildConfirmationImportAuditParamsInput
): CreateAuditEntryParams => {
  const securityChecks: SecurityCheckResults = {
    selfConfirmationPrevented: input.reviewingExaminerUid
      ? input.reviewingExaminerUid === input.user.uid
      : false,
    fileIntegrityValid: input.hashValid,
    exporterUidValidated:
      input.exporterUidValidated !== undefined
        ? input.exporterUidValidated
        : !!input.reviewingExaminerUid,
    manifestSignaturePresent: input.signatureDetails?.present,
    manifestSignatureValid: input.signatureDetails?.valid,
    manifestSignatureKeyId: input.signatureDetails?.keyId
  };

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'import',
    result: input.result,
    fileName: input.fileName,
    fileType: 'confirmation-data',
    hashValid: input.hashValid,
    validationErrors: input.errors || [],
    caseNumber: input.caseNumber,
    workflowPhase: 'confirmation',
    securityChecks,
    performanceMetrics: input.performanceMetrics
      ? {
          ...input.performanceMetrics,
          validationStepsCompleted: input.confirmationsImported,
          validationStepsFailed: (input.errors || []).length
        }
      : {
          processingTimeMs: 0,
          fileSizeBytes: 0,
          validationStepsCompleted: input.confirmationsImported,
          validationStepsFailed: (input.errors || []).length
        },
    originalExaminerUid: input.user.uid,
    reviewingExaminerUid: input.reviewingExaminerUid,
    caseDetails: input.totalConfirmationsInFile !== undefined
      ? {
          totalAnnotations: input.totalConfirmationsInFile
        }
      : undefined
  };
};
