import paths from '~/config/config.json';
import { getImageApiKey } from '~/utils/auth';
import { FileData, ImageUploadResponse } from '~/types';

const IMAGE_WORKER_URL = paths.image_worker_url;

/**
 * Upload image blob to image worker and get file data
 */
export async function uploadImageBlob(
  imageBlob: Blob, 
  originalFilename: string,
  onProgress?: (filename: string, progress: number) => void
): Promise<FileData> {
  const imagesApiToken = await getImageApiKey();
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // Create a File object from the blob to preserve the filename
    const file = new File([imageBlob], originalFilename, { type: imageBlob.type });
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(originalFilename, progress);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        try {
          const imageData = JSON.parse(xhr.responseText) as ImageUploadResponse;
          if (!imageData.success) {
            throw new Error(`Upload failed: ${imageData.errors?.join(', ') || 'Unknown error'}`);
          }

          const fileData: FileData = {
            id: imageData.result.id,
            originalFilename: originalFilename,
            uploadedAt: new Date().toISOString()
          };

          resolve(fileData);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', IMAGE_WORKER_URL);
    xhr.setRequestHeader('Authorization', `Bearer ${imagesApiToken}`);
    xhr.send(formData);
  });
}