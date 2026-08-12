// File-related types and interfaces

export interface FileData {
  id: string;
  originalFilename: string;
  uploadedAt: string;
}

export interface OtherFileData {
  id: string;
  originalFilename: string;
  uploadedAt: string;
  contentType?: string;
  byteLength?: number;
}

export interface FileUploadResponse {
  success: boolean;
  result: {
    id: string;
    filename: string;
    uploaded: string;
  };
  errors: Array<{
    code: number;
    message: string;
  }>;
  messages: string[];
}

export interface ImageUploadResponse {
  success: boolean;
  result: FileUploadResponse['result'];
  errors: FileUploadResponse['errors'];
  messages: FileUploadResponse['messages'];
}

export interface SignedImageUrlResponse {
  success: boolean;
  result: {
    fileId: string;
    url: string;
    expiresAt: string;
    expiresInSeconds: number;
  };
}

export interface SignedFileUrlResponse {
  success: boolean;
  result: {
    fileId: string;
    url: string;
    expiresAt: string;
    expiresInSeconds: number;
  };
}

export interface ImageAccessResult {
  url: string;
  revoke: () => void;
  blob?: Blob;
  urlType: 'signed' | 'blob';
  expiresAt?: string;
}

export interface FileAccessResult {
  url: string;
  revoke: () => void;
  blob?: Blob;
  urlType: 'signed' | 'blob';
  expiresAt?: string;
}