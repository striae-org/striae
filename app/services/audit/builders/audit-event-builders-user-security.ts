import type { User } from 'firebase/auth';
import { type AuditResult, type CreateAuditEntryParams } from '~/types';

interface BuildUserLoginAuditParamsInput {
  user: User;
  sessionId: string;
  loginMethod: 'firebase' | 'sso' | 'api-key' | 'manual';
  userAgent?: string;
}

export const buildUserLoginAuditParams = (
  input: BuildUserLoginAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'user-login',
    result: 'success',
    fileName: `session-${input.sessionId}.log`,
    fileType: 'log-file',
    validationErrors: [],
    workflowPhase: 'user-management',
    sessionDetails: {
      sessionId: input.sessionId,
      userAgent: input.userAgent,
      loginMethod: input.loginMethod
    }
  };
};

interface BuildUserLogoutAuditParamsInput {
  user: User;
  sessionId: string;
  sessionDuration: number;
  logoutReason: 'user-initiated' | 'timeout' | 'security' | 'error';
}

export const buildUserLogoutAuditParams = (
  input: BuildUserLogoutAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'user-logout',
    result: 'success',
    fileName: `session-${input.sessionId}.log`,
    fileType: 'log-file',
    validationErrors: [],
    workflowPhase: 'user-management',
    sessionDetails: {
      sessionId: input.sessionId,
      sessionDuration: input.sessionDuration,
      logoutReason: input.logoutReason
    }
  };
};

interface BuildUserProfileUpdateAuditParamsInput {
  user: User;
  profileField: 'displayName' | 'email' | 'organization' | 'role' | 'preferences' | 'avatar';
  oldValue: string;
  newValue: string;
  result: AuditResult;
  sessionId?: string;
  errors?: string[];
}

export const buildUserProfileUpdateAuditParams = (
  input: BuildUserProfileUpdateAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'user-profile-update',
    result: input.result,
    fileName: `profile-update-${input.profileField}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId
        }
      : undefined,
    userProfileDetails: {
      profileField: input.profileField,
      oldValue: input.oldValue,
      newValue: input.newValue
    }
  };
};

interface BuildPasswordResetAuditParamsInput {
  userEmail: string;
  resetMethod: 'email' | 'sms' | 'security-questions' | 'admin-reset';
  result: AuditResult;
  resetToken?: string;
  verificationMethod?: 'email-link' | 'sms-code' | 'totp' | 'backup-codes';
  verificationAttempts?: number;
  passwordComplexityMet?: boolean;
  previousPasswordReused?: boolean;
  sessionId?: string;
  errors?: string[];
}

export const buildPasswordResetAuditParams = (
  input: BuildPasswordResetAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: '',
    userEmail: input.userEmail,
    action: 'user-password-reset',
    result: input.result,
    fileName: `password-reset-${input.resetMethod}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId
        }
      : undefined,
    userProfileDetails: {
      resetMethod: input.resetMethod,
      resetToken: input.resetToken ? `***${input.resetToken.slice(-4)}` : undefined,
      verificationMethod: input.verificationMethod,
      verificationAttempts: input.verificationAttempts,
      passwordComplexityMet: input.passwordComplexityMet,
      previousPasswordReused: input.previousPasswordReused
    }
  };
};

interface BuildAccountDeletionAuditParamsInput {
  userId: string;
  userEmail: string;
  result: AuditResult;
  deletionReason?: 'user-requested' | 'admin-initiated' | 'policy-violation' | 'inactive-account';
  confirmationMethod?: 'uid-email' | 'password' | 'admin-override';
  casesCount?: number;
  filesCount?: number;
  dataRetentionPeriod?: number;
  emailNotificationSent?: boolean;
  sessionId?: string;
  errors?: string[];
}

export const buildAccountDeletionAuditParams = (
  input: BuildAccountDeletionAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.userId,
    userEmail: input.userEmail || '',
    action: 'user-account-delete',
    result: input.result,
    fileName: `account-deletion-${input.userId}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId
        }
      : undefined,
    userProfileDetails: {
      deletionReason: input.deletionReason || 'user-requested',
      confirmationMethod: input.confirmationMethod || 'uid-email',
      casesCount: input.casesCount,
      filesCount: input.filesCount,
      dataRetentionPeriod: input.dataRetentionPeriod,
      emailNotificationSent: input.emailNotificationSent
    }
  };
};

interface BuildUserRegistrationAuditParamsInput {
  user: User;
  firstName: string;
  lastName: string;
  company: string;
  registrationMethod: 'email-password' | 'sso' | 'admin-created' | 'api';
  userAgent?: string;
  sessionId?: string;
}

export const buildUserRegistrationAuditParams = (
  input: BuildUserRegistrationAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'user-registration',
    result: 'success',
    fileName: `registration-${input.user.uid}.log`,
    fileType: 'log-file',
    validationErrors: [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    userProfileDetails: {
      registrationMethod: input.registrationMethod,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      emailVerificationRequired: true,
      mfaEnrollmentRequired: true
    }
  };
};

interface BuildMfaEnrollmentAuditParamsInput {
  user: User;
  phoneNumber: string;
  mfaMethod: 'sms' | 'totp' | 'hardware-key';
  result: AuditResult;
  enrollmentAttempts?: number;
  sessionId?: string;
  userAgent?: string;
  errors?: string[];
}

const getMaskedPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.length > 4 ? `***-***-${phoneNumber.slice(-4)}` : '***-***-****';
};

export const buildMfaEnrollmentAuditParams = (
  input: BuildMfaEnrollmentAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'mfa-enrollment',
    result: input.result,
    fileName: `mfa-enrollment-${input.user.uid}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    securityDetails: {
      mfaMethod: input.mfaMethod,
      phoneNumber: getMaskedPhoneNumber(input.phoneNumber),
      enrollmentAttempts: input.enrollmentAttempts,
      enrollmentDate: new Date().toISOString(),
      mandatoryEnrollment: true,
      backupCodesGenerated: false
    }
  };
};

interface BuildMfaAuthenticationAuditParamsInput {
  user: User;
  mfaMethod: 'sms' | 'totp' | 'hardware-key';
  result: AuditResult;
  verificationAttempts?: number;
  sessionId?: string;
  userAgent?: string;
  errors?: string[];
}

export const buildMfaAuthenticationAuditParams = (
  input: BuildMfaAuthenticationAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'mfa-authentication',
    result: input.result,
    fileName: `mfa-auth-${input.sessionId || Date.now()}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    securityDetails: {
      mfaMethod: input.mfaMethod,
      verificationAttempts: input.verificationAttempts,
      authenticationDate: new Date().toISOString(),
      loginFlowStep: 'second-factor'
    }
  };
};

interface BuildEmailVerificationAuditParamsInput {
  user: User;
  result: AuditResult;
  verificationMethod: 'email-link' | 'admin-verification';
  verificationAttempts?: number;
  sessionId?: string;
  userAgent?: string;
  errors?: string[];
}

export const buildEmailVerificationAuditParams = (
  input: BuildEmailVerificationAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'email-verification',
    result: input.result,
    fileName: `email-verification-${input.user.uid}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    userProfileDetails: {
      verificationMethod: input.verificationMethod,
      verificationAttempts: input.verificationAttempts,
      verificationDate: new Date().toISOString(),
      emailVerified: input.result === 'success'
    }
  };
};

interface BuildEmailVerificationByEmailAuditParamsInput {
  userEmail: string;
  result: AuditResult;
  verificationMethod: 'email-link' | 'admin-verification';
  verificationAttempts?: number;
  sessionId?: string;
  userAgent?: string;
  errors?: string[];
  userId?: string;
}

export const buildEmailVerificationByEmailAuditParams = (
  input: BuildEmailVerificationByEmailAuditParamsInput
): CreateAuditEntryParams => {
  const userId = input.userId || '';

  return {
    userId,
    userEmail: input.userEmail,
    action: 'email-verification',
    result: input.result,
    fileName: `email-verification-${userId || Date.now()}.log`,
    fileType: 'log-file',
    validationErrors: input.errors || [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    userProfileDetails: {
      verificationMethod: input.verificationMethod,
      verificationAttempts: input.verificationAttempts,
      verificationDate: new Date().toISOString(),
      emailVerified: input.result === 'success'
    }
  };
};

interface BuildMarkEmailVerificationSuccessfulAuditParamsInput {
  user: User;
  reason?: string;
  sessionId?: string;
  userAgent?: string;
}

export const buildMarkEmailVerificationSuccessfulAuditParams = (
  input: BuildMarkEmailVerificationSuccessfulAuditParamsInput
): CreateAuditEntryParams => {
  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'email-verification',
    result: 'success',
    fileName: `email-verification-${input.user.uid}.log`,
    fileType: 'log-file',
    validationErrors: [],
    workflowPhase: 'user-management',
    sessionDetails: input.sessionId
      ? {
          sessionId: input.sessionId,
          userAgent: input.userAgent
        }
      : { userAgent: input.userAgent },
    userProfileDetails: {
      verificationMethod: 'email-link',
      verificationAttempts: 1,
      verificationDate: new Date().toISOString(),
      emailVerified: true,
      retroactiveVerification: true,
      retroactiveReason: input.reason || 'MFA enrollment completed'
    }
  };
};

interface BuildSecurityViolationAuditParamsInput {
  user: User | null;
  incidentType:
    | 'unauthorized-access'
    | 'data-breach'
    | 'malware'
    | 'injection'
    | 'brute-force'
    | 'privilege-escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  targetResource?: string;
  blockedBySystem?: boolean;
}

export const buildSecurityViolationAuditParams = (
  input: BuildSecurityViolationAuditParamsInput
): CreateAuditEntryParams => {
  const blockedBySystem = input.blockedBySystem !== undefined ? input.blockedBySystem : true;

  return {
    userId: input.user?.uid || 'unknown',
    userEmail: input.user?.email || 'unknown@system.com',
    action: 'security-violation',
    result: blockedBySystem ? 'blocked' : 'failure',
    fileName: `security-incident-${Date.now()}.log`,
    fileType: 'log-file',
    validationErrors: [input.description],
    securityDetails: {
      incidentType: input.incidentType,
      severity: input.severity,
      targetResource: input.targetResource,
      blockedBySystem,
      investigationId: `INV-${Date.now()}`,
      reportedToAuthorities: input.severity === 'critical',
      mitigationSteps: [
        blockedBySystem ? 'Automatically blocked by system' : 'Manual intervention required'
      ]
    }
  };
};
