import type { User } from 'firebase/auth';
import { auditService } from '~/services/audit';
import type { ValidationAuditEntry } from '~/types';
import { getCaseData } from '~/utils/data';
import { canAccessCase } from '~/utils/data/permissions';
import { fetchPdfApi } from '~/utils/api';
import type { ToastType } from '~/components/toast/toast';
import { fetchAllCaseEntriesForExport } from './audit-export-shared';

interface ExportAuditPdfParams {
  user: User;
  caseNumber: string;
  userCompany?: string;
  userFirstName?: string;
  userLastName?: string;
  userBadgeId?: string;
  setIsExportingPDF: (isExporting: boolean) => void;
  setToastType: (type: ToastType) => void;
  setToastMessage: (message: string) => void;
  setShowToast: (show: boolean) => void;
  setToastDuration?: (duration: number) => void;
}

interface AuditTrailPdfPayload {
  reportMode: 'audit-trail';
  caseNumber: string;
  exportedAt: string;
  exportRangeStart: string;
  exportRangeEnd: string;
  chunkIndex: number;
  totalChunks: number;
  totalEntries: number;
  includeRawJsonAppendix: boolean;
  entries: ValidationAuditEntry[];
}

const MAX_AUDIT_ENTRIES_PER_PDF = 200;

const formatShortDate = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${month}/${day}/${year}`;
};

const formatDateStamp = (date: Date): string => {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const chunkEntries = (entries: ValidationAuditEntry[]): ValidationAuditEntry[][] => {
  if (entries.length === 0) {
    return [];
  }

  const chunks: ValidationAuditEntry[][] = [];
  for (let offset = 0; offset < entries.length; offset += MAX_AUDIT_ENTRIES_PER_PDF) {
    chunks.push(entries.slice(offset, offset + MAX_AUDIT_ENTRIES_PER_PDF));
  }

  return chunks;
};

const downloadPdfBlob = (blob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
};

const normalizeIsoDate = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const extractErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const json = await response.json() as { error?: string; details?: string };
      if (json.error) {
        return json.details ? `${json.error}: ${json.details}` : json.error;
      }
    } catch {
      // fall through to text fallback
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `HTTP ${response.status} ${response.statusText}`;
  } catch {
    return `HTTP ${response.status} ${response.statusText}`;
  }
};

const buildPartFilename = (
  caseNumber: string,
  exportDate: Date,
  partIndex: number,
  totalParts: number
): string => {
  const sanitizedCaseNumber = caseNumber.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  const dateStamp = formatDateStamp(exportDate);

  if (totalParts <= 1) {
    return `audit-trail-${sanitizedCaseNumber}-${dateStamp}.pdf`;
  }

  return `audit-trail-${sanitizedCaseNumber}-${dateStamp}-part-${partIndex}-of-${totalParts}.pdf`;
};

const buildAuditTrailPayload = (
  caseNumber: string,
  entries: ValidationAuditEntry[],
  exportRangeStart: string,
  exportRangeEnd: string,
  chunkIndex: number,
  totalChunks: number,
  totalEntries: number,
  exportedAt: string
): AuditTrailPdfPayload => {
  return {
    reportMode: 'audit-trail',
    caseNumber,
    exportedAt,
    exportRangeStart,
    exportRangeEnd,
    chunkIndex,
    totalChunks,
    totalEntries,
    includeRawJsonAppendix: true,
    entries
  };
};

export const exportAuditPDF = async ({
  user,
  caseNumber,
  userCompany,
  userFirstName,
  userLastName,
  userBadgeId,
  setIsExportingPDF,
  setToastType,
  setToastMessage,
  setShowToast,
  setToastDuration
}: ExportAuditPdfParams): Promise<void> => {
  setIsExportingPDF(true);
  setToastType('loading');
  setToastMessage('Preparing full case audit trail PDF export...');
  if (setToastDuration) {
    setToastDuration(0);
  }
  setShowToast(true);

  const exportStartTime = Date.now();

  try {
    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || 'You do not have access to export this case audit trail.');
    }

    const caseData = await getCaseData(user, caseNumber);
    const now = new Date();
    const nowIso = now.toISOString();
    const caseCreatedAtIso = normalizeIsoDate(caseData?.createdAt) || '1970-01-01T00:00:00.000Z';
    const isBundledArchivedCase = Boolean(
      caseData?.isReadOnly === true &&
      caseData?.archived === true &&
      caseData?.bundledAuditTrail?.source === 'archive-bundle'
    );

    const allEntries = isBundledArchivedCase
      ? await auditService.getAuditEntriesForUser(user.uid, {
          requestingUser: user,
          caseNumber
        })
      : await fetchAllCaseEntriesForExport(user, caseNumber, caseCreatedAtIso, nowIso);

    if (allEntries.length === 0) {
      setToastType('warning');
      setToastMessage(`No audit entries were found for case ${caseNumber}.`);
      if (setToastDuration) {
        setToastDuration(5000);
      }
      setShowToast(true);
      return;
    }

    const sortedEntries = [...allEntries].sort(
      (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    );
    const exportRangeStartIso = isBundledArchivedCase
      ? normalizeIsoDate(sortedEntries[0]?.timestamp) || caseCreatedAtIso
      : caseCreatedAtIso;
    const exportRangeEndIso = normalizeIsoDate(sortedEntries[sortedEntries.length - 1]?.timestamp) || nowIso;

    const chunks = chunkEntries(sortedEntries);
    const totalChunks = chunks.length;
    const exportedAtIso = nowIso;
    const currentDate = formatShortDate(now);

    let successfulParts = 0;
    const failedParts: number[] = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const partNumber = chunkIndex + 1;
      const chunkEntriesForPart = chunks[chunkIndex];
      const filename = buildPartFilename(caseNumber, now, partNumber, totalChunks);
      const partStartTime = Date.now();

      const pdfData = {
        reportMode: 'audit-trail' as const,
        currentDate,
        caseNumber,
        userCompany,
        userFirstName,
        userLastName,
        userBadgeId,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        auditTrailReport: buildAuditTrailPayload(
          caseNumber,
          chunkEntriesForPart,
          exportRangeStartIso,
          exportRangeEndIso,
          partNumber,
          totalChunks,
          sortedEntries.length,
          exportedAtIso
        )
      };

      setToastType('loading');
      setToastMessage(`Generating audit PDF part ${partNumber} of ${totalChunks}...`);
      setShowToast(true);

      try {
        const response = await fetchPdfApi(user, '/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: pdfData })
        });

        if (!response.ok) {
          const errorMessage = await extractErrorMessage(response);
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        downloadPdfBlob(blob, filename);
        successfulParts += 1;

        try {
          await auditService.logPDFGeneration(
            user,
            filename,
            caseNumber,
            'success',
            Date.now() - partStartTime,
            blob.size,
            [],
            `audit-trail:${caseNumber}:part-${partNumber}`,
            `audit-trail-${caseNumber}`
          );
        } catch (auditError) {
          console.error('Failed to log audit PDF generation success:', auditError);
        }
      } catch (error) {
        failedParts.push(partNumber);

        try {
          await auditService.logPDFGeneration(
            user,
            filename,
            caseNumber,
            'failure',
            Date.now() - partStartTime,
            0,
            [error instanceof Error ? error.message : 'Unknown PDF generation error'],
            `audit-trail:${caseNumber}:part-${partNumber}`,
            `audit-trail-${caseNumber}`
          );
        } catch (auditError) {
          console.error('Failed to log audit PDF generation failure:', auditError);
        }
      }
    }

    if (failedParts.length === 0) {
      setToastType('success');
      setToastMessage(
        successfulParts > 1
          ? `Exported ${successfulParts} audit PDF parts for case ${caseNumber}.`
          : `Exported audit PDF for case ${caseNumber}.`
      );
      if (setToastDuration) {
        setToastDuration(6000);
      }
      setShowToast(true);
      return;
    }

    const failedPartLabel = failedParts.join(', ');
    setToastType('warning');
    setToastMessage(
      successfulParts > 0
        ? `Export completed with issues. Successful parts: ${successfulParts}/${totalChunks}. Failed parts: ${failedPartLabel}.`
        : `Audit PDF export failed. Failed parts: ${failedPartLabel}.`
    );
    if (setToastDuration) {
      setToastDuration(9000);
    }
    setShowToast(true);
  } catch (error) {
    const processingTime = Date.now() - exportStartTime;

    try {
      await auditService.logPDFGeneration(
        user,
        `audit-trail-${caseNumber}-failed-${Date.now()}.pdf`,
        caseNumber,
        'failure',
        processingTime,
        0,
        [error instanceof Error ? error.message : 'Unknown audit PDF export error'],
        `audit-trail:${caseNumber}`,
        `audit-trail-${caseNumber}`
      );
    } catch (auditError) {
      console.error('Failed to log audit PDF export error:', auditError);
    }

    setToastType('error');
    setToastMessage(error instanceof Error ? error.message : 'Failed to export case audit trail PDF.');
    if (setToastDuration) {
      setToastDuration(7000);
    }
    setShowToast(true);
  } finally {
    setIsExportingPDF(false);
  }
};
