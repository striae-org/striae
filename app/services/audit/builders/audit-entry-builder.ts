import { type CreateAuditEntryParams, type ValidationAuditEntry } from '~/types';

export const buildValidationAuditEntry = (
  params: CreateAuditEntryParams,
  timestamp: string = new Date().toISOString()
): ValidationAuditEntry => {
  return {
    timestamp,
    userId: params.userId,
    userEmail: params.userEmail,
    action: params.action,
    result: params.result,
    details: {
      fileName: params.fileName,
      fileType: params.fileType,
      hashValid: params.hashValid,
      validationErrors: params.validationErrors || [],
      caseNumber: params.caseNumber,
      confirmationId: params.confirmationId,
      originalExaminerUid: params.originalExaminerUid,
      reviewingExaminerUid: params.reviewingExaminerUid,
      workflowPhase: params.workflowPhase,
      securityChecks: params.securityChecks,
      performanceMetrics: params.performanceMetrics,
      caseDetails: params.caseDetails,
      fileDetails: params.fileDetails,
      annotationDetails: params.annotationDetails,
      sessionDetails: params.sessionDetails,
      securityDetails: params.securityDetails,
      userProfileDetails: params.userProfileDetails
    }
  };
};
