import { ValidationAuditEntry, AuditTrail } from '~/types';
import { calculateSHA256Secure } from '~/utils/SHA256';

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
  public async exportToCSV(entries: ValidationAuditEntry[], filename: string): Promise<void> {
    const headers = [
      'Timestamp',
      'User Email',
      'Action',
      'Result',
      'File Name',
      'File Type',
      'Case Number',
      'File ID',
      'Original Filename',
      'File Size (MB)',
      'MIME Type',
      'Upload Method',
      'Delete Reason',
      'Source Location',
      'Thumbnail Generated',
      'Annotation Type',
      'Annotation Tool',
      'Session ID',
      'Processing Time (ms)',
      'Hash Valid',
      'Validation Errors',
      'Security Issues',
      'Workflow Phase',
      'Profile Field',
      'Old Value',
      'New Value',
      'Reset Method',
      'Verification Method',
      'Deletion Reason',
      'Confirmation Method',
      'Cases Count',
      'Files Count',
      'Data Retention Period',
      'Email Notification Sent'
    ];

    const csvData = [
      headers.join(','),
      ...entries.map(entry => this.entryToCSVRow(entry))
    ].join('\n');

    // Calculate checksum for integrity verification
    const checksum = await calculateSHA256Secure(csvData);
    
    // Add checksum metadata header
    const csvContent = [
      `# Striae Audit Export - Generated: ${new Date().toISOString()}`,
      `# Total Entries: ${entries.length}`,
      `# SHA-256 Hash: ${checksum.toUpperCase()}`,
      `# Verification: Recalculate SHA-256 of data rows only (excluding these comment lines)`,
      '',
      csvData
    ].join('\n');

    this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Export audit trail to detailed CSV with summary
   */
  public async exportAuditTrailToCSV(auditTrail: AuditTrail, filename: string): Promise<void> {
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
      'File ID',
      'Original Filename',
      'File Size (MB)',
      'MIME Type',
      'Upload Method',
      'Delete Reason',
      'Source Location',
      'Thumbnail Generated',
      'Annotation Type',
      'Annotation Tool',
      'Session ID',
      'Processing Time (ms)',
      'Hash Valid',
      'Validation Errors',
      'Security Issues',
      'Workflow Phase',
      'Profile Field',
      'Old Value',
      'New Value',
      'Reset Method',
      'Verification Method',
      'Deletion Reason',
      'Confirmation Method',
      'Cases Count',
      'Files Count',
      'Data Retention Period',
      'Email Notification Sent'
    ];

    const csvData = [
      summaryHeaders.join(','),
      summaryRow,
      '',
      entryHeaders.join(','),
      ...auditTrail.entries.map(entry => this.entryToCSVRow(entry))
    ].join('\n');

    // Calculate checksum for integrity verification
    const checksum = await calculateSHA256Secure(csvData);
    
    const csvContent = [
      '# Striae Audit Trail Export - Generated: ' + new Date().toISOString(),
      `# Case: ${auditTrail.caseNumber} | Workflow: ${auditTrail.workflowId}`,
      `# Total Events: ${auditTrail.summary.totalEvents}`,
      `# SHA-256 Hash: ${checksum.toUpperCase()}`,
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
    
    // Calculate security check status
    const securityIssues = securityChecks ? 
      Object.entries(securityChecks)
        .filter(([_, passed]) => !passed)
        .map(([check, _]) => check)
        .join('; ') : '';

    const values = [
      this.formatForCSV(entry.timestamp),
      this.formatForCSV(entry.userEmail),
      this.formatForCSV(entry.action),
      this.formatForCSV(entry.result),
      this.formatForCSV(entry.details.fileName),
      this.formatForCSV(entry.details.fileType),
      this.formatForCSV(entry.details.caseNumber),
      this.formatForCSV(fileDetails?.fileId),
      this.formatForCSV(fileDetails?.originalFileName),
      fileDetails?.fileSize ? (fileDetails.fileSize / 1024 / 1024).toFixed(2) : '',
      this.formatForCSV(fileDetails?.mimeType),
      this.formatForCSV(fileDetails?.uploadMethod),
      this.formatForCSV(fileDetails?.deleteReason),
      this.formatForCSV(fileDetails?.sourceLocation),
      fileDetails?.thumbnailGenerated !== undefined ? 
        (fileDetails.thumbnailGenerated ? 'Yes' : 'No') : '',
      this.formatForCSV(annotationDetails?.annotationType),
      this.formatForCSV(annotationDetails?.tool),
      this.formatForCSV(sessionDetails?.sessionId),
      entry.details.performanceMetrics?.processingTimeMs || '',
      entry.details.checksumValid !== undefined ? 
        (entry.details.checksumValid ? 'Yes' : 'No') : '',
      this.formatForCSV(entry.details.validationErrors?.join('; ')),
      this.formatForCSV(securityIssues),
      this.formatForCSV(entry.details.workflowPhase),
      this.formatForCSV(userProfileDetails?.profileField),
      this.formatForCSV(userProfileDetails?.oldValue),
      this.formatForCSV(userProfileDetails?.newValue),
      this.formatForCSV(userProfileDetails?.resetMethod),
      this.formatForCSV(userProfileDetails?.verificationMethod),
      this.formatForCSV(userProfileDetails?.deletionReason),
      this.formatForCSV(userProfileDetails?.confirmationMethod),
      userProfileDetails?.casesCount?.toString() || '',
      userProfileDetails?.filesCount?.toString() || '',
      userProfileDetails?.dataRetentionPeriod?.toString() || '',
      userProfileDetails?.emailNotificationSent !== undefined ? 
        (userProfileDetails.emailNotificationSent ? 'Yes' : 'No') : ''
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
  public async exportToJSON(entries: ValidationAuditEntry[], filename: string): Promise<void> {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        exportVersion: '1.0',
        totalEntries: entries.length,
        application: 'Striae'
      },
      auditEntries: entries
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Calculate checksum for integrity verification
    const checksum = await calculateSHA256Secure(jsonContent);
    
    // Create final export with checksum included
    const finalExportData = {
      metadata: {
        ...exportData.metadata,
        checksum: checksum.toUpperCase(),
        integrityNote: 'Verify by recalculating SHA256 of this entire JSON content'
      },
      auditEntries: entries
    };

    const finalJsonContent = JSON.stringify(finalExportData, null, 2);
    this.downloadFile(finalJsonContent, filename.replace('.csv', '.json'), 'application/json');
  }

  /**
   * Export full audit trail to JSON
   */
  public async exportAuditTrailToJSON(auditTrail: AuditTrail, filename: string): Promise<void> {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        exportVersion: '1.0',
        application: 'Striae'
      },
      auditTrail
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Calculate checksum for integrity verification
    const checksum = await calculateSHA256Secure(jsonContent);
    
    // Create final export with checksum included
    const finalExportData = {
      metadata: {
        ...exportData.metadata,
        checksum: checksum.toUpperCase(),
        integrityNote: 'Verify by recalculating SHA256 of this entire JSON content'
      },
      auditTrail
    };

    const finalJsonContent = JSON.stringify(finalExportData, null, 2);
    this.downloadFile(finalJsonContent, filename.replace('.csv', '.json'), 'application/json');
  }

  /**
   * Generate audit report summary text
   */
  public async generateReportSummary(auditTrail: AuditTrail): Promise<string> {
    const summary = auditTrail.summary;
    const successRate = ((summary.successfulEvents / summary.totalEvents) * 100).toFixed(1);
    
    const reportContent = `
STRIAE AUDIT TRAIL REPORT
============================

Case Number: ${auditTrail.caseNumber}
Workflow ID: ${auditTrail.workflowId}
Report Generated: ${new Date().toLocaleString()}

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

---
This report contains ${summary.totalEvents} audit entries providing complete forensic accountability.
Generated by Striae
    `.trim();

    // Calculate checksum for integrity verification
    const checksum = await calculateSHA256Secure(reportContent);
    
    // Add checksum section to the report
    return reportContent + `

============================
INTEGRITY VERIFICATION
============================
Report Content SHA-256 Hash: ${checksum.toUpperCase()}

Verification Instructions:
1. Copy the entire report content above the "INTEGRITY VERIFICATION" section
2. Calculate SHA256 hash of that content (excluding this verification section)
3. Compare with the hash value above to verify report integrity

This hash ensures the audit report has not been modified since generation.
Generated by Striae`;
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
}

// Export singleton instance
export const auditExportService = AuditExportService.getInstance();