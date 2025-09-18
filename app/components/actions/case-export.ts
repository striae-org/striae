import { User } from 'firebase/auth';
import { FileData, AnnotationData, CaseExportData, AllCasesExportData } from '~/types';
import { fetchFiles, getImageUrl } from './image-manage';
import { getNotes } from './notes-manage';
import { checkExistingCase, validateCaseNumber, listCases } from './case-manage';
import * as XLSX from 'xlsx';

export type ExportFormat = 'json' | 'csv';

// Constants for export data structure
const FILE_DATA_COLUMN_COUNT = 19; // Number of columns in the main file data before box annotations
const ADDITIONAL_DATA_COLUMN_COUNT = 2; // Number of additional columns (Additional Notes, Last Updated)

export interface ExportOptions {
  includeAnnotations?: boolean;
  format?: 'json' | 'csv';
  includeMetadata?: boolean;
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
        exportedBy: user.email,
        striaeExportSchemaVersion: '1.0',
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
        striaeExportSchemaVersion: '1.0',
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
 * Download all cases data as Excel file with multiple worksheets
 */
export function downloadAllCasesAsCSV(exportData: AllCasesExportData): void {
  try {
    const workbook = XLSX.utils.book_new();

    // Create summary worksheet
    const summaryData = [
      ['Striae - All Cases Export Summary'],
      [''],
      ['Export Date', new Date().toISOString()],
      ['Total Cases', exportData.cases.length],
      ['Successful Exports', exportData.cases.filter(c => !c.summary?.exportError).length],
      ['Failed Exports', exportData.cases.filter(c => c.summary?.exportError).length],
      [''],
      ['Case Number', 'Export Status', 'Total Files', 'Files with Annotations', 'Files without Annotations', 'Total Box Annotations', 'Last Modified', 'Export Error'],
      ...exportData.cases.map(caseData => [
        caseData.metadata.caseNumber,
        caseData.summary?.exportError ? 'Failed' : 'Success',
        caseData.metadata.totalFiles,
        caseData.summary?.filesWithAnnotations || 0,
        caseData.summary?.filesWithoutAnnotations || 0,
        caseData.summary?.totalBoxAnnotations || 0,
        caseData.summary?.lastModified || '',
        caseData.summary?.exportError || ''
      ])
    ];

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Create a worksheet for each case
    exportData.cases.forEach((caseData, index) => {
      if (caseData.summary?.exportError) {
        // For failed cases, create a simple error sheet
        const errorData = [
          [`Case ${caseData.metadata.caseNumber} - Export Failed`],
          [''],
          ['Error:', caseData.summary.exportError],
          ['Case Number:', caseData.metadata.caseNumber],
          ['Total Files:', caseData.metadata.totalFiles]
        ];
        const errorWorksheet = XLSX.utils.aoa_to_sheet(errorData);
        XLSX.utils.book_append_sheet(workbook, errorWorksheet, `Case_${caseData.metadata.caseNumber}_Error`);
        return;
      }

      // For successful cases, create detailed worksheets
      const caseDetailsData = [
        [`Case ${caseData.metadata.caseNumber} - Detailed Export`],
        [''],
        ['Case Information'],
        ['Case Number', caseData.metadata.caseNumber],
        ['Export Date', caseData.metadata.exportDate],
        ['Total Files', caseData.metadata.totalFiles],
        ['Files with Annotations', caseData.summary?.filesWithAnnotations || 0],
        ['Files without Annotations', caseData.summary?.filesWithoutAnnotations || 0],
        ['Total Box Annotations', caseData.summary?.totalBoxAnnotations || 0],
        ['Last Modified', caseData.summary?.lastModified || 'N/A'],
        [''],
        ['File Details'],
        [
          'File ID',
          'Original Filename', 
          'Upload Date',
          'Has Annotations',
          'Left Case',
          'Right Case',
          'Left Item',
          'Right Item',
          'Case Font Color',
          'Class Type',
          'Custom Class',
          'Class Note',
          'Index Type',
          'Index Number',
          'Index Color',
          'Support Level',
          'Has Subclass',
          'Include Confirmation',
          'Total Box Annotations',
          'Box ID',
          'Box X',
          'Box Y',
          'Box Width',
          'Box Height',
          'Box Color',
          'Box Timestamp',
          'Additional Notes',
          'Last Updated'
        ]
      ];

      // Add file data if available
      if (caseData.files && caseData.files.length > 0) {
        // File data rows - file info only on first row, subsequent rows only have box data
        const fileRows: any[][] = [];
        
        caseData.files.forEach(fileEntry => {
          // Full file data for the first row (excluding Additional Notes and Last Updated)
          const fullFileData = [
            fileEntry.fileData.id,
            fileEntry.fileData.originalFilename,
            fileEntry.fileData.uploadedAt,
            fileEntry.hasAnnotations ? 'Yes' : 'No',
            fileEntry.annotations?.leftCase || '',
            fileEntry.annotations?.rightCase || '',
            fileEntry.annotations?.leftItem || '',
            fileEntry.annotations?.rightItem || '',
            fileEntry.annotations?.caseFontColor || '',
            fileEntry.annotations?.classType || '',
            fileEntry.annotations?.customClass || '',
            fileEntry.annotations?.classNote || '',
            fileEntry.annotations?.indexType || '',
            fileEntry.annotations?.indexNumber || '',
            fileEntry.annotations?.indexColor || '',
            fileEntry.annotations?.supportLevel || '',
            fileEntry.annotations?.hasSubclass ? 'Yes' : 'No',
            fileEntry.annotations?.includeConfirmation ? 'Yes' : 'No',
            fileEntry.annotations?.boxAnnotations?.length || 0
          ];

          // Additional Notes and Last Updated (at the end)
          const additionalFileData = [
            fileEntry.annotations?.additionalNotes || '',
            fileEntry.annotations?.updatedAt || ''
          ];

          // Empty row template for subsequent box annotations (file info columns empty)
          const emptyFileData = Array(FILE_DATA_COLUMN_COUNT).fill('');
          const emptyAdditionalData = Array(ADDITIONAL_DATA_COLUMN_COUNT).fill('');

          // If there are box annotations, create a row for each one
          if (fileEntry.annotations?.boxAnnotations && fileEntry.annotations.boxAnnotations.length > 0) {
            fileEntry.annotations.boxAnnotations.forEach((box, index) => {
              const rowData = index === 0 ? fullFileData : emptyFileData;
              const additionalData = index === 0 ? additionalFileData : emptyAdditionalData;
              
              fileRows.push([
                ...rowData,
                box.id,
                box.x,
                box.y,
                box.width,
                box.height,
                box.color || '',
                box.timestamp || '',
                ...additionalData
              ]);
            });
          } else {
            // If no box annotations, still include one row with empty box data
            fileRows.push([
              ...fullFileData,
              '', // Box ID
              '', // Box X
              '', // Box Y
              '', // Box Width
              '', // Box Height
              '', // Box Color
              '', // Box Timestamp
              ...additionalFileData
            ]);
          }
        });
        
        caseDetailsData.push(...fileRows);
      } else {
        caseDetailsData.push(['No detailed file data available for this case']);
      }

      const caseWorksheet = XLSX.utils.aoa_to_sheet(caseDetailsData);
      
      // Clean sheet name for Excel compatibility
      const sheetName = `Case_${caseData.metadata.caseNumber}`.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, caseWorksheet, sheetName);
    });

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const exportFileName = `striae-all-cases-detailed-${formatDateForFilename(new Date())}.xlsx`;
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = exportFileName;
    linkElement.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    console.log('Excel export with multiple worksheets download initiated:', exportFileName);
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Failed to export Excel file');
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
 * Download case data as comprehensive CSV file
 */
export function downloadCaseAsCSV(exportData: CaseExportData): void {
  try {
    // Case metadata section
    const metadataRows = [
      ['Case Export Report'],
      [''],
      ['Case Number', exportData.metadata.caseNumber],
      ['Export Date', exportData.metadata.exportDate],
      ['Exported By', exportData.metadata.exportedBy || 'N/A'],
      ['Striae Export Schema Version', exportData.metadata.striaeExportSchemaVersion],
      ['Total Files', exportData.metadata.totalFiles],
      [''],
      ['Summary'],
      ['Files with Annotations', exportData.summary?.filesWithAnnotations || 0],
      ['Files without Annotations', exportData.summary?.filesWithoutAnnotations || 0],
      ['Total Box Annotations', exportData.summary?.totalBoxAnnotations || 0],
      ['Last Modified', exportData.summary?.lastModified || 'N/A'],
      [''],
      ['File Details']
    ];

    // File details headers (updated for individual box annotations)
    const fileHeaders = [
      'File ID',
      'Original Filename',
      'Upload Date',
      'Has Annotations',
      'Left Case',
      'Right Case',
      'Left Item',
      'Right Item',
      'Case Font Color',
      'Class Type',
      'Custom Class',
      'Class Note',
      'Index Type',
      'Index Number',
      'Index Color',
      'Support Level',
      'Has Subclass',
      'Include Confirmation',
      'Total Box Annotations',
      'Box ID',
      'Box X',
      'Box Y',
      'Box Width',
      'Box Height',
      'Box Color',
      'Box Timestamp',
      'Additional Notes',
      'Last Updated'
    ];

    // File data rows - file info only on first row, subsequent rows only have box data
    const fileRows: string[][] = [];
    
    exportData.files.forEach(fileEntry => {
      // Full file data for the first row (excluding Additional Notes and Last Updated)
      const fullFileData = [
        fileEntry.fileData.id,
        fileEntry.fileData.originalFilename,
        fileEntry.fileData.uploadedAt,
        fileEntry.hasAnnotations ? 'Yes' : 'No',
        fileEntry.annotations?.leftCase || '',
        fileEntry.annotations?.rightCase || '',
        fileEntry.annotations?.leftItem || '',
        fileEntry.annotations?.rightItem || '',
        fileEntry.annotations?.caseFontColor || '',
        fileEntry.annotations?.classType || '',
        fileEntry.annotations?.customClass || '',
        fileEntry.annotations?.classNote || '',
        fileEntry.annotations?.indexType || '',
        fileEntry.annotations?.indexNumber || '',
        fileEntry.annotations?.indexColor || '',
        fileEntry.annotations?.supportLevel || '',
        fileEntry.annotations?.hasSubclass ? 'Yes' : 'No',
        fileEntry.annotations?.includeConfirmation ? 'Yes' : 'No',
        (fileEntry.annotations?.boxAnnotations?.length || 0).toString()
      ];

      // Additional Notes and Last Updated (at the end)
      const additionalFileData = [
        fileEntry.annotations?.additionalNotes || '',
        fileEntry.annotations?.updatedAt || ''
      ];

      // Empty row template for subsequent box annotations (file info columns empty)
      const emptyFileData = Array(FILE_DATA_COLUMN_COUNT).fill('');
      const emptyAdditionalData = Array(ADDITIONAL_DATA_COLUMN_COUNT).fill('');

      // If there are box annotations, create a row for each one
      if (fileEntry.annotations?.boxAnnotations && fileEntry.annotations.boxAnnotations.length > 0) {
        fileEntry.annotations.boxAnnotations.forEach((box, index) => {
          const rowData = index === 0 ? fullFileData : emptyFileData;
          const additionalData = index === 0 ? additionalFileData : emptyAdditionalData;
          
          fileRows.push([
            ...rowData,
            box.id,
            box.x.toString(),
            box.y.toString(),
            box.width.toString(),
            box.height.toString(),
            box.color || '',
            box.timestamp || '',
            ...additionalData
          ]);
        });
      } else {
        // If no box annotations, still include one row with empty box data
        fileRows.push([
          ...fullFileData,
          '', // Box ID
          '', // Box X
          '', // Box Y
          '', // Box Width
          '', // Box Height
          '', // Box Color
          '', // Box Timestamp
          ...additionalFileData
        ]);
      }
    });

    // Combine all data
    const allRows = [
      ...metadataRows,
      fileHeaders,
      ...fileRows
    ];

    const csvContent = allRows.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileName = `striae-case-${exportData.metadata.caseNumber}-detailed-${formatDateForFilename(new Date())}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    console.log('Comprehensive CSV export download initiated:', exportFileName);
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

/**
 * Download case data as ZIP file including images
 */
export async function downloadCaseAsZip(
  user: User,
  caseNumber: string,
  format: ExportFormat,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    onProgress?.(10);
    
    // Get case data
    const exportData = await exportCaseData(user, caseNumber);
    onProgress?.(30);
    
    // Create ZIP
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add data file
    if (format === 'json') {
      zip.file(`${caseNumber}_data.json`, JSON.stringify(exportData, null, 2));
    } else {
      const csvContent = await generateCSVContentFromExportData(exportData);
      zip.file(`${caseNumber}_data.csv`, csvContent);
    }
    onProgress?.(50);
    
    // Add images
    const imageFolder = zip.folder('images');
    if (imageFolder && exportData.files) {
      for (let i = 0; i < exportData.files.length; i++) {
        const file = exportData.files[i];
        try {
          const imageBlob = await fetchImageAsBlob(file.fileData);
          if (imageBlob) {
            imageFolder.file(file.fileData.originalFilename, imageBlob);
          }
        } catch (error) {
          console.warn(`Failed to fetch image ${file.fileData.originalFilename}:`, error);
        }
        onProgress?.(50 + (i / exportData.files.length) * 30);
      }
    }
    
    // Add README
    const readme = generateZipReadme(exportData);
    zip.file('README.txt', readme);
    onProgress?.(85);
    
    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    onProgress?.(95);
    
    // Download
    const url = URL.createObjectURL(zipBlob);
    const exportFileName = `striae-case-${caseNumber}-export-${formatDateForFilename(new Date())}.zip`;
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    URL.revokeObjectURL(url);
    onProgress?.(100);
    
    console.log('ZIP export download initiated:', exportFileName);
  } catch (error) {
    console.error('ZIP export failed:', error);
    throw new Error('Failed to export ZIP file');
  }
}

/**
 * Helper function to fetch image as blob
 */
async function fetchImageAsBlob(fileData: FileData): Promise<Blob | null> {
  try {
    const imageUrl = await getImageUrl(fileData);
    if (!imageUrl) return null;
    
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    return await response.blob();
  } catch (error) {
    console.error('Failed to fetch image blob:', error);
    return null;
  }
}

/**
 * Generate CSV content from export data (comprehensive format matching downloadCaseAsCSV)
 */
async function generateCSVContentFromExportData(exportData: CaseExportData): Promise<string> {
  // Case metadata section (same as downloadCaseAsCSV)
  const metadataRows = [
    ['Case Export Report'],
    [''],
    ['Case Number', exportData.metadata.caseNumber],
    ['Export Date', exportData.metadata.exportDate],
    ['Exported By', exportData.metadata.exportedBy || 'N/A'],
    ['Striae Export Schema Version', exportData.metadata.striaeExportSchemaVersion],
    ['Total Files', exportData.metadata.totalFiles],
    [''],
    ['Summary'],
    ['Files with Annotations', exportData.summary?.filesWithAnnotations || 0],
    ['Files without Annotations', exportData.summary?.filesWithoutAnnotations || 0],
    ['Total Box Annotations', exportData.summary?.totalBoxAnnotations || 0],
    ['Last Modified', exportData.summary?.lastModified || 'N/A'],
    [''],
    ['File Details']
  ];

  // File details headers (updated for individual box annotations)
  const fileHeaders = [
    'File ID',
    'Original Filename',
    'Upload Date',
    'Has Annotations',
    'Left Case',
    'Right Case',
    'Left Item',
    'Right Item',
    'Case Font Color',
    'Class Type',
    'Custom Class',
    'Class Note',
    'Index Type',
    'Index Number',
    'Index Color',
    'Support Level',
    'Has Subclass',
    'Include Confirmation',
    'Total Box Annotations',
    'Box ID',
    'Box X',
    'Box Y',
    'Box Width',
    'Box Height',
    'Box Color',
    'Box Timestamp',
    'Additional Notes',
    'Last Updated'
  ];

  // File data rows - file info only on first row, subsequent rows only have box data
  const fileRows: string[][] = [];
  
  exportData.files.forEach(fileEntry => {
    // Full file data for the first row (excluding Additional Notes and Last Updated)
    const fullFileData = [
      fileEntry.fileData.id,
      fileEntry.fileData.originalFilename,
      fileEntry.fileData.uploadedAt,
      fileEntry.hasAnnotations ? 'Yes' : 'No',
      fileEntry.annotations?.leftCase || '',
      fileEntry.annotations?.rightCase || '',
      fileEntry.annotations?.leftItem || '',
      fileEntry.annotations?.rightItem || '',
      fileEntry.annotations?.caseFontColor || '',
      fileEntry.annotations?.classType || '',
      fileEntry.annotations?.customClass || '',
      fileEntry.annotations?.classNote || '',
      fileEntry.annotations?.indexType || '',
      fileEntry.annotations?.indexNumber || '',
      fileEntry.annotations?.indexColor || '',
      fileEntry.annotations?.supportLevel || '',
      fileEntry.annotations?.hasSubclass ? 'Yes' : 'No',
      fileEntry.annotations?.includeConfirmation ? 'Yes' : 'No',
      (fileEntry.annotations?.boxAnnotations?.length || 0).toString()
    ];

    // Additional Notes and Last Updated (at the end)
    const additionalFileData = [
      fileEntry.annotations?.additionalNotes || '',
      fileEntry.annotations?.updatedAt || ''
    ];

    // Empty row template for subsequent box annotations (file info columns empty)
    const emptyFileData = Array(FILE_DATA_COLUMN_COUNT).fill('');
    const emptyAdditionalData = Array(ADDITIONAL_DATA_COLUMN_COUNT).fill('');

    // If there are box annotations, create a row for each one
    if (fileEntry.annotations?.boxAnnotations && fileEntry.annotations.boxAnnotations.length > 0) {
      fileEntry.annotations.boxAnnotations.forEach((box, index) => {
        const rowData = index === 0 ? fullFileData : emptyFileData;
        const additionalData = index === 0 ? additionalFileData : emptyAdditionalData;
        
        fileRows.push([
          ...rowData,
          box.id,
          box.x.toString(),
          box.y.toString(),
          box.width.toString(),
          box.height.toString(),
          box.color || '',
          box.timestamp || '',
          ...additionalData
        ]);
      });
    } else {
      // If no box annotations, still include one row with empty box data
      fileRows.push([
        ...fullFileData,
        '', // Box ID
        '', // Box X
        '', // Box Y
        '', // Box Width
        '', // Box Height
        '', // Box Color
        '', // Box Timestamp
        ...additionalFileData
      ]);
    }
  });

  // Combine all data (same as downloadCaseAsCSV)
  const allRows = [
    ...metadataRows,
    fileHeaders,
    ...fileRows
  ];

  return allRows.map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

/**
 * Generate README content for ZIP export
 */
function generateZipReadme(exportData: CaseExportData): string {
  const totalFiles = exportData.files?.length || 0;
  const filesWithAnnotations = exportData.files?.filter(f => f.annotations && Array.isArray(f.annotations.boxAnnotations) && f.annotations.boxAnnotations.length > 0).length || 0;
  const totalBoxAnnotations = exportData.files?.reduce((sum, f) => sum + (Array.isArray(f.annotations?.boxAnnotations) ? f.annotations.boxAnnotations.length : 0), 0) || 0;
  const totalAnnotations = filesWithAnnotations + totalBoxAnnotations;

  return `Striae Case Export
==================

Case Number: ${exportData.metadata.caseNumber}
Export Date: ${new Date().toISOString()}
Striae Export Schema Version: ${exportData.metadata.striaeExportSchemaVersion}

Summary:
- Total Files: ${totalFiles}
- Files with Annotations: ${filesWithAnnotations}
- Files without Annotations: ${totalFiles - filesWithAnnotations}
- Total Box Annotations: ${totalBoxAnnotations}
- Total Annotations: ${totalAnnotations}

Contents:
- ${exportData.metadata.caseNumber}_data.json/.csv: Case data and annotations
- images/: Original uploaded images
- README.txt: This file

Generated by Striae - A Firearms Examiner's Comparison Companion
https://www.striae.org
`;
}