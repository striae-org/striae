import { User } from 'firebase/auth';
import { FileData, AnnotationData, CaseExportData } from '~/types';
import { fetchFiles } from './image-manage';
import { getNotes } from './notes-manage';

export interface ExportOptions {
  includeAnnotations?: boolean;
  format?: 'json' | 'csv';
  includeMetadata?: boolean;
}

/**
 * Export case data with files and annotations
 */
export async function exportCaseData(
  user: User,
  caseNumber: string,
  options: ExportOptions = {}
): Promise<CaseExportData> {
  const {
    includeAnnotations = true,
    includeMetadata = true
  } = options;

  try {
    // Fetch all files for the case
    const files = await fetchFiles(user, caseNumber);
    
    if (!files || files.length === 0) {
      throw new Error(`No files found for case: ${caseNumber}`);
    }

    // Collect file data with annotations
    const filesWithAnnotations: CaseExportData['files'] = [];
    let filesWithAnnotationsCount = 0;
    let totalBoxAnnotations = 0;
    let lastModified: string | undefined;

    for (const file of files) {
      let annotations: AnnotationData | undefined;
      let hasAnnotations = false;

      if (includeAnnotations) {
        try {
          annotations = await getNotes(user, caseNumber, file.id) || undefined;
          hasAnnotations = !!(annotations && (
            annotations.additionalNotes ||
            annotations.classNote ||
            annotations.customClass ||
            (annotations.boxAnnotations && annotations.boxAnnotations.length > 0)
          ));

          if (hasAnnotations) {
            filesWithAnnotationsCount++;
            if (annotations?.boxAnnotations) {
              totalBoxAnnotations += annotations.boxAnnotations.length;
            }
            
            // Track last modified
            if (annotations?.updatedAt) {
              if (!lastModified || annotations.updatedAt > lastModified) {
                lastModified = annotations.updatedAt;
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to load annotations for file ${file.id}:`, error);
          // Continue without annotations for this file
        }
      }

      filesWithAnnotations.push({
        fileData: file,
        annotations: includeAnnotations ? annotations : undefined,
        hasAnnotations
      });
    }

    // Build export data
    const exportData: CaseExportData = {
      metadata: {
        caseNumber,
        exportDate: new Date().toISOString(),
        exportedBy: user.email,
        exportVersion: '1.0',
        totalFiles: files.length
      },
      files: filesWithAnnotations,
      ...(includeMetadata && {
        summary: {
          filesWithAnnotations: filesWithAnnotationsCount,
          filesWithoutAnnotations: files.length - filesWithAnnotationsCount,
          totalBoxAnnotations,
          lastModified
        }
      })
    };

    return exportData;

  } catch (error) {
    console.error('Case export failed:', error);
    throw new Error(`Failed to export case ${caseNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download case data as JSON file
 */
export function downloadCaseAsJSON(exportData: CaseExportData): void {
  try {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `striae-case-${exportData.metadata.caseNumber}-export-${formatDateForFilename(new Date())}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('Case export download initiated:', exportFileName);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download export file');
  }
}

/**
 * Download case data as CSV file (simplified format)
 */
export function downloadCaseAsCSV(exportData: CaseExportData): void {
  try {
    const csvHeaders = [
      'File ID',
      'Original Filename',
      'Upload Date',
      'Has Annotations',
      'Class Type',
      'Support Level',
      'Box Annotations Count',
      'Additional Notes'
    ];

    const csvRows = exportData.files.map(fileEntry => [
      fileEntry.fileData.id,
      fileEntry.fileData.originalFilename,
      fileEntry.fileData.uploadedAt,
      fileEntry.hasAnnotations ? 'Yes' : 'No',
      fileEntry.annotations?.classType || '',
      fileEntry.annotations?.supportLevel || '',
      fileEntry.annotations?.boxAnnotations?.length || 0,
      fileEntry.annotations?.additionalNotes ? 'Yes' : 'No'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileName = `striae-case-${exportData.metadata.caseNumber}-summary-${formatDateForFilename(new Date())}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('CSV export download initiated:', exportFileName);
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error('Failed to export CSV file');
  }
}

/**
 * Helper function to format date for filename
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Validate case number format
 */
export function validateCaseNumberForExport(caseNumber: string): { isValid: boolean; error?: string } {
  if (!caseNumber || !caseNumber.trim()) {
    return { isValid: false, error: 'Case number is required' };
  }

  const trimmed = caseNumber.trim();
  
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Case number cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Case number is too long (max 100 characters)' };
  }

  // Check for invalid characters that could cause file system issues
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Case number contains invalid characters' };
  }

  return { isValid: true };
}