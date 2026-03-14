import { type AuditTrail, type ValidationAuditEntry } from '~/types';

const calculateDuration = (start: string, end: string): string => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;

  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const generateSecurityAnalysis = (entries: ValidationAuditEntry[]): string => {
  const securityEntries = entries.filter(entry => entry.details.securityChecks);

  if (securityEntries.length === 0) {
    return 'No security-sensitive operations detected.';
  }

  let selfConfirmationAttempts = 0;
  let fileIntegrityFailures = 0;
  let exporterValidationFailures = 0;
  let legitimateImports = 0;

  securityEntries.forEach(entry => {
    const checks = entry.details.securityChecks!;

    if (checks.selfConfirmationPrevented === true) {
      selfConfirmationAttempts++;
    }
    if (checks.fileIntegrityValid === false) {
      fileIntegrityFailures++;
    }
    if (checks.exporterUidValidated === false) {
      exporterValidationFailures++;
    }

    if (
      entry.action === 'import' &&
      entry.details.workflowPhase === 'confirmation' &&
      entry.result === 'success' &&
      checks.selfConfirmationPrevented === false
    ) {
      legitimateImports++;
    }
  });

  return [
    `Total Security-Sensitive Operations: ${securityEntries.length}`,
    `Legitimate Confirmation Imports: ${legitimateImports}`,
    `Self-Confirmation Attempts Blocked: ${selfConfirmationAttempts}`,
    `File Integrity Failures: ${fileIntegrityFailures}`,
    `Exporter Validation Failures: ${exporterValidationFailures}`,
    '',
    selfConfirmationAttempts === 0 && fileIntegrityFailures === 0 && exporterValidationFailures === 0
      ? '✅ No security violations detected'
      : '⚠️ Security violations detected - review required'
  ].join('\n');
};

const generateConfirmationSummary = (entries: ValidationAuditEntry[]): string => {
  const confirmationEntries = entries.filter(entry =>
    entry.details.workflowPhase === 'confirmation' ||
    (entry.action === 'import' && entry.details.fileType === 'confirmation-data')
  );

  if (confirmationEntries.length === 0) {
    return 'No confirmation workflow operations detected.';
  }

  const imports = confirmationEntries.filter(entry => entry.action === 'import');
  const exports = confirmationEntries.filter(entry => entry.action === 'export');
  const creations = confirmationEntries.filter(entry => entry.action === 'confirm');

  let totalConfirmationsImported = 0;
  let totalConfirmationsInFiles = 0;
  const reviewingExaminers = new Set<string>();

  imports.forEach(entry => {
    const metrics = entry.details.performanceMetrics;
    const caseDetails = entry.details.caseDetails;

    if (metrics?.validationStepsCompleted) {
      totalConfirmationsImported += metrics.validationStepsCompleted;
    }
    if (caseDetails?.totalAnnotations) {
      totalConfirmationsInFiles += caseDetails.totalAnnotations;
    }
    if (entry.details.reviewingExaminerUid) {
      reviewingExaminers.add(entry.details.reviewingExaminerUid);
    }
  });

  return [
    `Confirmation Operations: ${confirmationEntries.length}`,
    `- Imports: ${imports.length}`,
    `- Exports: ${exports.length}`,
    `- Creations: ${creations.length}`,
    '',
    `Total Confirmations Imported: ${totalConfirmationsImported}`,
    `Total Confirmations in Import Files: ${totalConfirmationsInFiles}`,
    `Reviewing Examiners Involved: ${reviewingExaminers.size}`,
    '',
    reviewingExaminers.size > 0
      ? `External Reviewers: ${Array.from(reviewingExaminers).join(', ')}`
      : 'No external reviewers detected'
  ].join('\n');
};

export const buildAuditReportContent = (auditTrail: AuditTrail, generatedAt: string): string => {
  const summary = auditTrail.summary;
  const successRate = ((summary.successfulEvents / summary.totalEvents) * 100).toFixed(1);

  return `
STRIAE AUDIT TRAIL REPORT
============================

Case Number: ${auditTrail.caseNumber}
Workflow ID: ${auditTrail.workflowId}
Report Generated: ${new Date(generatedAt).toLocaleString()}

SUMMARY STATISTICS
------------------
Total Events: ${summary.totalEvents}
Successful Events: ${summary.successfulEvents} (${successRate}%)
Failed Events: ${summary.failedEvents}
Warning Events: ${summary.warningEvents}
Security Incidents: ${summary.securityIncidents}

COMPLIANCE STATUS
-----------------
Status: ${summary.complianceStatus.toUpperCase()}
${summary.complianceStatus === 'compliant'
    ? '✅ All audit events completed successfully'
    : '⚠️ Some audit events failed - requires investigation'}

TIMELINE
--------
Start Time: ${new Date(summary.startTimestamp).toLocaleString()}
End Time: ${new Date(summary.endTimestamp).toLocaleString()}
Duration: ${calculateDuration(summary.startTimestamp, summary.endTimestamp)}

PARTICIPANTS
------------
Users Involved: ${summary.participatingUsers.length}
${summary.participatingUsers.map(uid => `- User ID: ${uid}`).join('\n')}

WORKFLOW PHASES
---------------
${summary.workflowPhases.map(phase => `- ${phase}`).join('\n')}

SECURITY ANALYSIS
-----------------
${generateSecurityAnalysis(auditTrail.entries)}

CONFIRMATION WORKFLOW DETAILS
------------------------------
${generateConfirmationSummary(auditTrail.entries)}

---
This report contains ${summary.totalEvents} audit entries providing complete forensic accountability.
Generated by Striae
    `.trim();
};
