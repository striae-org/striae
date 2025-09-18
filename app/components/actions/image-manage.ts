import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { 
  getImageApiKey,
  getDataApiKey,
  getAccountHash 
} from '~/utils/auth';
import { canUploadFile } from '~/utils/permissions';
import { CaseData, FileData, ImageUploadResponse } from '~/types';

const WORKER_URL = paths.data_worker_url;
const IMAGE_URL = paths.image_worker_url;

interface FileApiResponse {
  files: FileData[];
}

export const fetchFiles = async (user: User, caseNumber: string): Promise<FileData[]> => {
  const apiKey = await getDataApiKey();
  const response = await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/data.json`, {
    headers: { 'X-Custom-Auth-Key': apiKey }
  });
  const data = (await response.json()) as FileApiResponse;
  return data.files || [];
};

export const uploadFile = async (
  user: User, 
  caseNumber: string, 
  file: File, 
  onProgress?: (progress: number) => void
): Promise<FileData> => {
  // First, get current files to check count
  const currentFiles = await fetchFiles(user, caseNumber);
  
  // Check if user can upload another file
  const permission = await canUploadFile(user, caseNumber, currentFiles.length);
  if (!permission.canUpload) {
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
      if (xhr.status === 200) {
        try {
          const imageData = JSON.parse(xhr.responseText) as ImageUploadResponse;
          if (!imageData.success) throw new Error('Upload failed');

          const newFile: FileData = {
            id: imageData.result.id,
            originalFilename: file.name,
            uploadedAt: new Date().toISOString()
          };

          // Update case data
          const apiKey = await getDataApiKey();
          const response = await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/data.json`, {
            headers: { 'X-Custom-Auth-Key': apiKey }
          });
          const existingData = await response.json() as CaseData;

          const updatedData = {
            ...existingData,
            files: [...(existingData.files || []), newFile]
          };

          await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/data.json`, {
            method: 'PUT',
            headers: {
              'X-Custom-Auth-Key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
          });

          resolve(newFile);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open('POST', IMAGE_URL);
    xhr.setRequestHeader('Authorization', `Bearer ${imagesApiToken}`);
    xhr.send(formData);
  });
};

export const deleteFile = async (user: User, caseNumber: string, fileId: string): Promise<void> => {
  try {
    // Delete image file
    const imagesApiToken = await getImageApiKey();
    const imageResponse = await fetch(`${IMAGE_URL}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${imagesApiToken}`
      }
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to delete image: ${imageResponse.statusText}`);
    }

    // Try to delete notes file - ignore 404
    const apiKey = await getDataApiKey();
    const notesResponse = await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/${fileId}/data.json`, {
      method: 'DELETE',
      headers: {
        'X-Custom-Auth-Key': apiKey
      }
    });

    // Only throw if error is not 404 (notes file not found)
    if (!notesResponse.ok && notesResponse.status !== 404) {
      throw new Error(`Failed to delete notes: ${notesResponse.statusText}`);
    }

    // Update case data.json
    const caseResponse = await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/data.json`, {
      headers: { 'X-Custom-Auth-Key': apiKey }
    });

    const existingData = await caseResponse.json() as CaseData;
    const updatedData: CaseData = {
      ...existingData,
      files: (existingData.files || []).filter((f: FileData) => f.id !== fileId)
    };

    await fetch(`${WORKER_URL}/${user.uid}/${caseNumber}/data.json`, {
      method: 'PUT',
      headers: {
        'X-Custom-Auth-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
  } catch (error) {
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


export const getImageUrl = async (fileData: FileData): Promise<string> => {
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
  
  if (!workerResponse.ok) throw new Error('Failed to get signed image URL');
  
  const signedUrl = await workerResponse.text();
  if (!signedUrl.includes('sig=') || !signedUrl.includes('exp=')) {
    throw new Error('Invalid signed URL returned');
  }
  
  return signedUrl;
};