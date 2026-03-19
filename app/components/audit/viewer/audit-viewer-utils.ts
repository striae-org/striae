import { type AuditAction, type AuditResult, type ValidationAuditEntry } from '~/types';

export interface AuditViewerSummaryStats {
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  loginSessions: number;
  securityIncidents: number;
}

export const getAuditActionIcon = (action: AuditAction): string => {
  switch (action) {
    case 'user-login':
      return '🔑';
    case 'user-logout':
      return '🚪';
    case 'user-profile-update':
      return '👤';
    case 'user-password-reset':
      return '🔒';
    case 'user-registration':
      return '📝';
    case 'email-verification':
      return '📧';
    case 'mfa-enrollment':
      return '🔐';
    case 'mfa-authentication':
      return '📱';
    case 'case-create':
      return '📂';
    case 'case-rename':
      return '✏️';
    case 'case-delete':
      return '🗑️';
    case 'case-export':
      return '📤';
    case 'case-import':
      return '📥';
    case 'confirmation-create':
      return '✅';
    case 'confirmation-export':
      return '📤';
    case 'confirmation-import':
      return '📥';
    case 'file-upload':
      return '⬆️';
    case 'file-delete':
      return '🗑️';
    case 'file-access':
      return '👁️';
    case 'annotation-create':
      return '✨';
    case 'annotation-edit':
      return '✏️';
    case 'annotation-delete':
      return '❌';
    case 'pdf-generate':
      return '📄';
    case 'security-violation':
      return '🚨';
    case 'export':
      return '📤';
    case 'import':
      return '📥';
    case 'confirm':
      return '✓';
    default:
      return '📄';
  }
};

export const getAuditStatusIcon = (result: AuditResult): string => {
  switch (result) {
    case 'success':
      return '✅';
    case 'failure':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'blocked':
      return '🛑';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
};

export const formatAuditTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

export const summarizeAuditEntries = (entries: ValidationAuditEntry[]): AuditViewerSummaryStats => {
  return entries.reduce<AuditViewerSummaryStats>((summary, entry) => {
    summary.totalEntries += 1;

    if (entry.result === 'success') {
      summary.successfulEntries += 1;
    }

    if (entry.result === 'failure') {
      summary.failedEntries += 1;
    }

    if (entry.action === 'user-login') {
      summary.loginSessions += 1;
    }

    if (entry.action === 'security-violation') {
      summary.securityIncidents += 1;
    }

    return summary;
  }, {
    totalEntries: 0,
    successfulEntries: 0,
    failedEntries: 0,
    loginSessions: 0,
    securityIncidents: 0
  });
};