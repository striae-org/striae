import { ValidationAuditEntry, AuditTrail } from '~/types';
import { User } from 'firebase/auth';
import { calculateSHA256Secure } from '~/utils/SHA256';
import { signAuditExportData } from '~/utils/data-operations';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  AuditExportFormat,
  AuditExportSigningPayload,
  AuditExportType
} from '~/utils/audit-export-signature';

interface AuditExportContext {
  user: User;
  scopeType: 'case' | 'user';
  scopeIdentifier: string;
  caseNumber?: string;
}

/**
 * Audit Export Service
 * Handles exporting audit trails to various formats for compliance and forensic analysis
 */
export class AuditExportService {
  private static instance: AuditExportService;

  private constructor() {}

  public static getInstance(): AuditExportService {
    if (!AuditExportService.instance) {
      AuditExportService.instance = new AuditExportService();
    }
    return AuditExportService.instance;
  }

  /**
   * Export audit entries to CSV format
   */
  public async exportToCSV(
    entries: ValidationAuditEntry[],
    filename: string,
    context: AuditExportContext
  ): Promise<void> {
    const headers = [
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
      'Total Confirmations In File',
      'Confirmations Successfully Imported',
      'Validation Steps Failed',
      'Case Name',
      'Total Files',
      'MFA Method',
      'Security Incident Type',
      'Security Severity'
    ];

    const csvData = [
      headers.join(','),
      ...entries.map(entry => this.entryToCSVRow(entry))
    ].join('\n');

    const generatedAt = new Date().toISOString();
    const hash = await calculateSHA256Secure(csvData);
    const signaturePayload = await this.signAuditExport(
      {
        exportFormat: 'csv',
        exportType: 'entries',
        generatedAt,
        totalEntries: entries.length,
        hash: hash.toUpperCase()
      },
      context
    );
    
    // Add hash metadata header
    const csvContent = [
      `# Striae Audit Export - Generated: ${generatedAt}`,
      `# Total Entries: ${entries.length}`,
      `# SHA-256 Hash: ${hash.toUpperCase()}`,
      `# Audit Signature Metadata: ${JSON.stringify(signaturePayload.signatureMetadata)}`,
      `# Audit Signature: ${JSON.stringify(signaturePayload.signature)}`,
      `# Verification: Recalculate SHA-256 of data rows only (excluding these comment lines)`,
      '',
      csvData
    ].join('\n');

    this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Export audit trail to detailed CSV with summary
   */
  public async exportAuditTrailToCSV(
    auditTrail: AuditTrail,
    filename: string,
    context: AuditExportContext
  ): Promise<void> {
    const summaryHeaders = [
      'Case Number',
      'Workflow ID',
      'Total Events',
      'Successful Events',
      'Failed Events',
      'Warning Events',
      'Compliance Status',
      'Security Incidents',
      'Start Time',
      'End Time',
      'Participating Users'
    ];

    const summaryRow = [
      auditTrail.caseNumber,
      auditTrail.workflowId,
      auditTrail.summary.totalEvents,
      auditTrail.summary.successfulEvents,
      auditTrail.summary.failedEvents,
      auditTrail.summary.warningEvents,
      auditTrail.summary.complianceStatus.toUpperCase(),
      auditTrail.summary.securityIncidents,
      auditTrail.summary.startTimestamp,
      auditTrail.summary.endTimestamp,
      auditTrail.summary.participatingUsers.join('; ')
    ].join(',');

    const entryHeaders = [
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
      'Total Confirmations In File',
      'Confirmations Successfully Imported',
      'Validation Steps Failed',
      'Case Name',
      'Total Files',
      'MFA Method',
      'Security Incident Type',
      'Security Severity'
    ];

    const csvData = [
      summaryHeaders.join(','),
      summaryRow,
      '',
      entryHeaders.join(','),
      ...auditTrail.entries.map(entry => this.entryToCSVRow(entry))
    ].join('\n');

    const generatedAt = new Date().toISOString();
    const hash = await calculateSHA256Secure(csvData);
    const signaturePayload = await this.signAuditExport(
      {
        exportFormat: 'csv',
        exportType: 'trail',
        generatedAt,
        totalEntries: auditTrail.summary.totalEvents,
        hash: hash.toUpperCase()
      },
      context
    );
    
    const csvContent = [
      '# Striae Audit Trail Export - Generated: ' + generatedAt,
      `# Case: ${auditTrail.caseNumber} | Workflow: ${auditTrail.workflowId}`,
      `# Total Events: ${auditTrail.summary.totalEvents}`,
      `# SHA-256 Hash: ${hash.toUpperCase()}`,
      `# Audit Signature Metadata: ${JSON.stringify(signaturePayload.signatureMetadata)}`,
      `# Audit Signature: ${JSON.stringify(signaturePayload.signature)}`,
      '# Verification: Recalculate SHA-256 of data rows only (excluding these comment lines)',
      '',
      '# AUDIT TRAIL SUMMARY',
      csvData
    ].join('\n');

    this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Convert audit entry to CSV row
   */
  private entryToCSVRow(entry: ValidationAuditEntry): string {
    const fileDetails = entry.details.fileDetails;
    const annotationDetails = entry.details.annotationDetails;
    const sessionDetails = entry.details.sessionDetails;
    const securityChecks = entry.details.securityChecks;
    const userProfileDetails = entry.details.userProfileDetails;
    const caseDetails = entry.details.caseDetails;
    const performanceMetrics = entry.details.performanceMetrics;
    const securityDetails = entry.details.securityDetails;
    
    // Calculate security check status - different checks have different semantics
    const securityIssues = securityChecks ? (() => {
      const issues = [];
      
      // selfConfirmationPrevented: true means issue (prevention was triggered)
      if (securityChecks.selfConfirmationPrevented === true) {
        issues.push('selfConfirmationPrevented');
      }
      
      // fileIntegrityValid: false means issue (file integrity failed)
      if (securityChecks.fileIntegrityValid === false) {
        issues.push('fileIntegrityValid');
      }
      
      // exporterUidValidated: false means issue (validation failed)
      if (securityChecks.exporterUidValidated === false) {
        issues.push('exporterUidValidated');
      }
      
      return issues.join('; ');
    })() : '';

    const values = [
      this.formatForCSV(entry.timestamp),
      this.formatForCSV(entry.userEmail),
      this.formatForCSV(entry.action),
      this.formatForCSV(entry.result),
      this.formatForCSV(entry.details.fileName),
      this.formatForCSV(entry.details.fileType),
      this.formatForCSV(entry.details.caseNumber),
      this.formatForCSV(entry.details.confirmationId),
      this.formatForCSV(entry.details.originalExaminerUid),
      this.formatForCSV(entry.details.reviewingExaminerUid),
      this.formatForCSV(fileDetails?.fileId),
      this.formatForCSV(fileDetails?.originalFileName),
      fileDetails?.fileSize ? (fileDetails.fileSize / 1024 / 1024).toFixed(2) : '',
      this.formatForCSV(fileDetails?.mimeType),
      this.formatForCSV(fileDetails?.uploadMethod),
      this.formatForCSV(fileDetails?.deleteReason),
      this.formatForCSV(annotationDetails?.annotationId),
      this.formatForCSV(annotationDetails?.annotationType),
      this.formatForCSV(annotationDetails?.tool),
      this.formatForCSV(sessionDetails?.sessionId),
      this.formatForCSV(sessionDetails?.userAgent),
      performanceMetrics?.processingTimeMs || '',
      entry.details.hashValid !== undefined ? 
        (entry.details.hashValid ? 'Yes' : 'No') : '',
      this.formatForCSV(entry.details.validationErrors?.join('; ')),
      this.formatForCSV(securityIssues),
      this.formatForCSV(entry.details.workflowPhase),
      this.formatForCSV(userProfileDetails?.profileField),
      this.formatForCSV(userProfileDetails?.oldValue),
      this.formatForCSV(userProfileDetails?.newValue),
      // New confirmation tracking fields
      caseDetails?.totalAnnotations?.toString() || '', // Total confirmations in file
      performanceMetrics?.validationStepsCompleted?.toString() || '', // Successfully imported
      performanceMetrics?.validationStepsFailed?.toString() || '', // Validation steps failed
      // Additional case and audit details
      this.formatForCSV(caseDetails?.newCaseName || caseDetails?.oldCaseName), // Case name
      caseDetails?.totalFiles?.toString() || '', // Total files in case
      this.formatForCSV(securityDetails?.mfaMethod), // MFA method
      this.formatForCSV(securityDetails?.incidentType), // Security incident type
      this.formatForCSV(securityDetails?.severity) // Security severity
    ];

    return values.join(',');
  }

  /**
   * Format value for CSV (handle quotes and commas)
   */
  private formatForCSV(value?: string | number | null): string {
    if (value === undefined || value === null) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Generate filename with timestamp
   */
  public generateFilename(type: 'case' | 'user', identifier: string, format: 'csv' | 'json'): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedId = identifier.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `striae-audit-${type}-${sanitizedId}-${timestamp}.${format}`;
  }

  /**
   * Download file helper
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Export audit entries to JSON format (for technical analysis)
   */
  public async exportToJSON(
    entries: ValidationAuditEntry[],
    filename: string,
    context: AuditExportContext
  ): Promise<void> {
    const generatedAt = new Date().toISOString();

    const exportData = {
      metadata: {
        exportTimestamp: generatedAt,
        exportVersion: '1.0',
        totalEntries: entries.length,
        application: 'Striae',
        exportType: 'entries' as AuditExportType,
        scopeType: context.scopeType,
        scopeIdentifier: context.scopeIdentifier
      },
      auditEntries: entries
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Calculate hash for integrity verification
    const hash = await calculateSHA256Secure(jsonContent);
    const signaturePayload = await this.signAuditExport(
      {
        exportFormat: 'json',
        exportType: exportData.metadata.exportType,
        generatedAt,
        totalEntries: entries.length,
        hash: hash.toUpperCase()
      },
      context
    );
    
    // Create final export with hash included
    const finalExportData = {
      metadata: {
        ...exportData.metadata,
        hash: hash.toUpperCase(),
        integrityNote: 'Verify hash and signature before trusting this export',
        signatureVersion: signaturePayload.signatureMetadata.signatureVersion,
        signature: signaturePayload.signature
      },
      auditEntries: entries
    };

    const finalJsonContent = JSON.stringify(finalExportData, null, 2);
    this.downloadFile(finalJsonContent, filename.replace('.csv', '.json'), 'application/json');
  }

  /**
   * Export full audit trail to JSON
   */
  public async exportAuditTrailToJSON(
    auditTrail: AuditTrail,
    filename: string,
    context: AuditExportContext
  ): Promise<void> {
    const generatedAt = new Date().toISOString();

    const exportData = {
      metadata: {
        exportTimestamp: generatedAt,
        exportVersion: '1.0',
        totalEntries: auditTrail.summary.totalEvents,
        application: 'Striae',
        exportType: 'trail' as AuditExportType,
        scopeType: context.scopeType,
        scopeIdentifier: context.scopeIdentifier
      },
      auditTrail
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Calculate hash for integrity verification
    const hash = await calculateSHA256Secure(jsonContent);
    const signaturePayload = await this.signAuditExport(
      {
        exportFormat: 'json',
        exportType: exportData.metadata.exportType,
        generatedAt,
        totalEntries: auditTrail.summary.totalEvents,
        hash: hash.toUpperCase()
      },
      context
    );
    
    // Create final export with hash included
    const finalExportData = {
      metadata: {
        ...exportData.metadata,
        hash: hash.toUpperCase(),
        integrityNote: 'Verify hash and signature before trusting this export',
        signatureVersion: signaturePayload.signatureMetadata.signatureVersion,
        signature: signaturePayload.signature
      },
      auditTrail
    };

    const finalJsonContent = JSON.stringify(finalExportData, null, 2);
    this.downloadFile(finalJsonContent, filename.replace('.csv', '.json'), 'application/json');
  }

  /**
   * Generate audit report summary text
   */
  public async generateReportSummary(auditTrail: AuditTrail, context: AuditExportContext): Promise<string> {
    const summary = auditTrail.summary;
    const successRate = ((summary.successfulEvents / summary.totalEvents) * 100).toFixed(1);
    const generatedAt = new Date().toISOString();
    
    const reportContent = `
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
${summary.complianceStatus === 'compliant' ? 
  '✅ All audit events completed successfully' : 
  '⚠️ Some audit events failed - requires investigation'}

TIMELINE
--------
Start Time: ${new Date(summary.startTimestamp).toLocaleString()}
End Time: ${new Date(summary.endTimestamp).toLocaleString()}
Duration: ${this.calculateDuration(summary.startTimestamp, summary.endTimestamp)}

PARTICIPANTS
------------
Users Involved: ${summary.participatingUsers.length}
${summary.participatingUsers.map(uid => `- User ID: ${uid}`).join('\n')}

WORKFLOW PHASES
---------------
${summary.workflowPhases.map(phase => `- ${phase}`).join('\n')}

SECURITY ANALYSIS
-----------------
${this.generateSecurityAnalysis(auditTrail.entries)}

CONFIRMATION WORKFLOW DETAILS
------------------------------
${this.generateConfirmationSummary(auditTrail.entries)}

---
This report contains ${summary.totalEvents} audit entries providing complete forensic accountability.
Generated by Striae
    `.trim();

    return this.appendSignedReportIntegrity(
      reportContent,
      context,
      summary.totalEvents,
      generatedAt
    );
  }

  /**
   * Append signed integrity metadata to a plain-text audit report.
   */
  public async appendSignedReportIntegrity(
    reportContent: string,
    context: AuditExportContext,
    totalEntries: number,
    generatedAt: string = new Date().toISOString()
  ): Promise<string> {
    const hash = await calculateSHA256Secure(reportContent);
    const signaturePayload = await this.signAuditExport(
      {
        exportFormat: 'txt',
        exportType: 'report',
        generatedAt,
        totalEntries,
        hash: hash.toUpperCase()
      },
      context
    );

    return reportContent + `

============================
INTEGRITY VERIFICATION
============================
Report Content SHA-256 Hash: ${hash.toUpperCase()}
Audit Signature Metadata: ${JSON.stringify(signaturePayload.signatureMetadata)}
Audit Signature: ${JSON.stringify(signaturePayload.signature)}

Verification Instructions:
1. Copy the entire report content above the "INTEGRITY VERIFICATION" section
2. Calculate SHA256 hash of that content (excluding this verification section)
3. Validate audit signature metadata and signature with your signature verification workflow (for example OpenSSL or an internal verifier)
4. Confirm both hash and signature validation pass before relying on this report

This report requires both hash and signature validation for tamper detection.
Generated by Striae`;
  }

  private buildAuditSignaturePayload(
    exportFormat: AuditExportFormat,
    exportType: AuditExportType,
    generatedAt: string,
    totalEntries: number,
    hash: string,
    context: AuditExportContext
  ): AuditExportSigningPayload {
    return {
      signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
      exportFormat,
      exportType,
      scopeType: context.scopeType,
      scopeIdentifier: context.scopeIdentifier,
      generatedAt,
      totalEntries,
      hash: hash.toUpperCase()
    };
  }

  private async signAuditExport(
    payload: {
      exportFormat: AuditExportFormat;
      exportType: AuditExportType;
      generatedAt: string;
      totalEntries: number;
      hash: string;
    },
    context: AuditExportContext
  ): Promise<{
    signatureMetadata: AuditExportSigningPayload;
    signature: {
      algorithm: string;
      keyId: string;
      signedAt: string;
      value: string;
    };
  }> {
    const signatureMetadata = this.buildAuditSignaturePayload(
      payload.exportFormat,
      payload.exportType,
      payload.generatedAt,
      payload.totalEntries,
      payload.hash,
      context
    );

    const caseNumber =
      context.scopeType === 'case'
        ? (context.caseNumber || context.scopeIdentifier)
        : undefined;

    const signatureResponse = await signAuditExportData(
      context.user,
      signatureMetadata,
      { caseNumber }
    );

    return {
      signatureMetadata,
      signature: signatureResponse.signature
    };
  }

  /**
   * Calculate duration between timestamps
   */
  private calculateDuration(start: string, end: string): string {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate security analysis section for reports
   */
  private generateSecurityAnalysis(entries: ValidationAuditEntry[]): string {
    const securityEntries = entries.filter(e => e.details.securityChecks);
    
    if (securityEntries.length === 0) {
      return 'No security-sensitive operations detected.';
    }

    let selfConfirmationAttempts = 0;
    let fileIntegrityFailures = 0;
    let exporterValidationFailures = 0;
    let legitimateImports = 0;

    securityEntries.forEach(entry => {
      const checks = entry.details.securityChecks!;
      
      // Count actual security issues
      if (checks.selfConfirmationPrevented === true) {
        selfConfirmationAttempts++;
      }
      if (checks.fileIntegrityValid === false) {
        fileIntegrityFailures++;
      }
      if (checks.exporterUidValidated === false) {
        exporterValidationFailures++;
      }
      
      // Count legitimate confirmation imports
      if (entry.action === 'import' && entry.details.workflowPhase === 'confirmation' && 
          entry.result === 'success' && checks.selfConfirmationPrevented === false) {
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
  }

  /**
   * Generate confirmation workflow summary for reports
   */
  private generateConfirmationSummary(entries: ValidationAuditEntry[]): string {
    const confirmationEntries = entries.filter(e => 
      e.details.workflowPhase === 'confirmation' || 
      (e.action === 'import' && e.details.fileType === 'confirmation-data')
    );

    if (confirmationEntries.length === 0) {
      return 'No confirmation workflow operations detected.';
    }

    const imports = confirmationEntries.filter(e => e.action === 'import');
    const exports = confirmationEntries.filter(e => e.action === 'export');
    const creations = confirmationEntries.filter(e => e.action === 'confirm');

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
  }
}

// Export singleton instance
export const auditExportService = AuditExportService.getInstance();