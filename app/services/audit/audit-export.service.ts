import { type ValidationAuditEntry, type AuditTrail } from '~/types';
import { calculateSHA256Secure } from '~/utils/SHA256';
import { type AuditExportType } from '~/utils/audit-export-signature';
import { AUDIT_CSV_ENTRY_HEADERS, entryToCSVRow } from './audit-export-csv';
import { buildAuditReportContent } from './audit-export-report';
import { type AuditExportContext, signAuditExport } from './audit-export-signing';

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
    const csvData = [
      AUDIT_CSV_ENTRY_HEADERS.join(','),
      ...entries.map(entry => entryToCSVRow(entry))
    ].join('\n');

    const generatedAt = new Date().toISOString();
    const hash = await calculateSHA256Secure(csvData);
    const signaturePayload = await signAuditExport(
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

    const csvData = [
      summaryHeaders.join(','),
      summaryRow,
      '',
      AUDIT_CSV_ENTRY_HEADERS.join(','),
      ...auditTrail.entries.map(entry => entryToCSVRow(entry))
    ].join('\n');

    const generatedAt = new Date().toISOString();
    const hash = await calculateSHA256Secure(csvData);
    const signaturePayload = await signAuditExport(
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
    const signaturePayload = await signAuditExport(
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
    const signaturePayload = await signAuditExport(
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
    const generatedAt = new Date().toISOString();

    const reportContent = buildAuditReportContent(auditTrail, generatedAt);

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
    const signaturePayload = await signAuditExport(
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
}

// Export singleton instance
export const auditExportService = AuditExportService.getInstance();