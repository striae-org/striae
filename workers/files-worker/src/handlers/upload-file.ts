import { encryptBinaryForStorage } from '../encryption-utils';
import { requireEncryptionUploadConfig } from '../security/key-registry';
import { dispatchMalwareScanHook } from '../security/malware-scan';
import type { CreateResponse, Env } from '../types';
import { deriveFileKind } from '../utils/content-disposition';

const MAX_OTHER_FILE_SIZE_BYTES = 512 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.msi',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.ps1',
  '.psm1',
  '.psd1',
  '.jar',
  '.hta',
]);

function hasBlockedExtension(filename: string): boolean {
  const normalized = filename.trim().toLowerCase();
  for (const extension of BLOCKED_EXTENSIONS) {
    if (normalized.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

export async function handleFileUpload(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
  requireEncryptionUploadConfig(env);

  const formData = await request.formData();
  const fileValue = formData.get('file');
  if (!(fileValue instanceof Blob)) {
    return respond({ error: 'Missing file upload payload' }, 400);
  }

  const fileBlob = fileValue;
  const uploadedAt = new Date().toISOString();
  const filename = fileValue instanceof File && fileValue.name ? fileValue.name : 'upload.bin';

  if (hasBlockedExtension(filename)) {
    return respond({ error: 'This file extension is blocked for security reasons' }, 400);
  }

  if (fileBlob.size > MAX_OTHER_FILE_SIZE_BYTES) {
    return respond({ error: 'File size exceeds 512 MB limit' }, 400);
  }

  const contentType = fileBlob.type || 'application/octet-stream';
  const fileId = crypto.randomUUID().replace(/-/g, '');
  const plaintextBytes = await fileBlob.arrayBuffer();
  const malwareScan = await dispatchMalwareScanHook(env, {
    fileId,
    filename,
    contentType,
    byteLength: fileBlob.size,
    uploadedAt
  });

  const encryptedPayload = await encryptBinaryForStorage(
    plaintextBytes,
    env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
    env.DATA_AT_REST_ENCRYPTION_KEY_ID
  );

  await env.STRIAE_FILES.put(fileId, encryptedPayload.ciphertext, {
    customMetadata: {
      algorithm: encryptedPayload.envelope.algorithm,
      encryptionVersion: encryptedPayload.envelope.encryptionVersion,
      keyId: encryptedPayload.envelope.keyId,
      dataIv: encryptedPayload.envelope.dataIv,
      wrappedKey: encryptedPayload.envelope.wrappedKey,
      contentType,
      originalFilename: filename,
      byteLength: String(fileBlob.size),
      createdAt: uploadedAt,
      fileKind: deriveFileKind(contentType),
      malwareScanState: malwareScan.scanState,
      malwareScanHookState: malwareScan.hookState,
      malwareScanUpdatedAt: malwareScan.updatedAt,
      malwareScanHookConfigured: malwareScan.hookConfigured ? 'true' : 'false',
      ...(malwareScan.hookError ? { malwareScanHookError: malwareScan.hookError } : {})
    }
  });

  return respond({
    success: true,
    errors: [],
    messages: [],
    result: {
      id: fileId,
      filename,
      uploaded: uploadedAt,
      malwareScan
    }
  });
}