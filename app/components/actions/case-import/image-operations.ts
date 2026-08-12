import type { User } from 'firebase/auth';
import { uploadImageApi, uploadOtherFileApi } from '~/utils/api';
import { type FileData, type OtherFileData } from '~/types';

/**
 * Upload image blob to image worker and get file data
 */
export async function uploadImageBlob(
  user: User,
  imageBlob: Blob, 
  originalFilename: string,
  onProgress?: (filename: string, progress: number) => void
): Promise<FileData> {
  // Create a File object from the blob to preserve the filename
  const file = new File([imageBlob], originalFilename, { type: imageBlob.type });
  const imageData = await uploadImageApi(user, file, (progress) => {
    if (onProgress) {
      onProgress(originalFilename, progress);
    }
  });

  const uploadedImageId = imageData.result?.id;
  if (!uploadedImageId) {
    throw new Error('Upload failed: missing image identifier');
  }

  return {
    id: uploadedImageId,
    originalFilename,
    uploadedAt: new Date().toISOString()
  };
}

export async function uploadOtherFileBlob(
  user: User,
  fileBlob: Blob,
  originalFilename: string,
  onProgress?: (filename: string, progress: number) => void
): Promise<OtherFileData> {
  const file = new File([fileBlob], originalFilename, { type: fileBlob.type });
  const uploadData = await uploadOtherFileApi(user, file, (progress) => {
    if (onProgress) {
      onProgress(originalFilename, progress);
    }
  });

  const uploadedFileId = uploadData.result?.id;
  if (!uploadedFileId) {
    throw new Error('Upload failed: missing associated file identifier');
  }

  return {
    id: uploadedFileId,
    originalFilename,
    uploadedAt: new Date().toISOString(),
    contentType: fileBlob.type || 'application/octet-stream',
    byteLength: fileBlob.size,
  };
}