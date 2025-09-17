import { User } from 'firebase/auth';
import { FileData, AnnotationData, CaseExportData } from '~/types';
import { fetchFiles } from './image-manage';
import { getNotes } from './notes-manage';
import { checkExistingCase, validateCaseNumber, listCases } from './case-manage';

export interface ExportOptions {
  includeAnnotations?: boolean;
  format?: 'json' | 'csv';
  includeMetadata?: boolean;
}

export interface AllCasesExportData {
  metadata: {
    exportDate: string;
    exportedBy: string | null;
    exportVersion: string;
    totalCases: number;
    totalFiles: number;
    totalAnnotations: number;
  };
  cases: CaseExportData[];
  summary?: {
    casesWithFiles: number;
    casesWithAnnotations: number;
    casesWithoutFiles: number;
    lastModified?: string;
  };
}

/**
 * Export all cases for a user
 */
export async function exportAllCases(
  user: User,
  options: ExportOptions = {},
  onProgress?: (current: number, total: number, caseName: string) => void
): Promise<AllCasesExportData> {
  const {
    includeAnnotations = true,
    includeMetadata = true
  } = options;

  console.log('Starting export of all cases...');

  try {
    // Get list of all cases for the user
    const caseNumbers = await listCases(user);
    
    if (!caseNumbers || caseNumbers.length === 0) {
      throw new Error('No cases found for user');
    }

    console.log(`Found ${caseNumbers.length} cases to export`);

    const exportedCases: CaseExportData[] = [];
    let totalFiles = 0;
    let totalAnnotations = 0;
    let casesWithFiles = 0;
    let casesWithAnnotations = 0;
    let casesWithoutFiles = 0;
    let lastModified: string | undefined;

    // Export each case
    for (let i = 0; i < caseNumbers.length; i++) {
      const caseNumber = caseNumbers[i];
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, caseNumbers.length, caseNumber);
      }

      try {
        console.log(`Exporting case ${i + 1}/${caseNumbers.length}: ${caseNumber}`);
        
        const caseExport = await exportCaseData(user, caseNumber, options);
        exportedCases.push(caseExport);

        // Update totals
        totalFiles += caseExport.metadata.totalFiles;
        
        if (caseExport.metadata.totalFiles > 0) {
          casesWithFiles++;
        } else {
          casesWithoutFiles++;
        }

        // Count annotations
        const caseAnnotations = caseExport.files.filter(f => f.hasAnnotations).length;
        if (caseAnnotations > 0) {
          casesWithAnnotations++;
          totalAnnotations += caseAnnotations;
        }

        // Track latest modification
        if (caseExport.summary?.lastModified) {
          if (!lastModified || caseExport.summary.lastModified > lastModified) {
            lastModified = caseExport.summary.lastModified;
          }
        }

      } catch (error) {
        console.warn(`Failed to export case ${caseNumber}:`, error);
        // Create a placeholder entry for failed exports
        exportedCases.push({
          metadata: {
            caseNumber,
            exportDate: new Date().toISOString(),
            exportedBy: user.email,
            exportVersion: '1.0',
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
        exportedBy: user.email,
        exportVersion: '1.0',
        totalCases: caseNumbers.length,
        totalFiles,
        totalAnnotations
      },
      cases: exportedCases
    };

    if (includeMetadata) {
      allCasesExport.summary = {
        casesWithFiles,
        casesWithAnnotations,
        casesWithoutFiles,
        lastModified
      };
    }

    console.log(`All cases export completed. ${exportedCases.length} cases processed.`);
    
    // Report completion
    if (onProgress) {
      onProgress(caseNumbers.length, caseNumbers.length, 'Export completed!');
    }
    
    return allCasesExport;

  } catch (error) {
    console.error('Export all cases failed:', error);
    throw new Error(`Failed to export all cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

  // Validate case number format
  if (!validateCaseNumber(caseNumber)) {
    throw new Error('Invalid case number format');
  }

  // Check if case exists
  console.log(`Checking if case "${caseNumber}" exists...`);
  const existingCase = await checkExistingCase(user, caseNumber);
  if (!existingCase) {
    throw new Error(`Case "${caseNumber}" does not exist`);
  }
  console.log(`Case "${caseNumber}" found, proceeding with export...`);

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
 * Download all cases data as JSON file
 */
export function downloadAllCasesAsJSON(exportData: AllCasesExportData): void {
  try {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `striae-all-cases-export-${formatDateForFilename(new Date())}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('All cases export download initiated:', exportFileName);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download all cases export file');
  }
}

/**
 * Download all cases data as CSV file (summary format)
 */
export function downloadAllCasesAsCSV(exportData: AllCasesExportData): void {
  try {
    const csvHeaders = [
      'Case Number',
      'Export Status',
      'Total Files',
      'Files with Annotations',
      'Files without Annotations',
      'Total Box Annotations',
      'Last Modified',
      'Export Error'
    ];

    const csvRows = exportData.cases.map(caseData => [
      caseData.metadata.caseNumber,
      caseData.summary?.exportError ? 'Failed' : 'Success',
      caseData.metadata.totalFiles,
      caseData.summary?.filesWithAnnotations || 0,
      caseData.summary?.filesWithoutAnnotations || 0,
      caseData.summary?.totalBoxAnnotations || 0,
      caseData.summary?.lastModified || '',
      caseData.summary?.exportError || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileName = `striae-all-cases-summary-${formatDateForFilename(new Date())}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('All cases CSV export download initiated:', exportFileName);
  } catch (error) {
    console.error('All cases CSV export failed:', error);
    throw new Error('Failed to export all cases CSV file');
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
 * Validate case number format for export (includes file system checks)
 */
export function validateCaseNumberForExport(caseNumber: string): { isValid: boolean; error?: string } {
  if (!caseNumber || !caseNumber.trim()) {
    return { isValid: false, error: 'Case number is required' };
  }

  const trimmed = caseNumber.trim();
  
  // Use the main validation function first
  if (!validateCaseNumber(trimmed)) {
    return { isValid: false, error: 'Invalid case number format (only letters, numbers, and hyphens allowed, max 25 characters)' };
  }

  // Additional file system validation for export
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Case number contains invalid characters for file export' };
  }

  return { isValid: true };
}