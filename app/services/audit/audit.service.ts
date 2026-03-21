import type { User } from 'firebase/auth';
import type {
  ValidationAuditEntry, 
  CreateAuditEntryParams, 
  AuditTrail, 
  AuditQueryParams,
  WorkflowPhase,
  AuditAction,
  AuditResult,
  PerformanceMetrics
} from '~/types';
import { getCaseData, getUserData } from '~/utils/data';
import { generateWorkflowId } from '~/utils/common';
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
import { logAuditEntryToConsole } from './audit-console-logger';
import {
  buildAccountDeletionAuditParams,
  buildAnnotationCreateAuditParams,
  buildAnnotationDeleteAuditParams,
  buildAnnotationEditAuditParams,
  buildCaseArchiveAuditParams,
  buildCaseCreationAuditParams,
  buildCaseDeletionAuditParams,
  buildCaseExportAuditParams,
  buildCaseImportAuditParams,
  buildCaseRenameAuditParams,
  buildConfirmationCreationAuditParams,
  buildConfirmationExportAuditParams,
  buildConfirmationImportAuditParams,
  buildEmailVerificationAuditParams,
  buildEmailVerificationByEmailAuditParams,
  buildFileAccessAuditParams,
  buildFileDeletionAuditParams,
  buildFileUploadAuditParams,
  buildMarkEmailVerificationSuccessfulAuditParams,
  buildMfaAuthenticationAuditParams,
  buildMfaEnrollmentAuditParams,
  buildPDFGenerationAuditParams,
  buildPasswordResetAuditParams,
  buildSecurityViolationAuditParams,
  buildUserLoginAuditParams,
  buildUserLogoutAuditParams,
  buildUserProfileUpdateAuditParams,
  buildUserRegistrationAuditParams,
  buildValidationAuditEntry
} from './builders/index';

/**
 * Audit Service for ValidationAuditEntry system
 * Provides comprehensive audit logging throughout the confirmation workflow
 */
export class AuditService {
  private static instance: AuditService;
  private auditBuffer: ValidationAuditEntry[] = [];
  private workflowId: string | null = null;
  private userBadgeIdByUserId = new Map<string, string>();

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
      const providedBadgeId = params.userProfileDetails?.badgeId?.trim();
      if (providedBadgeId && params.userId) {
        this.userBadgeIdByUserId.set(params.userId, providedBadgeId);
      }

      const resolvedBadgeId =
        providedBadgeId ||
        (params.userId ? this.userBadgeIdByUserId.get(params.userId) : undefined);

      const paramsWithBadgeId: CreateAuditEntryParams = resolvedBadgeId
        ? {
            ...params,
            userProfileDetails: {
              ...(params.userProfileDetails || {}),
              badgeId: resolvedBadgeId
            }
          }
        : params;

      const auditEntry = buildValidationAuditEntry(paramsWithBadgeId);

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

  private normalizeBadgeId(badgeId?: string): string | undefined {
    const normalized = badgeId?.trim();
    return normalized ? normalized : undefined;
  }

  private applyBadgeIdToParams(
    params: CreateAuditEntryParams,
    badgeId?: string
  ): CreateAuditEntryParams {
    const normalizedBadgeId = this.normalizeBadgeId(badgeId);
    if (!normalizedBadgeId) {
      return params;
    }

    return {
      ...params,
      userProfileDetails: {
        ...(params.userProfileDetails || {}),
        badgeId: normalizedBadgeId
      }
    };
  }

  private async resolveBadgeIdForUser(user: User): Promise<string | undefined> {
    const cachedBadgeId = this.userBadgeIdByUserId.get(user.uid);
    if (cachedBadgeId) {
      return cachedBadgeId;
    }

    try {
      const userData = await getUserData(user);
      const resolvedBadgeId = this.normalizeBadgeId(userData?.badgeId);

      if (resolvedBadgeId) {
        this.userBadgeIdByUserId.set(user.uid, resolvedBadgeId);
      }

      return resolvedBadgeId;
    } catch (error) {
      console.error('🚨 Audit: Failed to resolve badge ID for user:', error);
      return undefined;
    }
  }

  private async logEventForUser(user: User, params: CreateAuditEntryParams): Promise<void> {
    const resolvedBadgeId = await this.resolveBadgeIdForUser(user);
    await this.logEvent(this.applyBadgeIdToParams(params, resolvedBadgeId));
  }

  private async logEventForOptionalUser(
    user: User | null,
    params: CreateAuditEntryParams
  ): Promise<void> {
    if (!user) {
      await this.logEvent(params);
      return;
    }

    await this.logEventForUser(user, params);
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
    await this.logEventForUser(user,
      buildCaseExportAuditParams({
        user,
        caseNumber,
        fileName,
        result,
        errors,
        performanceMetrics,
        exportFormat,
        signatureDetails
      })
    );
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
    await this.logEventForUser(user,
      buildCaseImportAuditParams({
        user,
        caseNumber,
        fileName,
        result,
        hashValid,
        errors,
        originalExaminerUid,
        performanceMetrics,
        exporterUidValidated,
        signatureDetails
      })
    );
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
    originalImageFileName?: string,
    badgeId?: string
  ): Promise<void> {
    await this.logEventForUser(user,
      buildConfirmationCreationAuditParams({
        user,
        caseNumber,
        confirmationId,
        badgeId,
        result,
        errors,
        originalExaminerUid,
        performanceMetrics,
        imageFileId,
        originalImageFileName
      })
    );
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
    await this.logEventForUser(user,
      buildConfirmationExportAuditParams({
        user,
        caseNumber,
        fileName,
        result,
        errors,
        originalExaminerUid,
        performanceMetrics,
        signatureDetails
      })
    );
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
    },
    reviewerBadgeId?: string // Badge/ID number of the reviewing examiner who exported the file
  ): Promise<void> {
    await this.logEventForUser(user,
      buildConfirmationImportAuditParams({
        user,
        caseNumber,
        fileName,
        result,
        hashValid,
        confirmationsImported,
        errors,
        reviewingExaminerUid,
        reviewerBadgeId,
        performanceMetrics,
        exporterUidValidated,
        totalConfirmationsInFile,
        signatureDetails
      })
    );
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
    await this.logEventForUser(user,
      buildCaseCreationAuditParams({
        user,
        caseNumber,
        caseName
      })
    );
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
    await this.logEventForUser(user,
      buildCaseRenameAuditParams({
        user,
        caseNumber,
        oldName,
        newName
      })
    );
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
    await this.logEventForUser(user,
      buildCaseDeletionAuditParams({
        user,
        caseNumber,
        caseName,
        deleteReason,
        backupCreated
      })
    );
  }

  /**
   * Log case archive event
   */
  public async logCaseArchive(
    user: User,
    caseNumber: string,
    caseName: string,
    archiveReason: string,
    result: AuditResult = 'success',
    errors: string[] = [],
    totalFiles?: number,
    archivedAt?: string,
    processingTimeMs?: number
  ): Promise<void> {
    await this.logEventForUser(user,
      buildCaseArchiveAuditParams({
        user,
        caseNumber,
        caseName,
        archiveReason,
        result,
        errors,
        totalFiles,
        archivedAt,
        processingTimeMs
      })
    );
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
    await this.logEventForUser(user,
      buildFileUploadAuditParams({
        user,
        fileName,
        fileSize,
        mimeType,
        uploadMethod,
        caseNumber,
        result,
        processingTime,
        fileId
      })
    );
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
    await this.logEventForUser(user,
      buildFileDeletionAuditParams({
        user,
        fileName,
        fileSize,
        deleteReason,
        caseNumber,
        fileId,
        originalFileName
      })
    );
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
    await this.logEventForUser(user,
      buildFileAccessAuditParams({
        user,
        fileName,
        fileId,
        accessMethod,
        caseNumber,
        result,
        processingTime,
        accessReason,
        originalFileName
      })
    );
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
    await this.logEventForUser(user,
      buildAnnotationCreateAuditParams({
        user,
        annotationId,
        annotationType,
        annotationData,
        caseNumber,
        tool,
        imageFileId,
        originalImageFileName
      })
    );
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
    await this.logEventForUser(user,
      buildAnnotationEditAuditParams({
        user,
        annotationId,
        previousValue,
        newValue,
        caseNumber,
        tool,
        imageFileId,
        originalImageFileName
      })
    );
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
    await this.logEventForUser(user,
      buildAnnotationDeleteAuditParams({
        user,
        annotationId,
        annotationData,
        caseNumber,
        deleteReason,
        imageFileId,
        originalImageFileName
      })
    );
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
    await this.logEventForUser(user,
      buildUserLoginAuditParams({
        user,
        sessionId,
        loginMethod,
        userAgent
      })
    );
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
    await this.logEventForUser(user,
      buildUserLogoutAuditParams({
        user,
        sessionId,
        sessionDuration,
        logoutReason
      })
    );
  }

  /**
   * Log user profile update event
   */
  public async logUserProfileUpdate(
    user: User,
    profileField: 'displayName' | 'email' | 'organization' | 'role' | 'preferences' | 'avatar' | 'badgeId',
    oldValue: string,
    newValue: string,
    result: AuditResult,
    sessionId?: string,
    errors: string[] = [],
    badgeId?: string
  ): Promise<void> {
    await this.logEventForUser(user,
      buildUserProfileUpdateAuditParams({
        user,
        profileField,
        oldValue,
        newValue,
        result,
        sessionId,
        errors,
        badgeId
      })
    );
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
    await this.logEvent(
      buildPasswordResetAuditParams({
        userEmail,
        resetMethod,
        result,
        resetToken,
        verificationMethod,
        verificationAttempts,
        passwordComplexityMet,
        previousPasswordReused,
        sessionId,
        errors
      })
    );
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
    await this.logEvent(
      buildAccountDeletionAuditParams({
        userId,
        userEmail,
        result,
        deletionReason,
        confirmationMethod,
        casesCount,
        filesCount,
        dataRetentionPeriod,
        emailNotificationSent,
        sessionId,
        errors
      })
    );
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
    await this.logEventForUser(user,
      buildUserRegistrationAuditParams({
        user,
        firstName,
        lastName,
        company,
        registrationMethod,
        userAgent,
        sessionId
      })
    );
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
    await this.logEventForUser(user,
      buildMfaEnrollmentAuditParams({
        user,
        phoneNumber,
        mfaMethod,
        result,
        enrollmentAttempts,
        sessionId,
        userAgent,
        errors
      })
    );
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
    await this.logEventForUser(user,
      buildMfaAuthenticationAuditParams({
        user,
        mfaMethod,
        result,
        verificationAttempts,
        sessionId,
        userAgent,
        errors
      })
    );
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
    await this.logEventForUser(user,
      buildEmailVerificationAuditParams({
        user,
        result,
        verificationMethod,
        verificationAttempts,
        sessionId,
        userAgent,
        errors
      })
    );
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
    await this.logEvent(
      buildEmailVerificationByEmailAuditParams({
        userEmail,
        result,
        verificationMethod,
        verificationAttempts,
        sessionId,
        userAgent,
        errors,
        userId
      })
    );
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
    await this.logEventForUser(user,
      buildMarkEmailVerificationSuccessfulAuditParams({
        user,
        reason,
        sessionId,
        userAgent
      })
    );
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
    await this.logEventForUser(user,
      buildPDFGenerationAuditParams({
        user,
        fileName,
        caseNumber,
        result,
        processingTime,
        fileSize,
        errors,
        sourceFileId,
        sourceFileName
      })
    );
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
    await this.logEventForOptionalUser(user,
      buildSecurityViolationAuditParams({
        user,
        incidentType,
        severity,
        description,
        targetResource,
        blockedBySystem
      })
    );
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get audit entries for display (public method for components)
   */
  public async getAuditEntriesForUser(userId: string, params?: {
    requestingUser?: User;
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
    return await this.getAuditEntries(queryParams, params?.requestingUser);
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
  private applyDateRangeFilter(
    entries: ValidationAuditEntry[],
    startDate?: string,
    endDate?: string
  ): ValidationAuditEntry[] {
    const startMs = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
    const endMs = endDate ? new Date(endDate).getTime() : Number.POSITIVE_INFINITY;

    return entries.filter((entry) => {
      const timestampMs = new Date(entry.timestamp).getTime();
      return timestampMs >= startMs && timestampMs <= endMs;
    });
  }

  private async getBundledArchivedCaseAuditEntries(
    params: AuditQueryParams,
    requestingUser?: User
  ): Promise<ValidationAuditEntry[] | null> {
    if (!requestingUser || !params.caseNumber) {
      return null;
    }

    const caseData = await getCaseData(requestingUser, params.caseNumber);
    if (!caseData?.isReadOnly || caseData.archived !== true) {
      return null;
    }

    const bundledEntries = caseData.bundledAuditTrail?.entries;
    if (!Array.isArray(bundledEntries)) {
      return null;
    }

    const sortedEntries = sortAuditEntriesNewestFirst(bundledEntries);
    const dateFilteredEntries = this.applyDateRangeFilter(
      sortedEntries,
      params.startDate,
      params.endDate
    );
    const filteredEntries = applyAuditEntryFilters(dateFilteredEntries, {
      ...params,
      userId: undefined
    });

    return applyAuditPagination(filteredEntries, params);
  }

  private async getAuditEntries(params: AuditQueryParams, requestingUser?: User): Promise<ValidationAuditEntry[]> {
    try {
      const bundledArchivedEntries = await this.getBundledArchivedCaseAuditEntries(params, requestingUser);
      if (bundledArchivedEntries !== null) {
        return bundledArchivedEntries;
      }

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
