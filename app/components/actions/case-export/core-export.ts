import type { User } from 'firebase/auth';
import { type AnnotationData, type CaseExportData, type AllCasesExportData, type ExportOptions } from '~/types';
import { getCaseData } from '~/utils/data';
import { fetchFiles } from '../image-manage';
import { getNotes } from '../notes-manage';
import { validateCaseNumber, listCases } from '../case-manage';
import { getUserExportMetadata } from './metadata-helpers';

/**
 * Export all cases for a user
 */
export async function exportAllCases(
  user: User,
  options: ExportOptions = {},
  onProgress?: (current: number, total: number, caseName: string) => void
): Promise<AllCasesExportData> {
  // NOTE: startTime tracking moved to download handlers
  
  try {
    // NOTE: Audit workflow management moved to download handlers
    
    const {
      includeMetadata = true
    } = options;

    // Get user export metadata
    const userMetadata = await getUserExportMetadata(user);
    
    // Get list of all cases for the user
    const caseNumbers = await listCases(user);
    
    if (!caseNumbers || caseNumbers.length === 0) {
      throw new Error('No cases found for user');
    }

    const exportedCases: CaseExportData[] = [];
    let totalFiles = 0;
    let totalAnnotations = 0;
    let totalConfirmations = 0;
    let totalConfirmationsRequested = 0;
    let casesWithFiles = 0;
    let casesWithAnnotations = 0;
    let casesWithoutFiles = 0;
    let lastModified: string | undefined;
    let earliestAnnotationDate: string | undefined;
    let latestAnnotationDate: string | undefined;

    // Export each case
    for (let i = 0; i < caseNumbers.length; i++) {
      const caseNumber = caseNumbers[i];
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, caseNumbers.length, caseNumber);
      }

      try {
        const caseExport = await exportCaseData(user, caseNumber, options);
        exportedCases.push(caseExport);

        // Update totals
        totalFiles += caseExport.metadata.totalFiles;
        
        if (caseExport.metadata.totalFiles > 0) {
          casesWithFiles++;
        } else {
          casesWithoutFiles++;
        }

        // Count annotations and confirmations
        const caseAnnotations = caseExport.files.filter(f => f.hasAnnotations).length;
        if (caseAnnotations > 0) {
          casesWithAnnotations++;
          totalAnnotations += caseAnnotations;
        }

        // Count confirmations
        if (caseExport.summary?.filesWithConfirmations) {
          totalConfirmations += caseExport.summary.filesWithConfirmations;
        }
        if (caseExport.summary?.filesWithConfirmationsRequested) {
          totalConfirmationsRequested += caseExport.summary.filesWithConfirmationsRequested;
        }

        // Track latest modification
        if (caseExport.summary?.lastModified) {
          if (!lastModified || caseExport.summary.lastModified > lastModified) {
            lastModified = caseExport.summary.lastModified;
          }
        }

        // Track annotation date range across all cases
        if (caseExport.summary?.earliestAnnotationDate) {
          if (!earliestAnnotationDate || caseExport.summary.earliestAnnotationDate < earliestAnnotationDate) {
            earliestAnnotationDate = caseExport.summary.earliestAnnotationDate;
          }
        }
        if (caseExport.summary?.latestAnnotationDate) {
          if (!latestAnnotationDate || caseExport.summary.latestAnnotationDate > latestAnnotationDate) {
            latestAnnotationDate = caseExport.summary.latestAnnotationDate;
          }
        }

      } catch (error) {
        // Get case creation date even for failed exports
        let caseCreatedDate = new Date().toISOString(); // fallback
        try {
          const caseData = await getCaseData(user, caseNumber);
          if (caseData?.createdAt) {
            caseCreatedDate = caseData.createdAt;
          }
        } catch {
          // Use fallback date if case lookup fails
        }

        // Create a placeholder entry for failed exports
        exportedCases.push({
          metadata: {
            caseNumber,
            caseCreatedDate,
            exportDate: new Date().toISOString(),
            ...userMetadata,
            striaeExportSchemaVersion: '1.0',
            totalFiles: 0
          },
          files: [],
          summary: {
            filesWithAnnotations: 0,
            filesWithoutAnnotations: 0,
            totalBoxAnnotations: 0,
            exportError: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        casesWithoutFiles++;
      }
    }

    const allCasesExport: AllCasesExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        ...userMetadata,
        striaeExportSchemaVersion: '1.0',
        totalCases: caseNumbers.length,
        totalFiles,
        totalAnnotations,
        totalConfirmations,
        totalConfirmationsRequested
      },
      cases: exportedCases
    };

    if (includeMetadata) {
      allCasesExport.summary = {
        casesWithFiles,
        casesWithAnnotations,
        casesWithoutFiles,
        lastModified,
        earliestAnnotationDate,
        latestAnnotationDate
      };
    }

    // Report completion
    if (onProgress) {
      onProgress(caseNumbers.length, caseNumbers.length, 'Export completed!');
    }
    
    // NOTE: Audit logging moved to download handlers where actual filename and format are known
    
    return allCasesExport;

  } catch (error) {
    console.error('Export all cases failed:', error);
    
    // NOTE: Audit logging for failures moved to download handlers
    
    throw error;
  }
}

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
    
    if (!files || files.length === 0) {
      throw new Error(`No files found for case: ${caseNumber}`);
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
        
        // Check if file has any annotation data beyond just defaults
        hasAnnotations = !!(annotations && (
          annotations.additionalNotes ||
          annotations.classNote ||
          annotations.customClass ||
          annotations.leftCase ||
          annotations.rightCase ||
          annotations.leftItem ||
          annotations.rightItem ||
          annotations.supportLevel ||
          annotations.classType ||
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
        exportDate: new Date().toISOString(),
        ...userMetadata,
        striaeExportSchemaVersion: '1.0',
        totalFiles: files.length
      },
      files: filesWithAnnotations,
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