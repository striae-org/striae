import type { User } from 'firebase/auth';
import { type AnnotationData, type CaseExportData, type ExportOptions } from '~/types';
import { getCaseData } from '~/utils/data';
import { fetchFiles } from '../image-manage';
import { fetchOtherFiles } from '../other-files-manage';
import { getNotes } from '../notes-manage';
import { validateCaseNumber } from '../case-manage';
import { getUserExportMetadata } from './metadata-helpers';

/**
 * Export case data with files and annotations
 */
export async function exportCaseData(
  user: User,
  caseNumber: string,
  options: ExportOptions = {},
  onProgress?: (current: number, total: number, label: string) => void
): Promise<CaseExportData> {
  // NOTE: startTime and fileName tracking moved to download handlers
  
  const {
    includeMetadata = true
  } = options;

  // Get user export metadata
  const userMetadata = await getUserExportMetadata(user);

  // Validate case number format
  if (!validateCaseNumber(caseNumber)) {
    throw new Error('Invalid case number format');
  }

  // Check if case exists and is accessible (supports regular and read-only/archived cases)
  const caseData = await getCaseData(user, caseNumber);
  if (!caseData) {
    throw new Error(`Case "${caseNumber}" does not exist`);
  }

  try {
    // NOTE: Audit workflow management moved to download handlers
    
    // Fetch all files for the case
    const files = await fetchFiles(user, caseNumber);
    const otherFiles = await fetchOtherFiles(user, caseNumber, { skipValidation: true });
    const totalAssociatedFiles = (files?.length || 0) + (otherFiles?.length || 0);

    if (totalAssociatedFiles === 0) {
      throw new Error(`No associated files found for case: ${caseNumber}`);
    }

    // Collect file data with annotations
    const filesWithAnnotations: CaseExportData['files'] = [];
    let filesWithAnnotationsCount = 0;
    let totalBoxAnnotations = 0;
    let filesWithConfirmationsCount = 0;
    let filesWithConfirmationsRequestedCount = 0;
    let lastModified: string | undefined;
    let earliestAnnotationDate: string | undefined;
    let latestAnnotationDate: string | undefined;

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      let annotations: AnnotationData | undefined;
      let hasAnnotations = false;

      try {
        annotations = await getNotes(user, caseNumber, file.id) || undefined;
        
        // Check if file has any annotation data beyond just defaults.
        // Includes left/right split fields and legacy single-value fields as fallbacks.
        hasAnnotations = !!(annotations && (
          annotations.additionalNotes ||
          annotations.leftAdditionalNotes ||
          annotations.rightAdditionalNotes ||
          annotations.classNote ||
          annotations.leftClassNote ||
          annotations.rightClassNote ||
          annotations.customClass ||
          annotations.leftCustomClass ||
          annotations.rightCustomClass ||
          annotations.leftCase ||
          annotations.rightCase ||
          annotations.leftItem ||
          annotations.rightItem ||
          annotations.leftMagnification ||
          annotations.rightMagnification ||
          annotations.leftItemType ||
          annotations.rightItemType ||
          annotations.supportLevel ||
          annotations.itemType ||
          (annotations.boxAnnotations && annotations.boxAnnotations.length > 0)
        ));

        if (hasAnnotations) {
          filesWithAnnotationsCount++;
          if (annotations?.boxAnnotations) {
            totalBoxAnnotations += annotations.boxAnnotations.length;
          }
          
          // Track confirmation data
          if (annotations?.confirmationData) {
            filesWithConfirmationsCount++;
          }
        }
        
        // Track confirmation requests separately (regardless of other annotations)
        if (annotations?.includeConfirmation) {
          filesWithConfirmationsRequestedCount++;
        }
          
        // Track last modified (only for files with annotations)
        if (hasAnnotations && annotations?.updatedAt) {
          if (!lastModified || annotations.updatedAt > lastModified) {
            lastModified = annotations.updatedAt;
          }
          
          // Track annotation date range using earliest timestamp for first annotation
          const annotationDateToCheck = annotations.earliestAnnotationTimestamp || annotations.updatedAt;
          if (!earliestAnnotationDate || annotationDateToCheck < earliestAnnotationDate) {
            earliestAnnotationDate = annotationDateToCheck;
          }
          if (!latestAnnotationDate || annotations.updatedAt > latestAnnotationDate) {
            latestAnnotationDate = annotations.updatedAt;
          }
        }
      } catch {
        // Continue without annotations for this file
      }

      filesWithAnnotations.push({
        fileData: file,
        annotations,
        hasAnnotations
      });
      onProgress?.(fileIndex + 1, files.length, `Loading file ${fileIndex + 1} of ${files.length}`);
    }

    // Build export data
    const exportData: CaseExportData = {
      metadata: {
        caseNumber,
        caseCreatedDate: caseData.createdAt,
        archived: caseData.archived,
        archivedAt: caseData.archivedAt,
        archivedBy: caseData.archivedBy,
        archivedByDisplay: caseData.archivedByDisplay,
        archiveReason: caseData.archiveReason,
        exportDate: new Date().toISOString(),
        ...userMetadata,
        ...(options.designatedReviewerEmail?.trim()
          ? { designatedReviewerEmail: options.designatedReviewerEmail.trim() }
          : {}),
        striaeExportSchemaVersion: '1.0',
        totalFiles: totalAssociatedFiles
      },
      files: filesWithAnnotations,
      otherFiles: (otherFiles || []).map((otherFile) => ({ fileData: otherFile })),
      ...(includeMetadata && {
        summary: {
          filesWithAnnotations: filesWithAnnotationsCount,
          filesWithoutAnnotations: files.length - filesWithAnnotationsCount,
          totalBoxAnnotations,
          filesWithConfirmations: filesWithConfirmationsCount,
          filesWithConfirmationsRequested: filesWithConfirmationsRequestedCount,
          lastModified,
          earliestAnnotationDate,
          latestAnnotationDate
        }
      })
    };

    // NOTE: Audit logging moved to download handlers where actual filename and format are known

    return exportData;

  } catch (error) {
    console.error('Case export failed:', error);
    
    // NOTE: Audit logging for failures moved to download handlers
    
    throw error;
  }
}