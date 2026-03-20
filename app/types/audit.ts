// Audit trail types for comprehensive forensic accountability framework
// Tracks all user actions and system events throughout the application

export type AuditAction = 
  // Case Management Actions
  | 'case-create' | 'case-rename' | 'case-delete'
  // Confirmation Workflow Actions  
  | 'case-export' | 'case-import' | 'confirmation-create' | 'confirmation-export' | 'confirmation-import'
  // File Operations
  | 'file-upload' | 'file-delete' | 'file-access'
  // Annotation Operations
  | 'annotation-create' | 'annotation-edit' | 'annotation-delete'
  // User & Session Management
  | 'user-login' | 'user-logout' | 'user-profile-update' | 'user-password-reset' | 'user-account-delete'
  // NEW: User Registration & Authentication
  | 'user-registration' | 'email-verification' | 'mfa-enrollment' | 'mfa-authentication'
  // Document Generation
  | 'pdf-generate'
  // Security & Monitoring
  | 'security-violation'
  // Legacy actions (for backward compatibility)
  | 'import' | 'export' | 'confirm' | 'validate';

export type AuditResult = 'success' | 'failure' | 'warning' | 'blocked' | 'pending';

export type AuditFileType = 
  | 'case-package' | 'confirmation-data' | 'image-file' | 'pdf-document' 
  | 'json-data' | 'csv-export' | 'log-file' | 'unknown';

/**
 * Core audit entry structure for all validation events
 * Based on the specification in confirmations-guide.md
 */
export interface ValidationAuditEntry {
  timestamp: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  result: AuditResult;
  details: AuditDetails;
}

/**
 * Detailed information for each audit entry
 * Contains action-specific data and metadata
 */
export interface AuditDetails {
  // Core identification
  fileName?: string;
  fileType?: AuditFileType;
  caseNumber?: string;
  confirmationId?: string;
  
  // Validation & Security
  hashValid?: boolean;
  validationErrors: string[];
  securityChecks?: SecurityCheckResults;
  
  // Context & Workflow
  originalExaminerUid?: string;
  reviewingExaminerUid?: string;
  reviewerBadgeId?: string;
  workflowPhase?: WorkflowPhase;
  
  // Performance & Metrics
  performanceMetrics?: PerformanceMetrics;
  
  // Case Management Details
  caseDetails?: CaseAuditDetails;
  
  // File Operation Details
  fileDetails?: FileAuditDetails;
  
  // Annotation Details
  annotationDetails?: AnnotationAuditDetails;
  
  // User Session Details
  sessionDetails?: SessionAuditDetails;
  
  // Security Incident Details
  securityDetails?: SecurityAuditDetails;
  
  // User Profile & Authentication Details
  userProfileDetails?: UserProfileAuditDetails;
}

/**
 * Workflow phases for tracking different types of forensic activities
 */
export type WorkflowPhase = 
  | 'casework'             // All case, notes, image, and pdf related actions
  | 'case-export'          // Only case exporting
  | 'case-import'          // Only case importing  
  | 'confirmation'         // Only confirmation-related activity
  | 'user-management';     // User login, logout, profile management, account activities

/**
 * Security validation results
 */
export interface SecurityCheckResults {
  selfConfirmationPrevented: boolean;
  fileIntegrityValid: boolean;
  exporterUidValidated?: boolean;
  manifestSignaturePresent?: boolean;
  manifestSignatureValid?: boolean;
  manifestSignatureKeyId?: string;
}

/**
 * Performance and operational metrics
 */
export interface PerformanceMetrics {
  processingTimeMs: number;
  fileSizeBytes: number;
  validationStepsCompleted?: number;
  validationStepsFailed?: number;
}

/**
 * Complete audit trail for a case or workflow
 */
export interface AuditTrail {
  caseNumber: string;
  workflowId: string; // Unique identifier linking related audit entries
  entries: ValidationAuditEntry[];
  summary: AuditSummary;
}

/**
 * Summary of audit trail for reporting and compliance
 */
export interface AuditSummary {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  warningEvents: number;
  workflowPhases: WorkflowPhase[];
  participatingUsers: string[]; // User IDs
  startTimestamp: string;
  endTimestamp: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'pending';
  securityIncidents: number;
}

/**
 * Audit entry creation parameters
 */
export interface CreateAuditEntryParams {
  userId: string;
  userEmail: string;
  action: AuditAction;
  result: AuditResult;
  fileName?: string;
  fileType?: AuditFileType;
  hashValid?: boolean;
  validationErrors?: string[];
  caseNumber?: string;
  confirmationId?: string;
  workflowPhase?: WorkflowPhase;
  securityChecks?: SecurityCheckResults;
  performanceMetrics?: PerformanceMetrics;
  originalExaminerUid?: string;
  reviewingExaminerUid?: string;
  reviewerBadgeId?: string;
  // Extended detail fields
  caseDetails?: CaseAuditDetails;
  fileDetails?: FileAuditDetails;
  annotationDetails?: AnnotationAuditDetails;
  sessionDetails?: SessionAuditDetails;
  securityDetails?: SecurityAuditDetails;
  userProfileDetails?: UserProfileAuditDetails;
}

/**
 * Query parameters for retrieving audit entries
 */
export interface AuditQueryParams {
  caseNumber?: string;
  workflowId?: string;
  userId?: string;
  action?: AuditAction;
  result?: AuditResult;
  workflowPhase?: WorkflowPhase;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// SPECIALIZED AUDIT DETAIL INTERFACES
// =============================================================================

/**
 * Case management specific audit details
 */
export interface CaseAuditDetails {
  oldCaseName?: string;
  newCaseName?: string;
  totalFiles?: number;
  totalAnnotations?: number;
  createdDate?: string;
  lastModified?: string;
  deleteReason?: string;
  backupCreated?: boolean;
}

/**
 * File operation specific audit details
 */
export interface FileAuditDetails {
  fileId?: string;
  originalFileName?: string;
  fileSize: number;
  mimeType?: string;
  uploadMethod?: 'drag-drop' | 'file-picker' | 'api' | 'import' | 'direct-url' | 'signed-url' | 'download';
  processingTime?: number;
  thumbnailGenerated?: boolean;
  deleteReason?: string;
  sourceLocation?: string;
}

/**
 * Annotation operation specific audit details
 */
export interface AnnotationAuditDetails {
  annotationId?: string;
  annotationType?: 'measurement' | 'identification' | 'comparison' | 'note' | 'region';
  annotationData?: unknown; // The actual annotation data structure
  canvasPosition?: { x: number; y: number };
  annotationSize?: { width: number; height: number };
  previousValue?: unknown; // For edit operations
  tool?: string; // Which tool was used to create/edit
}

/**
 * User session specific audit details
 */
export interface SessionAuditDetails {
  sessionId?: string;
  userAgent?: string;
  sessionDuration?: number;
  loginMethod?: 'firebase' | 'sso' | 'api-key' | 'manual';
  logoutReason?: 'user-initiated' | 'timeout' | 'security' | 'error';
}

/**
 * Security incident specific audit details
 */
export interface SecurityAuditDetails {
  incidentType?: 'unauthorized-access' | 'data-breach' | 'malware' | 'injection' | 'brute-force' | 'privilege-escalation';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  targetResource?: string;
  blockedBySystem?: boolean;
  investigationId?: string;
  reportedToAuthorities?: boolean;
  mitigationSteps?: string[];
  // MFA specific fields
  mfaMethod?: 'sms' | 'totp' | 'hardware-key';
  phoneNumber?: string; // Masked phone number for privacy
  enrollmentAttempts?: number;
  enrollmentDate?: string;
  mandatoryEnrollment?: boolean;
  backupCodesGenerated?: boolean;
  verificationAttempts?: number;
  authenticationDate?: string;
  loginFlowStep?: 'first-factor' | 'second-factor';
}

/**
 * User profile and authentication specific audit details
 */
export interface UserProfileAuditDetails {
  profileField?: 'displayName' | 'email' | 'organization' | 'role' | 'preferences' | 'avatar' | 'badgeId';
  oldValue?: string;
  newValue?: string;
  badgeId?: string;
  resetMethod?: 'email' | 'sms' | 'security-questions' | 'admin-reset';
  resetToken?: string; // Partial token for tracking (last 4 chars)
  verificationMethod?: 'email-link' | 'sms-code' | 'totp' | 'backup-codes' | 'admin-verification';
  verificationAttempts?: number;
  passwordComplexityMet?: boolean;
  previousPasswordReused?: boolean;
  // Account deletion specific fields
  deletionReason?: 'user-requested' | 'admin-initiated' | 'policy-violation' | 'inactive-account';
  dataRetentionPeriod?: number; // Days before permanent deletion
  confirmationMethod?: 'uid-email' | 'password' | 'admin-override';
  casesCount?: number; // Number of cases deleted with account
  filesCount?: number; // Number of files deleted with account
  // NEW: User registration specific fields
  registrationMethod?: 'email-password' | 'sso' | 'admin-created' | 'api';
  firstName?: string;
  lastName?: string;
  company?: string;
  emailVerificationRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
  // NEW: Email verification specific fields
  verificationDate?: string;
  emailVerified?: boolean;
  emailNotificationSent?: boolean;
  // NEW: Retroactive verification fields
  retroactiveVerification?: boolean;
  retroactiveReason?: string;
}