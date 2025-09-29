import { User } from 'firebase/auth';
import { CaseExportData, CaseImportPreview } from '~/types';
import { validateCaseNumber } from '../case-manage';
import { validateCaseIntegritySecure as validateForensicIntegrity } from '~/utils/SHA256';
import { validateExporterUid, removeForensicWarning } from './validation';

/**
 * Extract original image ID from export filename format
 * Format: {originalFilename}-{id}.{extension}
 * Example: "evidence-2b365c5e-0559-4d6a-564f-d40bf1770101.jpg" returns "2b365c5e-0559-4d6a-564f-d40bf1770101"
 * 
 * Since IDs can contain hyphens (like UUIDs), we need to find the hyphen that separates
 * the original filename from the ID. We do this by looking for UUID patterns or taking
 * a reasonable portion from the end.
 */
function extractImageIdFromFilename(exportFilename: string): string | null {
  // Remove extension first
  const lastDotIndex = exportFilename.lastIndexOf('.');
  const filenameWithoutExt = lastDotIndex === -1 ? exportFilename : exportFilename.substring(0, lastDotIndex);
  
  // UUID pattern: 8-4-4-4-12 (36 chars including hyphens)
  // Look for a pattern that matches this at the end
  const uuidPattern = /^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = filenameWithoutExt.match(uuidPattern);
  
  if (match) {
    return match[2]; // Return the UUID part
  }
  
  // Fallback: if not a UUID, assume the ID is everything after the last hyphen
  // This maintains backward compatibility with non-UUID IDs
  const lastHyphenIndex = filenameWithoutExt.lastIndexOf('-');
  
  if (lastHyphenIndex === -1 || lastHyphenIndex === filenameWithoutExt.length - 1) {
    return null; // No hyphen found or hyphen is at the end
  }
  
  return filenameWithoutExt.substring(lastHyphenIndex + 1);
}

/**
 * Reconstruct original filename from export filename
 * Format: {originalFilename}-{id}.{extension} → {originalFilename}.{extension}
 * Example: "evidence-2b365c5e-0559-4d6a-564f-d40bf1770101.jpg" returns "evidence.jpg"
 */
function reconstructOriginalFilename(exportFilename: string): string {
  const lastDotIndex = exportFilename.lastIndexOf('.');
  const extension = lastDotIndex === -1 ? '' : exportFilename.substring(lastDotIndex);
  const filenameWithoutExt = lastDotIndex === -1 ? exportFilename : exportFilename.substring(0, lastDotIndex);
  
  // UUID pattern: 8-4-4-4-12 (36 chars including hyphens)
  const uuidPattern = /^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = filenameWithoutExt.match(uuidPattern);
  
  if (match) {
    return match[1] + extension; // Return the original filename part + extension
  }
  
  // Fallback: remove everything after the last hyphen
  const lastHyphenIndex = filenameWithoutExt.lastIndexOf('-');
  
  if (lastHyphenIndex === -1) {
    return exportFilename; // No hyphen found, return as-is (backward compatibility)
  }
  
  const originalBasename = filenameWithoutExt.substring(0, lastHyphenIndex);
  return originalBasename + extension;
}

/**
 * Preview case information from ZIP file without importing
 */
export async function previewCaseImport(zipFile: File, currentUser: User): Promise<CaseImportPreview> {
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // First, validate hash if forensic metadata exists
    let hashValid: boolean | undefined = undefined;
    let hashError: string | undefined = undefined;
    let expectedHash: string | undefined = undefined;
    let actualHash: string | undefined = undefined;
    let validationDetails: CaseImportPreview['validationDetails'];
    
    // Find the main data file (JSON or CSV)
    const dataFiles = Object.keys(zip.files).filter(name => 
      name.endsWith('_data.json') || name.endsWith('_data.csv')
    );
    
    if (dataFiles.length === 0) {
      throw new Error('No valid data file found in ZIP archive');
    }
    
    if (dataFiles.length > 1) {
      throw new Error('Multiple data files found in ZIP archive');
    }
    
    const dataFileName = dataFiles[0];
    const isJsonFormat = dataFileName.endsWith('.json');
    
    if (!isJsonFormat) {
      throw new Error('CSV import not yet supported. Please use JSON format.');
    }
    
    // Extract and parse case data
    const dataContent = await zip.file(dataFileName)?.async('text');
    if (!dataContent) {
      throw new Error('Failed to read data file from ZIP');
    }
    
    // Handle forensic protection warnings in JSON
    const cleanedContent = removeForensicWarning(dataContent);
    
    // Validate forensic manifest integrity
    const manifestFile = zip.file('FORENSIC_MANIFEST.json');
    
    if (manifestFile) {
      try {
        let forensicManifest: any = null;
        
        // Get forensic manifest from dedicated file
        const manifestContent = await manifestFile.async('text');
        forensicManifest = JSON.parse(manifestContent);
        
        if (forensicManifest) {
          // Enhanced validation with forensic manifest (includes individual file hashes)
          // Handle backward compatibility: old manifests use "hash" terminology, new ones use "hash"
          expectedHash = forensicManifest.manifestHash || forensicManifest.manifestHash;
          
          // Extract image files for comprehensive validation
          const imageFiles: { [filename: string]: Blob } = {};
          const imagesFolder = zip.folder('images');
          if (imagesFolder) {
            await Promise.all(Object.keys(imagesFolder.files).map(async (path) => {
              if (path.startsWith('images/') && !path.endsWith('/')) {
                const filename = path.replace('images/', '');
                const file = zip.file(path);
                if (file) {
                  const blob = await file.async('blob');
                  imageFiles[filename] = blob;
                }
              }
            }));
          }
          
          // Convert old format to new format for validation if needed
          let manifestForValidation = forensicManifest;
          if (forensicManifest.dataHash && !forensicManifest.dataHash) {
            manifestForValidation = {
              dataHash: forensicManifest.dataHash,
              imageHashes: forensicManifest.imageHashes || {},
              manifestHash: forensicManifest.manifestHash,
              totalFiles: forensicManifest.totalFiles,
              createdAt: forensicManifest.createdAt
            };
          }
          
          // Perform comprehensive validation
          const validation = await validateForensicIntegrity(
            cleanedContent, 
            imageFiles, 
            manifestForValidation
          );
          
          hashValid = validation.isValid;
          actualHash = validation.manifestValid ? expectedHash : 'validation_failed';
          
          if (!hashValid) {
            hashError = `Comprehensive validation failed: ${validation.summary}. Errors: ${validation.errors.join(', ')}`;
          }
          
          // Capture detailed validation information
          validationDetails = {
            hasForensicManifest: true,
            dataValid: validation.dataValid,
            imageValidation: validation.imageValidation,
            manifestValid: validation.manifestValid,
            validationSummary: validation.summary,
            integrityErrors: validation.errors
          };
          
        } else {
          // No forensic manifest found - cannot validate
          hashValid = false;
          hashError = 'No forensic manifest found. This case export does not support comprehensive integrity validation.';
          
          validationDetails = {
            hasForensicManifest: false,
            dataValid: false,
            validationSummary: 'No forensic manifest found - comprehensive validation not available',
            integrityErrors: ['Export does not contain forensic manifest required for validation']
          };
        }
      } catch (error) {
        hashError = `Failed to validate forensic metadata: ${error instanceof Error ? error.message : 'Unknown error'}`;
        hashValid = false;
        
        validationDetails = {
          hasForensicManifest: false,
          validationSummary: 'Validation failed due to metadata parsing error',
          integrityErrors: [hashError]
        };
      }
    } else {
      // No forensic manifest found
      validationDetails = {
        hasForensicManifest: false,
        validationSummary: 'No forensic manifest found - integrity cannot be verified',
        integrityErrors: []
      };
    }
    
    const caseData: CaseExportData = JSON.parse(cleanedContent);
    
    // Validate case data structure
    if (!caseData.metadata?.caseNumber) {
      throw new Error('Invalid case data: missing case number');
    }
    
    if (!validateCaseNumber(caseData.metadata.caseNumber)) {
      throw new Error(`Invalid case number format: ${caseData.metadata.caseNumber}`);
    }
    
    // Validate exporter UID exists in user database and is not current user
    if (caseData.metadata.exportedByUid) {
      const validation = await validateExporterUid(caseData.metadata.exportedByUid, currentUser);
      
      if (!validation.exists) {
        throw new Error(`The original exporter is not a valid Striae user. This case cannot be imported.`);
      }
      
      if (validation.isSelf) {
        throw new Error(`You cannot import a case that you originally exported. Original analysts cannot review their own cases.`);
      }
    } else {
      throw new Error('Case export missing exporter UID information. This case cannot be imported.');
    }
    
    // Count image files
    let totalFiles = 0;
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      for (const [, file] of Object.entries(imagesFolder.files)) {
        if (!file.dir && file.name.includes('/')) {
          totalFiles++;
        }
      }
    }
    
    return {
      caseNumber: caseData.metadata.caseNumber,
      exportedBy: caseData.metadata.exportedBy || null,
      exportedByName: caseData.metadata.exportedByName || null,
      exportedByCompany: caseData.metadata.exportedByCompany || null,
      exportDate: caseData.metadata.exportDate,
      totalFiles,
      caseCreatedDate: caseData.metadata.caseCreatedDate,
      hasAnnotations: false, // We'll need to determine this during parsing if needed
      validationSummary: hashValid ? 'Validation successful' : (hashError || 'Validation failed'),
      hashValid,
      hashError,
      expectedHash,
      actualHash,
      validationDetails
    };
    
  } catch (error) {
    console.error('Error previewing case import:', error);
    throw new Error(`Failed to preview case: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse and validate ZIP file contents for case import
 */
export async function parseImportZip(zipFile: File, currentUser: User): Promise<{
  caseData: CaseExportData;
  imageFiles: { [filename: string]: Blob };
  imageIdMapping: { [exportFilename: string]: string }; // exportFilename -> originalImageId
  metadata?: any;
  cleanedContent?: string; // Add cleaned content for hash validation
}> {
  // Dynamic import of JSZip to avoid bundle size issues
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // Find the main data file (JSON or CSV)
    const dataFiles = Object.keys(zip.files).filter(name => 
      name.endsWith('_data.json') || name.endsWith('_data.csv')
    );
    
    if (dataFiles.length === 0) {
      throw new Error('No valid data file found in ZIP archive');
    }
    
    if (dataFiles.length > 1) {
      throw new Error('Multiple data files found in ZIP archive');
    }
    
    const dataFileName = dataFiles[0];
    const isJsonFormat = dataFileName.endsWith('.json');
    
    // Extract and parse case data
    let caseData: CaseExportData;
    let cleanedContent: string = '';
    if (isJsonFormat) {
      const dataContent = await zip.file(dataFileName)?.async('text');
      if (!dataContent) {
        throw new Error('Failed to read data file from ZIP');
      }
      
      // Handle forensic protection warnings in JSON
      cleanedContent = removeForensicWarning(dataContent);
      caseData = JSON.parse(cleanedContent);
    } else {
      throw new Error('CSV import not yet supported. Please use JSON format.');
    }
    
    // Validate case data structure
    if (!caseData.metadata?.caseNumber) {
      throw new Error('Invalid case data: missing case number');
    }
    
    if (!validateCaseNumber(caseData.metadata.caseNumber)) {
      throw new Error(`Invalid case number format: ${caseData.metadata.caseNumber}`);
    }
    
    // Validate exporter UID exists in user database and is not current user
    if (caseData.metadata.exportedByUid) {
      const validation = await validateExporterUid(caseData.metadata.exportedByUid, currentUser);
      
      if (!validation.exists) {
        throw new Error(`The original exporter is not a valid Striae user. This case cannot be imported.`);
      }
      
      if (validation.isSelf) {
        throw new Error(`You cannot import a case that you originally exported. Original analysts cannot review their own cases.`);
      }
    } else {
      throw new Error('Case export missing exporter UID information. This case cannot be imported.');
    }
    
    // Extract image files and create ID mapping
    const imageFiles: { [filename: string]: Blob } = {};
    const imageIdMapping: { [exportFilename: string]: string } = {};
    const imagesFolder = zip.folder('images');
    
    if (imagesFolder) {
      for (const [, file] of Object.entries(imagesFolder.files)) {
        if (!file.dir && file.name.includes('/')) {
          const exportFilename = file.name.split('/').pop();
          if (exportFilename) {
            const blob = await file.async('blob');
            imageFiles[exportFilename] = blob;
            
            // Extract original image ID from filename
            const originalImageId = extractImageIdFromFilename(exportFilename);
            if (originalImageId) {
              imageIdMapping[exportFilename] = originalImageId;
            }
          }
        }
      }
    }
    
    // Extract forensic manifest if present
    let metadata: any = undefined;
    const manifestFile = zip.file('FORENSIC_MANIFEST.json');
    
    if (manifestFile) {
      const manifestContent = await manifestFile.async('text');
      metadata = { forensicManifest: JSON.parse(manifestContent) };
    }
    
    return {
      caseData,
      imageFiles,
      imageIdMapping,
      metadata,
      cleanedContent
    };
    
  } catch (error) {
    console.error('Error parsing ZIP file:', error);
    throw new Error(`Failed to parse ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}