import type { User } from 'firebase/auth';
import { uploadImageApi } from '~/utils/image-api-client';
import { type FileData } from '~/types';

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