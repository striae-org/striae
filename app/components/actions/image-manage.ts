import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { 
  getImageApiKey,
  getAccountHash 
} from '~/utils/auth';
import { canUploadFile } from '~/utils/permissions';
import { getCaseData, updateCaseData, deleteFileAnnotations } from '~/utils/data-operations';
import { CaseData, FileData, ImageUploadResponse } from '~/types';
import { auditService } from '~/services/audit.service';

const IMAGE_URL = paths.image_worker_url;

export const fetchFiles = async (
  user: User, 
  caseNumber: string, 
  options?: { skipValidation?: boolean }
): Promise<FileData[]> => {
  const caseData = await getCaseData(user, caseNumber, { skipValidation: options?.skipValidation });
  return caseData?.files || [];
};

export const uploadFile = async (
  user: User, 
  caseNumber: string, 
  file: File, 
  onProgress?: (progress: number) => void
): Promise<FileData> => {
  const startTime = Date.now();
  
  // First, get current files to check count
  const currentFiles = await fetchFiles(user, caseNumber);
  
  // Check if user can upload another file
  const permission = await canUploadFile(user, currentFiles.length);
  if (!permission.canUpload) {
    // Log permission denied
    try {
      await auditService.logFileUpload(
        user,
        file.name,
        file.size,
        file.type,
        'file-picker',
        caseNumber,
        'failure',
        Date.now() - startTime
      );
    } catch (auditError) {
      console.error('Failed to log file upload permission denial:', auditError);
    }
    throw new Error(permission.reason || 'You cannot upload more files to this case.');
  }

  const imagesApiToken = await getImageApiKey();
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', async () => {
      const endTime = Date.now();
      
      if (xhr.status === 200) {
        try {
          const imageData = JSON.parse(xhr.responseText) as ImageUploadResponse;
          if (!imageData.success) throw new Error('Upload failed');

          const newFile: FileData = {
            id: imageData.result.id,
            originalFilename: file.name,
            uploadedAt: new Date().toISOString()
          };

          // Update case data using centralized function
          const existingData = await getCaseData(user, caseNumber);
          if (!existingData) {
            throw new Error('Case not found');
          }

          const updatedData = {
            ...existingData,
            files: [...(existingData.files || []), newFile]
          };

          await updateCaseData(user, caseNumber, updatedData);

          // Log successful file upload
          try {
            await auditService.logFileUpload(
              user,
              file.name,
              file.size,
              file.type,
              'file-picker',
              caseNumber,
              'success',
              endTime - startTime,
              imageData.result.id
            );
          } catch (auditError) {
            console.error('Failed to log successful file upload:', auditError);
          }

          console.log(`✅ File uploaded: ${file.name} (${file.size} bytes) (${endTime - startTime}ms)`);
          resolve(newFile);
        } catch (error) {
          // Log failed file upload
          try {
            await auditService.logFileUpload(
              user,
              file.name,
              file.size,
              file.type,
              'file-picker',
              caseNumber,
              'failure',
              endTime - startTime
            );
          } catch (auditError) {
            console.error('Failed to log file upload failure:', auditError);
          }
          reject(error);
        }
      } else {
        // Log failed file upload
        try {
          await auditService.logFileUpload(
            user,
            file.name,
            file.size,
            file.type,
            'file-picker',
            caseNumber,
            'failure',
            endTime - startTime
          );
        } catch (auditError) {
          console.error('Failed to log file upload failure:', auditError);
        }
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', async () => {
      // Log upload error
      try {
        await auditService.logFileUpload(
          user,
          file.name,
          file.size,
          file.type,
          'file-picker',
          caseNumber,
          'failure',
          Date.now() - startTime
        );
      } catch (auditError) {
        console.error('Failed to log file upload error:', auditError);
      }
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', IMAGE_URL);
    xhr.setRequestHeader('Authorization', `Bearer ${imagesApiToken}`);
    xhr.send(formData);
  });
};

export const deleteFile = async (user: User, caseNumber: string, fileId: string, deleteReason: string = 'User-requested deletion via file list'): Promise<void> => {
  const startTime = Date.now();
  
  // Get file info for audit logging (outside try block so it's available in catch)
  let fileName = fileId; // Default to fileId
  let fileToDelete: FileData | undefined;
  
  try {
    // Get the case data using centralized function
    const caseData = await getCaseData(user, caseNumber);
    if (!caseData) {
      throw new Error('Case not found');
    }
    
    fileToDelete = (caseData.files || []).find((f: FileData) => f.id === fileId);
    fileName = fileToDelete?.originalFilename || fileId;
    const fileSize = 0; // We don't store file size, so use 0

    let imageDeleteFailed = false;
    let imageDeleteError = '';

    // Attempt to delete image file
    const imagesApiToken = await getImageApiKey();
    const imageResponse = await fetch(`${IMAGE_URL}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${imagesApiToken}`
      }
    });

    // Handle image deletion response
    if (!imageResponse.ok) {
      if (imageResponse.status === 404) {
        // Image already doesn't exist - proceed with data cleanup
        console.warn(`Image ${fileId} not found (404) - proceeding with data cleanup`);
      } else {
        // Other errors should still fail the operation
        imageDeleteFailed = true;
        imageDeleteError = `Failed to delete image: ${imageResponse.statusText}`;
      }
    }

    // If image deletion failed with non-404 error, don't proceed with data cleanup
    if (imageDeleteFailed) {
      throw new Error(imageDeleteError);
    }

    // Clean up data files regardless of image deletion success/404
    // Try to delete notes file using centralized function
    try {
      await deleteFileAnnotations(user, caseNumber, fileId);
    } catch (error) {
      // Ignore 404 errors - notes file might not exist
      console.log('Notes file deletion result:', error);
    }

    // Update case data.json to remove file reference using centralized function
    const updatedData: CaseData = {
      ...caseData,
      files: (caseData.files || []).filter((f: FileData) => f.id !== fileId)
    };

    await updateCaseData(user, caseNumber, updatedData);

    // Log successful file deletion
    const endTime = Date.now();
    try {
      await auditService.logFileDeletion(
        user,
        fileName,
        fileSize,
        deleteReason,
        caseNumber,
        fileId,
        fileToDelete?.originalFilename
      );
    } catch (auditError) {
      console.error('Failed to log file deletion:', auditError);
    }

    console.log(`✅ File deleted: ${fileName} (${endTime - startTime}ms)`);
    
  } catch (error) {
    // Log failed file deletion
    const endTime = Date.now();
    try {
      await auditService.logEvent({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'file-delete',
        result: 'failure',
        fileName: fileName, // Now uses the original filename
        fileType: 'unknown',
        validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
        caseNumber,
        fileDetails: {
          fileId: fileId,
          fileSize: 0,
          deleteReason: 'Failed deletion attempt',
          originalFileName: fileToDelete?.originalFilename
        },
        performanceMetrics: {
          processingTimeMs: endTime - startTime,
          fileSizeBytes: 0
        }
      });
    } catch (auditError) {
      console.error('Failed to log file deletion failure:', auditError);
    }
    
    console.error('Error in deleteFile:', error);
    throw error;
  }
};

const DEFAULT_VARIANT = 'striae';
interface ImageDeliveryConfig {
  accountHash: string;
}

const getImageConfig = async (): Promise<ImageDeliveryConfig> => {
  const accountHash = await getAccountHash();
  return { accountHash };
};


export const getImageUrl = async (user: User, fileData: FileData, caseNumber: string, accessReason?: string): Promise<string> => {
  const startTime = Date.now();
  const defaultAccessReason = accessReason || 'Image viewer access';
  
  try {
    const { accountHash } = await getImageConfig();  
    const imagesApiToken = await getImageApiKey();
    const imageDeliveryUrl = `https://imagedelivery.net/${accountHash}/${fileData.id}/${DEFAULT_VARIANT}`;
    
    const workerResponse = await fetch(`${IMAGE_URL}/${imageDeliveryUrl}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${imagesApiToken}`,
        'Accept': 'text/plain'
      }
    });
    
    if (!workerResponse.ok) {
      // Log failed image access
      await auditService.logFileAccess(
        user,
        fileData.originalFilename || fileData.id,
        fileData.id,
        'signed-url',
        caseNumber,
        'failure',
        Date.now() - startTime,
        'Image URL generation failed',
        fileData.originalFilename
      );
      throw new Error('Failed to get signed image URL');
    }
    
    const signedUrl = await workerResponse.text();
    if (!signedUrl.includes('sig=') || !signedUrl.includes('exp=')) {
      // Log invalid URL response
      await auditService.logFileAccess(
        user,
        fileData.originalFilename || fileData.id,
        fileData.id,
        'signed-url',
        caseNumber,
        'failure',
        Date.now() - startTime,
        'Invalid signed URL returned',
        fileData.originalFilename
      );
      throw new Error('Invalid signed URL returned');
    }
    
    // Log successful image access
    await auditService.logFileAccess(
      user,
      fileData.originalFilename || fileData.id,
      fileData.id,
      'signed-url',
      caseNumber,
      'success',
      Date.now() - startTime,
      defaultAccessReason,
      fileData.originalFilename
    );
    
    return signedUrl;
  } catch (error) {
    // Log any unexpected errors if not already logged
    if (!(error instanceof Error && error.message.includes('Failed to get signed image URL'))) {
      await auditService.logFileAccess(
        user,
        fileData.originalFilename || fileData.id,
        fileData.id,
        'signed-url',
        caseNumber,
        'failure',
        Date.now() - startTime,
        `Unexpected error during ${accessReason || 'image access'}`,
        fileData.originalFilename
      );
    }
    throw error;
  }
};