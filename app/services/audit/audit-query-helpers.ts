import {
  type AuditQueryParams,
  type AuditSummary,
  type ValidationAuditEntry,
  type WorkflowPhase
} from '~/types';

export const applyAuditEntryFilters = (
  entries: ValidationAuditEntry[],
  params: AuditQueryParams
): ValidationAuditEntry[] => {
  let filtered = entries;

  if (params.caseNumber) {
    filtered = filtered.filter(entry => entry.details.caseNumber === params.caseNumber);
  }

  if (params.userId) {
    filtered = filtered.filter(entry => entry.userId === params.userId);
  }

  if (params.action) {
    filtered = filtered.filter(entry => entry.action === params.action);
  }

  if (params.result) {
    filtered = filtered.filter(entry => entry.result === params.result);
  }

  if (params.workflowPhase) {
    filtered = filtered.filter(entry => entry.details.workflowPhase === params.workflowPhase);
  }

  return filtered;
};

export const applyAuditPagination = (
  entries: ValidationAuditEntry[],
  params: Pick<AuditQueryParams, 'offset' | 'limit'>
): ValidationAuditEntry[] => {
  if (params.offset || params.limit) {
    const offset = params.offset || 0;
    const limit = params.limit || 100;
    return entries.slice(offset, offset + limit);
  }

  return entries;
};

export const sortAuditEntriesNewestFirst = (
  entries: ValidationAuditEntry[]
): ValidationAuditEntry[] => {
  const sorted = [...entries];
  sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return sorted;
};

export const generateAuditSummary = (entries: ValidationAuditEntry[]): AuditSummary => {
  const successCount = entries.filter(entry => entry.result === 'success').length;
  const failureCount = entries.filter(entry => entry.result === 'failure').length;
  const warningCount = entries.filter(entry => entry.result === 'warning').length;

  const phases = [...new Set(entries
    .map(entry => entry.details.workflowPhase)
    .filter(Boolean))] as WorkflowPhase[];

  const users = [...new Set(entries.map(entry => entry.userId))];

  const timestamps = entries.map(entry => entry.timestamp).sort();
  const securityIncidents = entries.filter(entry =>
    entry.result === 'failure' &&
    (entry.details.securityChecks?.selfConfirmationPrevented === true ||
      !entry.details.securityChecks?.fileIntegrityValid)
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
};
