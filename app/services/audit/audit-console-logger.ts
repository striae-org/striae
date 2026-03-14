import { ValidationAuditEntry } from '~/types';

export const getAuditSecurityIssuesForConsole = (
  entry: ValidationAuditEntry
): string[] => {
  const checks = entry.details.securityChecks;
  if (!checks) {
    return [];
  }

  const securityIssues = [];

  // For console diagnostics, self-confirmation is relevant for import actions only.
  if (entry.action === 'import' && checks.selfConfirmationPrevented === true) {
    securityIssues.push('selfConfirmationPrevented');
  }

  if (checks.fileIntegrityValid === false) {
    securityIssues.push('fileIntegrityValid');
  }

  if (checks.exporterUidValidated === false) {
    securityIssues.push('exporterUidValidated');
  }

  return securityIssues;
};

export const logAuditEntryToConsole = (entry: ValidationAuditEntry): void => {
  const icon = entry.result === 'success' ? '✅' :
    entry.result === 'failure' ? '❌' : '⚠️';

  console.log(
    `${icon} Audit [${entry.action.toUpperCase()}]: ${entry.details.fileName} ` +
    `(Case: ${entry.details.caseNumber || 'N/A'}) - ${entry.result.toUpperCase()}`
  );

  if (entry.details.validationErrors.length > 0) {
    console.log('   Errors:', entry.details.validationErrors);
  }

  const securityIssues = getAuditSecurityIssuesForConsole(entry);
  if (securityIssues.length > 0) {
    console.warn('   Security Issues:', securityIssues);
  }
};
