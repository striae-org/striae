import { type ValidationAuditEntry } from '~/types';

export const AUDIT_CSV_ENTRY_HEADERS = [
  'Timestamp',
  'User Email',
  'Action',
  'Result',
  'File Name',
  'File Type',
  'Case Number',
  'Confirmation ID',
  'Original Examiner UID',
  'Reviewing Examiner UID',
  'File ID',
  'Original Filename',
  'File Size (MB)',
  'MIME Type',
  'Upload Method',
  'Delete Reason',
  'Annotation ID',
  'Annotation Type',
  'Annotation Tool',
  'Session ID',
  'User Agent',
  'Processing Time (ms)',
  'Hash Valid',
  'Validation Errors',
  'Security Issues',
  'Workflow Phase',
  'Profile Field',
  'Old Value',
  'New Value',
  'Badge/ID',
  'Total Confirmations In File',
  'Confirmations Successfully Imported',
  'Validation Steps Failed',
  'Case Name',
  'Total Files',
  'MFA Method',
  'Security Incident Type',
  'Security Severity',
  'Confirmed Files'
];

export const formatForCSV = (value?: string | number | null): string => {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const getSecurityIssues = (entry: ValidationAuditEntry): string => {
  const securityChecks = entry.details.securityChecks;
  if (!securityChecks) {
    return '';
  }

  const issues = [];

  if (securityChecks.selfConfirmationPrevented === true) {
    issues.push('selfConfirmationPrevented');
  }

  if (securityChecks.fileIntegrityValid === false) {
    issues.push('fileIntegrityValid');
  }

  if (securityChecks.exporterUidValidated === false) {
    issues.push('exporterUidValidated');
  }

  return issues.join('; ');
};

export const entryToCSVRow = (entry: ValidationAuditEntry): string => {
  const fileDetails = entry.details.fileDetails;
  const annotationDetails = entry.details.annotationDetails;
  const sessionDetails = entry.details.sessionDetails;
  const userProfileDetails = entry.details.userProfileDetails;
  const caseDetails = entry.details.caseDetails;
  const performanceMetrics = entry.details.performanceMetrics;
  const securityDetails = entry.details.securityDetails;
  const securityIssues = getSecurityIssues(entry);

  const values = [
    formatForCSV(entry.timestamp),
    formatForCSV(entry.userEmail),
    formatForCSV(entry.action),
    formatForCSV(entry.result),
    formatForCSV(entry.details.fileName),
    formatForCSV(entry.details.fileType),
    formatForCSV(entry.details.caseNumber),
    formatForCSV(entry.details.confirmationId),
    formatForCSV(entry.details.originalExaminerUid),
    formatForCSV(entry.details.reviewingExaminerUid),
    formatForCSV(fileDetails?.fileId),
    formatForCSV(fileDetails?.originalFileName),
    fileDetails?.fileSize ? (fileDetails.fileSize / 1024 / 1024).toFixed(2) : '',
    formatForCSV(fileDetails?.mimeType),
    formatForCSV(fileDetails?.uploadMethod),
    formatForCSV(fileDetails?.deleteReason),
    formatForCSV(annotationDetails?.annotationId),
    formatForCSV(annotationDetails?.annotationType),
    formatForCSV(annotationDetails?.tool),
    formatForCSV(sessionDetails?.sessionId),
    formatForCSV(sessionDetails?.userAgent),
    performanceMetrics?.processingTimeMs || '',
    entry.details.hashValid !== undefined ? (entry.details.hashValid ? 'Yes' : 'No') : '',
    formatForCSV(entry.details.validationErrors?.join('; ')),
    formatForCSV(securityIssues),
    formatForCSV(entry.details.workflowPhase),
    formatForCSV(userProfileDetails?.profileField),
    formatForCSV(userProfileDetails?.oldValue),
    formatForCSV(userProfileDetails?.newValue),
    formatForCSV(userProfileDetails?.badgeId),
    caseDetails?.totalAnnotations?.toString() || '',
    performanceMetrics?.validationStepsCompleted?.toString() || '',
    performanceMetrics?.validationStepsFailed?.toString() || '',
    formatForCSV(caseDetails?.newCaseName || caseDetails?.oldCaseName),
    caseDetails?.totalFiles?.toString() || '',
    formatForCSV(securityDetails?.mfaMethod),
    formatForCSV(securityDetails?.incidentType),
    formatForCSV(securityDetails?.severity),
    formatForCSV(caseDetails?.confirmedFileNames?.join('; '))
  ];

  return values.join(',');
};
