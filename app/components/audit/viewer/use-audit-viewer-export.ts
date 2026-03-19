import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { auditExportService } from '~/services/audit';
import type { AuditTrail, ValidationAuditEntry } from '~/types';

interface UseAuditViewerExportParams {
  user: User | null;
  effectiveCaseNumber?: string;
  filteredEntries: ValidationAuditEntry[];
  auditTrail: AuditTrail | null;
  setError: Dispatch<SetStateAction<string>>;
}

export const useAuditViewerExport = ({
  user,
  effectiveCaseNumber,
  filteredEntries,
  auditTrail,
  setError
}: UseAuditViewerExportParams) => {
  const resolveExportContext = useCallback(() => {
    if (!user) {
      return null;
    }

    const identifier = effectiveCaseNumber || user.uid;
    const scopeType: 'case' | 'user' = effectiveCaseNumber ? 'case' : 'user';

    return {
      identifier,
      scopeType,
      context: {
        user,
        scopeType,
        scopeIdentifier: identifier,
        caseNumber: effectiveCaseNumber || undefined
      } as const
    };
  }, [user, effectiveCaseNumber]);

  const handleExportCSV = useCallback(async () => {
    const exportContextData = resolveExportContext();
    if (!exportContextData) {
      return;
    }

    const filename = auditExportService.generateFilename(
      exportContextData.scopeType,
      exportContextData.identifier,
      'csv'
    );

    try {
      if (auditTrail && effectiveCaseNumber) {
        await auditExportService.exportAuditTrailToCSV(auditTrail, filename, exportContextData.context);
      } else {
        await auditExportService.exportToCSV(filteredEntries, filename, exportContextData.context);
      }
    } catch (exportError) {
      console.error('Export failed:', exportError);
      setError('Failed to export audit trail to CSV');
    }
  }, [resolveExportContext, auditTrail, effectiveCaseNumber, filteredEntries, setError]);

  const handleExportJSON = useCallback(async () => {
    const exportContextData = resolveExportContext();
    if (!exportContextData) {
      return;
    }

    const filename = auditExportService.generateFilename(
      exportContextData.scopeType,
      exportContextData.identifier,
      'csv'
    );

    try {
      if (auditTrail && effectiveCaseNumber) {
        await auditExportService.exportAuditTrailToJSON(auditTrail, filename, exportContextData.context);
      } else {
        await auditExportService.exportToJSON(filteredEntries, filename, exportContextData.context);
      }
    } catch (exportError) {
      console.error('Export failed:', exportError);
      setError('Failed to export audit trail to JSON');
    }
  }, [resolveExportContext, auditTrail, effectiveCaseNumber, filteredEntries, setError]);

  const handleGenerateReport = useCallback(async () => {
    const exportContextData = resolveExportContext();
    if (!exportContextData) {
      return;
    }

    const resolvedUser = exportContextData.context.user;

    const filename = `${exportContextData.scopeType}-audit-report-${exportContextData.identifier}-${new Date().toISOString().split('T')[0]}.txt`;

    try {
      let reportContent: string;

      if (auditTrail && effectiveCaseNumber) {
        reportContent = await auditExportService.generateReportSummary(auditTrail, exportContextData.context);
      } else {
        const totalEntries = filteredEntries.length;
        const successfulActions = filteredEntries.filter(entry => entry.result === 'success').length;
        const failedActions = filteredEntries.filter(entry => entry.result === 'failure').length;

        const actionCounts = filteredEntries.reduce((accumulator, entry) => {
          accumulator[entry.action] = (accumulator[entry.action] || 0) + 1;
          return accumulator;
        }, {} as Record<string, number>);

        const detectedDateRange = filteredEntries.length > 0
          ? {
              earliest: new Date(Math.min(...filteredEntries.map(entry => new Date(entry.timestamp).getTime()))),
              latest: new Date(Math.max(...filteredEntries.map(entry => new Date(entry.timestamp).getTime())))
            }
          : null;

        reportContent = `${effectiveCaseNumber ? 'CASE' : 'USER'} AUDIT REPORT
Generated: ${new Date().toISOString()}
      ${effectiveCaseNumber ? `Case: ${effectiveCaseNumber}` : `User: ${resolvedUser.email}`}
      ${effectiveCaseNumber ? '' : `User ID: ${resolvedUser.uid}`}

=== SUMMARY ===
Total Actions: ${totalEntries}
Successful: ${successfulActions}
Failed: ${failedActions}
Success Rate: ${totalEntries > 0 ? ((successfulActions / totalEntries) * 100).toFixed(1) : 0}%

${detectedDateRange ? `Date Range: ${detectedDateRange.earliest.toLocaleDateString()} - ${detectedDateRange.latest.toLocaleDateString()}` : 'No entries found'}

=== ACTION BREAKDOWN ===
${Object.entries(actionCounts)
  .sort(([, actionCountA], [, actionCountB]) => actionCountB - actionCountA)
  .map(([action, count]) => `${action}: ${count}`)
  .join('\n')}

=== RECENT ACTIVITIES ===
${filteredEntries.slice(0, 10).map(entry =>
  `${new Date(entry.timestamp).toLocaleString()} | ${entry.action} | ${entry.result}${entry.details.caseNumber ? ` | Case: ${entry.details.caseNumber}` : ''}`
).join('\n')}

Generated by Striae
`;

        reportContent = await auditExportService.appendSignedReportIntegrity(
          reportContent,
          exportContextData.context,
          totalEntries
        );
      }

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (reportError) {
      console.error('Report generation failed:', reportError);
      setError('Failed to generate audit report');
    }
  }, [resolveExportContext, auditTrail, effectiveCaseNumber, filteredEntries, setError]);

  return {
    handleExportCSV,
    handleExportJSON,
    handleGenerateReport
  };
};