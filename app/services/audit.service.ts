import { User } from 'firebase/auth';
import { 
  ValidationAuditEntry, 
  CreateAuditEntryParams, 
  AuditTrail, 
  AuditQueryParams,
  AuditSummary,
  WorkflowPhase,
  AuditAction,
  AuditResult,
  AuditFileType,
  SecurityCheckResults,
  PerformanceMetrics
} from '~/types';
import paths from '~/config/config.json';
import { getDataApiKey } from '~/utils/auth';
import { generateWorkflowId } from '../utils/id-generator';

const AUDIT_WORKER_URL = paths.audit_worker_url;

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
      const auditEntry: ValidationAuditEntry = {
        timestamp: new Date().toISOString(),
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
          // Extended detail fields
          caseDetails: params.caseDetails,
          fileDetails: params.fileDetails,
          annotationDetails: params.annotationDetails,
          sessionDetails: params.sessionDetails,
          securityDetails: params.securityDetails
        }
      };

      // Add to buffer for batch processing
      this.auditBuffer.push(auditEntry);

      // Log to console for immediate feedback
      this.logToConsole(auditEntry);

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
    protectionEnabled?: boolean
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: false, // Not applicable for exports
      fileIntegrityValid: result === 'success'
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
    exporterUidValidated?: boolean // Separate flag for validation status
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: originalExaminerUid ? originalExaminerUid !== user.uid : false,
      fileIntegrityValid: hashValid,
      exporterUidValidated: exporterUidValidated !== undefined ? exporterUidValidated : !!originalExaminerUid
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
    performanceMetrics?: PerformanceMetrics
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: false, // Not applicable for exports
      fileIntegrityValid: result === 'success'
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
    exporterUidValidated?: boolean // Separate flag for validation status
  ): Promise<void> {
    const securityChecks: SecurityCheckResults = {
      selfConfirmationPrevented: reviewingExaminerUid ? reviewingExaminerUid !== user.uid : false,
      fileIntegrityValid: hashValid,
      exporterUidValidated: exporterUidValidated !== undefined ? exporterUidValidated : !!reviewingExaminerUid
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
        validationStepsCompleted: confirmationsImported,
        validationStepsFailed: errors.length
      } : {
        processingTimeMs: 0,
        fileSizeBytes: 0,
        validationStepsCompleted: confirmationsImported,
        validationStepsFailed: errors.length
      },
      originalExaminerUid: user.uid,
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
        uploadMethod: accessMethod as any, // Reuse for access method
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
    annotationData: any,
    caseNumber: string,
    tool?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
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
        canvasPosition: annotationData?.position,
        annotationSize: annotationData?.size
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
    previousValue: any,
    newValue: any,
    caseNumber: string,
    tool?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
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
        annotationType: newValue?.type,
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
    annotationData: any,
    caseNumber: string,
    deleteReason?: string,
    imageFileId?: string,
    originalImageFileName?: string
  ): Promise<void> {
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
        annotationType: annotationData?.type,
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

      const summary = this.generateAuditSummary(entries);
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
   * Generate audit summary from entries
   */
  private generateAuditSummary(entries: ValidationAuditEntry[]): AuditSummary {
    const successCount = entries.filter(e => e.result === 'success').length;
    const failureCount = entries.filter(e => e.result === 'failure').length;
    const warningCount = entries.filter(e => e.result === 'warning').length;
    
    const phases = [...new Set(entries
      .map(e => e.details.workflowPhase)
      .filter(Boolean))] as WorkflowPhase[];
    
    const users = [...new Set(entries.map(e => e.userId))];
    
    const timestamps = entries.map(e => e.timestamp).sort();
    const securityIncidents = entries.filter(e => 
      e.result === 'failure' && 
      (e.details.securityChecks?.selfConfirmationPrevented === true ||
       !e.details.securityChecks?.fileIntegrityValid)
    ).length;

    return {
      totalEvents: entries.length,
      successfulEvents: successCount,
      failedEvents: failureCount,
      warningEvents: warningCount,
      workflowPhases: phases,
      participatingUsers: users,
      startTimestamp: timestamps[0] || new Date().toISOString(),
      endTimestamp: timestamps[timestamps.length - 1] || new Date().toISOString(),
      complianceStatus: failureCount === 0 ? 'compliant' : 'non-compliant',
      securityIncidents
    };
  }

  /**
   * Get audit entries based on query parameters
   */
  private async getAuditEntries(params: AuditQueryParams): Promise<ValidationAuditEntry[]> {
    try {
      // If userId is provided, fetch from server
      if (params.userId) {
        const apiKey = await getDataApiKey();
        const url = new URL(`${AUDIT_WORKER_URL}/audit/`);
        url.searchParams.set('userId', params.userId);
        
        if (params.startDate) {
          url.searchParams.set('startDate', params.startDate);
        }
        
        if (params.endDate) {
          url.searchParams.set('endDate', params.endDate);
        }
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-Custom-Auth-Key': apiKey
          }
        });

        if (response.ok) {
          const result = await response.json() as { entries: ValidationAuditEntry[]; total: number };
          let entries = result.entries;

          // Apply client-side filters
          if (params.caseNumber) {
            entries = entries.filter(e => e.details.caseNumber === params.caseNumber);
          }

          if (params.action) {
            entries = entries.filter(e => e.action === params.action);
          }

          if (params.result) {
            entries = entries.filter(e => e.result === params.result);
          }

          if (params.workflowPhase) {
            entries = entries.filter(e => e.details.workflowPhase === params.workflowPhase);
          }

          // Apply pagination
          if (params.offset || params.limit) {
            const offset = params.offset || 0;
            const limit = params.limit || 100;
            entries = entries.slice(offset, offset + limit);
          }

          return entries;
        } else {
          console.error('🚨 Audit: Failed to fetch entries from server');
        }
      }

      // Fallback to buffer for backward compatibility
      let entries = [...this.auditBuffer];

      if (params.caseNumber) {
        entries = entries.filter(e => e.details.caseNumber === params.caseNumber);
      }

      if (params.userId) {
        entries = entries.filter(e => e.userId === params.userId);
      }

      if (params.action) {
        entries = entries.filter(e => e.action === params.action);
      }

      if (params.result) {
        entries = entries.filter(e => e.result === params.result);
      }

      if (params.workflowPhase) {
        entries = entries.filter(e => e.details.workflowPhase === params.workflowPhase);
      }

      // Sort by timestamp (newest first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      if (params.offset || params.limit) {
        const offset = params.offset || 0;
        const limit = params.limit || 100;
        entries = entries.slice(offset, offset + limit);
      }

      return entries;
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
      // Store to audit worker
      const apiKey = await getDataApiKey();
      const url = new URL(`${AUDIT_WORKER_URL}/audit/`);
      url.searchParams.set('userId', entry.userId);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Auth-Key': apiKey
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🚨 Audit: Failed to persist entry:', response.status, errorData);
      } else {
        const result = await response.json() as { success: boolean; entryCount: number; filename: string };
        console.log(`🔍 Audit: Entry persisted (${result.entryCount} total entries)`);
      }
    } catch (error) {
      console.error('🚨 Audit: Storage error:', error);
    }
  }

  /**
   * Log audit entry to console for development
   */
  private logToConsole(entry: ValidationAuditEntry): void {
    const icon = entry.result === 'success' ? '✅' : 
                 entry.result === 'failure' ? '❌' : '⚠️';
    
    console.log(
      `${icon} Audit [${entry.action.toUpperCase()}]: ${entry.details.fileName} ` +
      `(Case: ${entry.details.caseNumber || 'N/A'}) - ${entry.result.toUpperCase()}`
    );

    if (entry.details.validationErrors.length > 0) {
      console.log('   Errors:', entry.details.validationErrors);
    }

    if (entry.details.securityChecks) {
      const securityIssues = [];
      
      // selfConfirmationPrevented: Only check for import actions when self-confirmation was actually prevented
      if (entry.action === 'import' && entry.details.securityChecks.selfConfirmationPrevented === true) {
        securityIssues.push('selfConfirmationPrevented');
      }
      
      // fileIntegrityValid: false means issue (integrity failed)
      if (entry.details.securityChecks.fileIntegrityValid === false) {
        securityIssues.push('fileIntegrityValid');
      }
      
      // exporterUidValidated: false means issue (validation failed)
      if (entry.details.securityChecks.exporterUidValidated === false) {
        securityIssues.push('exporterUidValidated');
      }
      
      if (securityIssues.length > 0) {
        console.warn('   Security Issues:', securityIssues);
      }
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
