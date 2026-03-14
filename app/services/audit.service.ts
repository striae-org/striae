import { User } from 'firebase/auth';
import { 
  ValidationAuditEntry, 
  CreateAuditEntryParams, 
  AuditTrail, 
  AuditQueryParams,
  WorkflowPhase,
  AuditAction,
  AuditResult,
  AuditFileType,
  SecurityCheckResults,
  PerformanceMetrics
} from '~/types';
import { generateWorkflowId } from '../utils/id-generator';
import {
  fetchAuditEntriesForUser,
  persistAuditEntryForUser
} from './audit-worker-client';
import {
  applyAuditEntryFilters,
  applyAuditPagination,
  generateAuditSummary,
  sortAuditEntriesNewestFirst
} from './audit-query-helpers';
import { buildValidationAuditEntry } from './audit-entry-builder';
import { logAuditEntryToConsole } from './audit-console-logger';

type AnnotationSnapshot = Record<string, unknown> & {
  type?: 'measurement' | 'identification' | 'comparison' | 'note' | 'region';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
};

const toAnnotationSnapshot = (value: unknown): AnnotationSnapshot | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as AnnotationSnapshot;
};

/**
 * Audit Service for ValidationAuditEntry system
 * Provides comprehensive audit logging throughout the confirmation workflow
 */
export class AuditService {
  private static instance: AuditService;
  private auditBuffer: ValidationAuditEntry[] = [];
  private workflowId: string | null = null;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Initialize a new workflow session with unique ID
   */
  public startWorkflow(caseNumber: string): string {
    const workflowId = generateWorkflowId(caseNumber);
    this.workflowId = workflowId;
    console.log(`🔍 Audit: Started workflow ${this.workflowId}`);
    return workflowId;
  }

  /**
   * End current workflow session
   */
  public endWorkflow(): void {
    if (this.workflowId) {
      console.log(`🔍 Audit: Ended workflow ${this.workflowId}`);
      this.workflowId = null;
    }
  }

  /**
   * Create and log an audit entry
   */
  public async logEvent(params: CreateAuditEntryParams): Promise<void> {
    const startTime = Date.now();

    try {
      const auditEntry = buildValidationAuditEntry(params);

      // Add to buffer for batch processing
      this.auditBuffer.push(auditEntry);

      // Log to console for immediate feedback
      logAuditEntryToConsole(auditEntry);

      // Persist to storage asynchronously
      await this.persistAuditEntry(auditEntry);

      const endTime = Date.now();
      console.log(`🔍 Audit: Event logged in ${endTime - startTime}ms`);

    } catch (error) {
      console.error('🚨 Audit: Failed to log event:', error);
      // Don't throw - audit failures shouldn't break the main workflow
    }
  }

  /**
   * Log case export event
   */
  public async logCaseExport(
    user: User,
    caseNumber: string,
    fileName: string,
    result: AuditResult,
    errors: string[] = [],
    performanceMetrics?: PerformanceMetrics,
    exportFormat?: 'json' | 'csv' | 'xlsx' | 'zip',
    protectionEnabled?: boolean,
    signatureDetails?: {
      present?: boolean;
      valid?: boolean;
      keyId?: string;
    }
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: false, // Not applicable for exports
      fileIntegrityValid: result === 'success',
      manifestSignaturePresent: signatureDetails?.present,
      manifestSignatureValid: signatureDetails?.valid,
      manifestSignatureKeyId: signatureDetails?.keyId
    };

    // Determine file type based on format or fallback to filename
    let fileType: AuditFileType = 'case-package';
    if (exportFormat) {
      switch (exportFormat) {
        case 'json':
          fileType = 'json-data';
          break;
        case 'csv':
        case 'xlsx':
          fileType = 'csv-export';
          break;
        case 'zip':
          fileType = 'case-package';
          break;
        default:
          fileType = 'case-package';
      }
    } else {
      // Fallback: extract from filename
      if (fileName.includes('.json')) fileType = 'json-data';
      else if (fileName.includes('.csv') || fileName.includes('.xlsx')) fileType = 'csv-export';
      else fileType = 'case-package';
    }

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'export',
      result,
      fileName,
      fileType,
      validationErrors: errors,
      caseNumber,
      workflowPhase: 'case-export',
      securityChecks,
      performanceMetrics,
      originalExaminerUid: user.uid
    });
  }

  /**
   * Log case import event
   */
  public async logCaseImport(
    user: User,
    caseNumber: string,
    fileName: string,
    result: AuditResult,
    hashValid: boolean,
    errors: string[] = [],
    originalExaminerUid?: string,
    performanceMetrics?: PerformanceMetrics,
    exporterUidValidated?: boolean, // Separate flag for validation status
    signatureDetails?: {
      present?: boolean;
      valid?: boolean;
      keyId?: string;
    }
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: originalExaminerUid ? originalExaminerUid !== user.uid : false,
      fileIntegrityValid: hashValid,
      exporterUidValidated: exporterUidValidated !== undefined ? exporterUidValidated : !!originalExaminerUid,
      manifestSignaturePresent: signatureDetails?.present,
      manifestSignatureValid: signatureDetails?.valid,
      manifestSignatureKeyId: signatureDetails?.keyId
    };

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'import',
      result,
      fileName,
      fileType: 'case-package',
      hashValid,
      validationErrors: errors,
      caseNumber,
      workflowPhase: 'case-import',
      securityChecks,
      performanceMetrics,
      originalExaminerUid,
      reviewingExaminerUid: user.uid
    });
  }

  /**
   * Log confirmation creation event
   */
  public async logConfirmationCreation(
    user: User,
    caseNumber: string,
    confirmationId: string,
    result: AuditResult,
    errors: string[] = [],
    originalExaminerUid?: string,
    performanceMetrics?: PerformanceMetrics,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: false, // Not applicable for confirmation creation
      fileIntegrityValid: true // Confirmation creation doesn't involve file integrity validation
    };

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'confirm',
      result,
      fileName: `confirmation-${confirmationId}`,
      fileType: 'confirmation-data',
      validationErrors: errors,
      caseNumber,
      confirmationId,
      workflowPhase: 'confirmation',
      securityChecks,
      performanceMetrics,
      originalExaminerUid,
      reviewingExaminerUid: user.uid,
      fileDetails: imageFileId && originalImageFileName ? {
        fileId: imageFileId,
        originalFileName: originalImageFileName,
        fileSize: 0 // Not applicable for confirmation creation
      } : undefined
    });
  }

  /**
   * Log confirmation export event
   */
  public async logConfirmationExport(
    user: User,
    caseNumber: string,
    fileName: string,
    confirmationCount: number,
    result: AuditResult,
    errors: string[] = [],
    originalExaminerUid?: string,
    performanceMetrics?: PerformanceMetrics,
    signatureDetails?: {
      present: boolean;
      valid: boolean;
      keyId?: string;
    }
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: false, // Not applicable for exports
      fileIntegrityValid: result === 'success',
      manifestSignaturePresent: signatureDetails?.present,
      manifestSignatureValid: signatureDetails?.valid,
      manifestSignatureKeyId: signatureDetails?.keyId
    };

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'export',
      result,
      fileName,
      fileType: 'confirmation-data',
      validationErrors: errors,
      caseNumber,
      workflowPhase: 'confirmation',
      securityChecks,
      performanceMetrics,
      originalExaminerUid,
      reviewingExaminerUid: user.uid
    });
  }

  /**
   * Log confirmation import event
   */
  public async logConfirmationImport(
    user: User,
    caseNumber: string,
    fileName: string,
    result: AuditResult,
    hashValid: boolean,
    confirmationsImported: number,
    errors: string[] = [],
    reviewingExaminerUid?: string,
    performanceMetrics?: PerformanceMetrics,
    exporterUidValidated?: boolean, // Separate flag for validation status
    totalConfirmationsInFile?: number, // Total confirmations in the import file
    signatureDetails?: {
      present: boolean;
      valid: boolean;
      keyId?: string;
    }
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: reviewingExaminerUid ? reviewingExaminerUid === user.uid : false,
      fileIntegrityValid: hashValid,
      exporterUidValidated: exporterUidValidated !== undefined ? exporterUidValidated : !!reviewingExaminerUid,
      manifestSignaturePresent: signatureDetails?.present,
      manifestSignatureValid: signatureDetails?.valid,
      manifestSignatureKeyId: signatureDetails?.keyId
    };

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'import',
      result,
      fileName,
      fileType: 'confirmation-data',
      hashValid,
      validationErrors: errors,
      caseNumber,
      workflowPhase: 'confirmation',
      securityChecks,
      performanceMetrics: performanceMetrics ? {
        ...performanceMetrics,
        validationStepsCompleted: confirmationsImported, // Successfully imported
        validationStepsFailed: errors.length
      } : {
        processingTimeMs: 0,
        fileSizeBytes: 0,
        validationStepsCompleted: confirmationsImported, // Successfully imported
        validationStepsFailed: errors.length
      },
      originalExaminerUid: user.uid,
      reviewingExaminerUid: reviewingExaminerUid, // Pass through the reviewing examiner UID
      // Store total confirmations in file using caseDetails
      caseDetails: totalConfirmationsInFile !== undefined ? {
        totalAnnotations: totalConfirmationsInFile // Total confirmations in the import file
      } : undefined
    });
  }

  // =============================================================================
  // COMPREHENSIVE AUDIT LOGGING METHODS
  // =============================================================================

  /**
   * Log case creation event
   */
  public async logCaseCreation(
    user: User,
    caseNumber: string,
    caseName: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'case-create',
      result: 'success',
      fileName: `${caseNumber}.case`,
      fileType: 'case-package',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      caseDetails: {
        newCaseName: caseName,
        createdDate: new Date().toISOString(),
        totalFiles: 0,
        totalAnnotations: 0
      }
    });
  }

  /**
   * Log case rename event
   */
  public async logCaseRename(
    user: User,
    caseNumber: string,
    oldName: string,
    newName: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'case-rename',
      result: 'success',
      fileName: `${caseNumber}.case`,
      fileType: 'case-package',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      caseDetails: {
        oldCaseName: oldName,
        newCaseName: newName,
        lastModified: new Date().toISOString()
      }
    });
  }

  /**
   * Log case deletion event
   */
  public async logCaseDeletion(
    user: User,
    caseNumber: string,
    caseName: string,
    deleteReason: string,
    backupCreated: boolean = false
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'case-delete',
      result: 'success',
      fileName: `${caseNumber}.case`,
      fileType: 'case-package',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      caseDetails: {
        newCaseName: caseName,
        deleteReason,
        backupCreated,
        lastModified: new Date().toISOString()
      }
    });
  }

  /**
   * Log file upload event
   */
  public async logFileUpload(
    user: User,
    fileName: string,
    fileSize: number,
    mimeType: string,
    uploadMethod: 'drag-drop' | 'file-picker' | 'api' | 'import',
    caseNumber: string,
    result: AuditResult = 'success',
    processingTime?: number,
    fileId?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'file-upload',
      result,
      fileName,
      fileType: this.getFileTypeFromMime(mimeType),
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      fileDetails: {
        fileId: fileId || undefined,
        originalFileName: fileName,
        fileSize,
        mimeType,
        uploadMethod,
        processingTime,
        thumbnailGenerated: result === 'success' && this.isImageFile(mimeType)
      },
      performanceMetrics: processingTime ? {
        processingTimeMs: processingTime,
        fileSizeBytes: fileSize
      } : undefined
    });
  }

  /**
   * Log file deletion event
   */
  public async logFileDeletion(
    user: User,
    fileName: string,
    fileSize: number,
    deleteReason: string,
    caseNumber: string,
    fileId?: string,
    originalFileName?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'file-delete',
      result: 'success',
      fileName,
      fileType: 'unknown',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      fileDetails: {
        fileId: fileId || undefined,
        originalFileName,
        fileSize,
        deleteReason
      }
    });
  }

  /**
   * Log file access event (e.g., viewing an image)
   */
  public async logFileAccess(
    user: User,
    fileName: string,
    fileId: string,
    accessMethod: 'direct-url' | 'signed-url' | 'download',
    caseNumber: string,
    result: AuditResult = 'success',
    processingTime?: number,
    accessReason?: string,
    originalFileName?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'file-access',
      result,
      fileName,
      fileType: 'image-file', // Most file access in Striae is for images
      validationErrors: result === 'failure' ? ['File access failed'] : [],
      caseNumber,
      workflowPhase: 'casework',
      fileDetails: {
        fileId,
        originalFileName,
        fileSize: 0, // File size not available for access events
        uploadMethod: accessMethod,
        processingTime,
        sourceLocation: accessReason || 'Image viewer'
      },
      performanceMetrics: processingTime ? {
        processingTimeMs: processingTime,
        fileSizeBytes: 0
      } : undefined
    });
  }

  /**
   * Log annotation creation event
   */
  public async logAnnotationCreate(
    user: User,
    annotationId: string,
    annotationType: 'measurement' | 'identification' | 'comparison' | 'note' | 'region',
    annotationData: unknown,
    caseNumber: string,
    tool?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
    const annotationSnapshot = toAnnotationSnapshot(annotationData);

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'annotation-create',
      result: 'success',
      fileName: `annotation-${annotationId}.json`,
      fileType: 'json-data',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      annotationDetails: {
        annotationId,
        annotationType,
        annotationData,
        tool,
        canvasPosition: annotationSnapshot?.position,
        annotationSize: annotationSnapshot?.size
      },
      fileDetails: imageFileId || originalImageFileName ? {
        fileId: imageFileId,
        originalFileName: originalImageFileName,
        fileSize: 0, // Not available for image annotations
        mimeType: 'image/*', // Generic image type
        uploadMethod: 'api'
      } : undefined
    });
  }

  /**
   * Log annotation edit event
   */
  public async logAnnotationEdit(
    user: User,
    annotationId: string,
    previousValue: unknown,
    newValue: unknown,
    caseNumber: string,
    tool?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
    const newValueSnapshot = toAnnotationSnapshot(newValue);

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'annotation-edit',
      result: 'success',
      fileName: `annotation-${annotationId}.json`,
      fileType: 'json-data',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      annotationDetails: {
        annotationId,
        annotationType: newValueSnapshot?.type,
        annotationData: newValue,
        previousValue,
        tool
      },
      fileDetails: imageFileId || originalImageFileName ? {
        fileId: imageFileId,
        originalFileName: originalImageFileName,
        fileSize: 0, // Not available for image annotations
        mimeType: 'image/*', // Generic image type
        uploadMethod: 'api'
      } : undefined
    });
  }

  /**
   * Log annotation deletion event
   */
  public async logAnnotationDelete(
    user: User,
    annotationId: string,
    annotationData: unknown,
    caseNumber: string,
    deleteReason?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
    const annotationSnapshot = toAnnotationSnapshot(annotationData);

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'annotation-delete',
      result: 'success',
      fileName: `annotation-${annotationId}.json`,
      fileType: 'json-data',
      validationErrors: [],
      caseNumber,
      workflowPhase: 'casework',
      annotationDetails: {
        annotationId,
        annotationType: annotationSnapshot?.type,
        annotationData,
        tool: deleteReason
      },
      fileDetails: imageFileId || originalImageFileName ? {
        fileId: imageFileId,
        originalFileName: originalImageFileName,
        fileSize: 0, // Not available for image annotations
        mimeType: 'image/*', // Generic image type
        uploadMethod: 'api'
      } : undefined
    });
  }

  /**
   * Log user login event
   */
  public async logUserLogin(
    user: User,
    sessionId: string,
    loginMethod: 'firebase' | 'sso' | 'api-key' | 'manual',
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'user-login',
      result: 'success',
      fileName: `session-${sessionId}.log`,
      fileType: 'log-file',
      validationErrors: [],
      workflowPhase: 'user-management',
      sessionDetails: {
        sessionId,
        userAgent,
        loginMethod
      }
    });
  }

  /**
   * Log user logout event
   */
  public async logUserLogout(
    user: User,
    sessionId: string,
    sessionDuration: number,
    logoutReason: 'user-initiated' | 'timeout' | 'security' | 'error'
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'user-logout',
      result: 'success',
      fileName: `session-${sessionId}.log`,
      fileType: 'log-file',
      validationErrors: [],
      workflowPhase: 'user-management',
      sessionDetails: {
        sessionId,
        sessionDuration,
        logoutReason
      }
    });
  }

  /**
   * Log user profile update event
   */
  public async logUserProfileUpdate(
    user: User,
    profileField: 'displayName' | 'email' | 'organization' | 'role' | 'preferences' | 'avatar',
    oldValue: string,
    newValue: string,
    result: AuditResult,
    sessionId?: string,
    errors: string[] = []
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'user-profile-update',
      result,
      fileName: `profile-update-${profileField}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId
      } : undefined,
      userProfileDetails: {
        profileField,
        oldValue,
        newValue
      }
    });
  }

  /**
   * Log password reset event
   */
  public async logPasswordReset(
    userEmail: string,
    resetMethod: 'email' | 'sms' | 'security-questions' | 'admin-reset',
    result: AuditResult,
    resetToken?: string,
    verificationMethod?: 'email-link' | 'sms-code' | 'totp' | 'backup-codes',
    verificationAttempts?: number,
    passwordComplexityMet?: boolean,
    previousPasswordReused?: boolean,
    sessionId?: string,
    errors: string[] = []
  ): Promise<void> {
    // For password resets, we might not have the full user object yet
    const userId = ''; // No user ID available during password reset
    
    await this.logEvent({
      userId,
      userEmail,
      action: 'user-password-reset',
      result,
      fileName: `password-reset-${resetMethod}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId
      } : undefined,
      userProfileDetails: {
        resetMethod,
        resetToken: resetToken ? `***${resetToken.slice(-4)}` : undefined, // Only store last 4 chars
        verificationMethod,
        verificationAttempts,
        passwordComplexityMet,
        previousPasswordReused
      }
    });
  }

  /**
   * Log user account deletion event
   */
  public async logAccountDeletion(
    user: User,
    result: AuditResult,
    deletionReason: 'user-requested' | 'admin-initiated' | 'policy-violation' | 'inactive-account' = 'user-requested',
    confirmationMethod: 'uid-email' | 'password' | 'admin-override' = 'uid-email',
    casesCount?: number,
    filesCount?: number,
    dataRetentionPeriod?: number,
    emailNotificationSent?: boolean,
    sessionId?: string,
    errors: string[] = []
  ): Promise<void> {
    // Wrapper that extracts user data and calls the simplified version
    return this.logAccountDeletionSimple(
      user.uid,
      user.email || '',
      result,
      deletionReason,
      confirmationMethod,
      casesCount,
      filesCount,
      dataRetentionPeriod,
      emailNotificationSent,
      sessionId,
      errors
    );
  }

  /**
   * Log user account deletion event with simplified user data
   */
  public async logAccountDeletionSimple(
    userId: string,
    userEmail: string,
    result: AuditResult,
    deletionReason: 'user-requested' | 'admin-initiated' | 'policy-violation' | 'inactive-account' = 'user-requested',
    confirmationMethod: 'uid-email' | 'password' | 'admin-override' = 'uid-email',
    casesCount?: number,
    filesCount?: number,
    dataRetentionPeriod?: number,
    emailNotificationSent?: boolean,
    sessionId?: string,
    errors: string[] = []
  ): Promise<void> {
    await this.logEvent({
      userId,
      userEmail: userEmail || '',
      action: 'user-account-delete',
      result,
      fileName: `account-deletion-${userId}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
      } : undefined,
      userProfileDetails: {
        deletionReason,
        confirmationMethod,
        casesCount,
        filesCount,
        dataRetentionPeriod,
        emailNotificationSent
      }
    });
  }

  /**
   * Log user registration/creation event
   */
  public async logUserRegistration(
    user: User,
    firstName: string,
    lastName: string,
    company: string,
    registrationMethod: 'email-password' | 'sso' | 'admin-created' | 'api',
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'user-registration',
      result: 'success',
      fileName: `registration-${user.uid}.log`,
      fileType: 'log-file',
      validationErrors: [],
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      userProfileDetails: {
        registrationMethod,
        firstName,
        lastName,
        company,
        emailVerificationRequired: true,
        mfaEnrollmentRequired: true
      }
    });
  }

  /**
   * Log successful MFA enrollment event
   */
  public async logMfaEnrollment(
    user: User,
    phoneNumber: string,
    mfaMethod: 'sms' | 'totp' | 'hardware-key',
    result: AuditResult,
    enrollmentAttempts?: number,
    sessionId?: string,
    userAgent?: string,
    errors: string[] = []
  ): Promise<void> {
    // Mask phone number for privacy (show only last 4 digits)
    const maskedPhone = phoneNumber.length > 4 
      ? `***-***-${phoneNumber.slice(-4)}` 
      : '***-***-****';

    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'mfa-enrollment',
      result,
      fileName: `mfa-enrollment-${user.uid}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      securityDetails: {
        mfaMethod,
        phoneNumber: maskedPhone,
        enrollmentAttempts,
        enrollmentDate: new Date().toISOString(),
        mandatoryEnrollment: true,
        backupCodesGenerated: false // SMS doesn't generate backup codes
      }
    });
  }

  /**
   * Log MFA authentication/verification event
   */
  public async logMfaAuthentication(
    user: User,
    mfaMethod: 'sms' | 'totp' | 'hardware-key',
    result: AuditResult,
    verificationAttempts?: number,
    sessionId?: string,
    userAgent?: string,
    errors: string[] = []
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'mfa-authentication',
      result,
      fileName: `mfa-auth-${sessionId || Date.now()}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      securityDetails: {
        mfaMethod,
        verificationAttempts,
        authenticationDate: new Date().toISOString(),
        loginFlowStep: 'second-factor'
      }
    });
  }

  /**
   * Log email verification event
   */
  public async logEmailVerification(
    user: User,
    result: AuditResult,
    verificationMethod: 'email-link' | 'admin-verification',
    verificationAttempts?: number,
    sessionId?: string,
    userAgent?: string,
    errors: string[] = []
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'email-verification',
      result,
      fileName: `email-verification-${user.uid}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      userProfileDetails: {
        verificationMethod,
        verificationAttempts,
        verificationDate: new Date().toISOString(),
        emailVerified: result === 'success'
      }
    });
  }

  /**
   * Log email verification event when no authenticated User object is available.
   */
  public async logEmailVerificationByEmail(
    userEmail: string,
    result: AuditResult,
    verificationMethod: 'email-link' | 'admin-verification',
    verificationAttempts?: number,
    sessionId?: string,
    userAgent?: string,
    errors: string[] = [],
    userId: string = ''
  ): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action: 'email-verification',
      result,
      fileName: `email-verification-${userId || Date.now()}.log`,
      fileType: 'log-file',
      validationErrors: errors,
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      userProfileDetails: {
        verificationMethod,
        verificationAttempts,
        verificationDate: new Date().toISOString(),
        emailVerified: result === 'success'
      }
    });
  }

  /**
   * Mark pending email verification as successful (retroactive)
   * Called when user completes MFA enrollment, which implies email verification was successful
   */
  public async markEmailVerificationSuccessful(
    user: User,
    reason: string = 'MFA enrollment completed',
    sessionId?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'email-verification',
      result: 'success',
      fileName: `email-verification-${user.uid}.log`,
      fileType: 'log-file',
      validationErrors: [],
      workflowPhase: 'user-management',
      sessionDetails: sessionId ? {
        sessionId,
        userAgent
      } : { userAgent },
      userProfileDetails: {
        verificationMethod: 'email-link',
        verificationAttempts: 1,
        verificationDate: new Date().toISOString(),
        emailVerified: true,
        retroactiveVerification: true,
        retroactiveReason: reason
      }
    });
  }

  /**
   * Log PDF generation event
   */
  public async logPDFGeneration(
    user: User,
    fileName: string,
    caseNumber: string,
    result: AuditResult,
    processingTime: number,
    fileSize?: number,
    errors: string[] = [],
    sourceFileId?: string,
    sourceFileName?: string
  ): Promise<void> {
    await this.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'pdf-generate',
      result,
      fileName,
      fileType: 'pdf-document',
      validationErrors: errors,
      caseNumber,
      workflowPhase: 'casework',
      performanceMetrics: {
        processingTimeMs: processingTime,
        fileSizeBytes: fileSize || 0
      },
      fileDetails: sourceFileId && sourceFileName ? {
        fileId: sourceFileId,
        originalFileName: sourceFileName,
        fileSize: 0 // PDF generation doesn't modify source file size
      } : undefined
    });
  }

  /**
   * Log security violation event
   */
  public async logSecurityViolation(
    user: User | null,
    incidentType: 'unauthorized-access' | 'data-breach' | 'malware' | 'injection' | 'brute-force' | 'privilege-escalation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    targetResource?: string,
    blockedBySystem: boolean = true
  ): Promise<void> {
    await this.logEvent({
      userId: user?.uid || 'unknown',
      userEmail: user?.email || 'unknown@system.com',
      action: 'security-violation',
      result: blockedBySystem ? 'blocked' : 'failure',
      fileName: `security-incident-${Date.now()}.log`,
      fileType: 'log-file',
      validationErrors: [description],
      securityDetails: {
        incidentType,
        severity,
        targetResource,
        blockedBySystem,
        investigationId: `INV-${Date.now()}`,
        reportedToAuthorities: severity === 'critical',
        mitigationSteps: [
          blockedBySystem ? 'Automatically blocked by system' : 'Manual intervention required'
        ]
      }
    });
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Determine file type from MIME type
   */
  private getFileTypeFromMime(mimeType: string): AuditFileType {
    if (mimeType.startsWith('image/')) return 'image-file';
    if (mimeType === 'application/pdf') return 'pdf-document';
    if (mimeType === 'application/json') return 'json-data';
    if (mimeType === 'text/csv') return 'csv-export';
    return 'unknown';
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get audit entries for display (public method for components)
   */
  public async getAuditEntriesForUser(userId: string, params?: {
    startDate?: string;
    endDate?: string;
    caseNumber?: string;
    action?: AuditAction;
    result?: AuditResult;
    workflowPhase?: WorkflowPhase;
    offset?: number;
    limit?: number;
  }): Promise<ValidationAuditEntry[]> {
    const queryParams: AuditQueryParams = {
      userId,
      ...params
    };
    return await this.getAuditEntries(queryParams);
  }

  /**
   * Get audit trail for a case
   */
  public async getAuditTrail(caseNumber: string): Promise<AuditTrail | null> {
    try {
      // Implement retrieval from storage
      const entries = await this.getAuditEntries({ caseNumber });
      if (!entries || entries.length === 0) {
        return null;
      }

      const summary = generateAuditSummary(entries);
      const workflowId = this.workflowId || `${caseNumber}-archived`;

      return {
        caseNumber,
        workflowId,
        entries,
        summary
      };
    } catch (error) {
      console.error('🚨 Audit: Failed to get audit trail:', error);
      return null;
    }
  }

  /**
   * Get audit entries based on query parameters
   */
  private async getAuditEntries(params: AuditQueryParams): Promise<ValidationAuditEntry[]> {
    try {
      // If userId is provided, fetch from server
      if (params.userId) {
        const serverEntries = await fetchAuditEntriesForUser({
          userId: params.userId,
          startDate: params.startDate,
          endDate: params.endDate
        });

        if (serverEntries) {
          const filteredEntries = applyAuditEntryFilters(serverEntries, {
            ...params,
            userId: undefined
          });
          return applyAuditPagination(filteredEntries, params);
        }

        console.error('🚨 Audit: Failed to fetch entries from server');
      }

      // Fallback to buffer for backward compatibility
      const filteredEntries = applyAuditEntryFilters([...this.auditBuffer], params);
      const sortedEntries = sortAuditEntriesNewestFirst(filteredEntries);
      return applyAuditPagination(sortedEntries, params);
    } catch (error) {
      console.error('🚨 Audit: Failed to get audit entries:', error);
      return [];
    }
  }

  /**
   * Persist audit entry to storage
   */
  private async persistAuditEntry(entry: ValidationAuditEntry): Promise<void> {
    try {
      const persistResult = await persistAuditEntryForUser(entry);

      if (!persistResult.ok) {
        console.error(
          '🚨 Audit: Failed to persist entry:',
          persistResult.status,
          persistResult.errorData
        );
      } else {
        console.log(`🔍 Audit: Entry persisted (${persistResult.entryCount} total entries)`);
      }
    } catch (error) {
      console.error('🚨 Audit: Storage error:', error);
    }
  }

  /**
   * Clear audit buffer (for testing)
   */
  public clearBuffer(): void {
    this.auditBuffer = [];
  }

  /**
   * Get current buffer size (for monitoring)
   */
  public getBufferSize(): number {
    return this.auditBuffer.length;
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();
