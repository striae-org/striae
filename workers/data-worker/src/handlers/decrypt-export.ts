import {
  buildExportDecryptionContext,
  decryptExportDataWithRegistry,
  decryptExportImageWithRegistry,
  getNonEmptyString
} from '../registry/key-registry';
import type { CreateResponse, Env } from '../types';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j += 1) {
      binary += String.fromCharCode(chunk[j]);
    }
  }

  return btoa(binary);
}

export async function handleDecryptExport(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
  try {
    const requestBody = await request.json() as {
      wrappedKey?: string;
      dataIv?: string;
      encryptedData?: string;
      encryptedImages?: Array<{ filename: string; encryptedData: string; iv?: string }>;
      keyId?: string;
    };

    const { wrappedKey, dataIv, encryptedData, encryptedImages, keyId } = requestBody;

    if (
      !wrappedKey ||
      typeof wrappedKey !== 'string' ||
      !dataIv ||
      typeof dataIv !== 'string' ||
      !encryptedData ||
      typeof encryptedData !== 'string'
    ) {
      return respond(
        { error: 'Missing or invalid required fields: wrappedKey, dataIv, encryptedData' },
        400
      );
    }

    const recordKeyId = getNonEmptyString(keyId);
    const decryptionContext = await buildExportDecryptionContext(recordKeyId, env);

    let plaintextData: string;
    try {
      plaintextData = await decryptExportDataWithRegistry(
        encryptedData,
        wrappedKey,
        dataIv,
        decryptionContext
      );
    } catch (error) {
      console.error('Data file decryption failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
      return respond(
        { error: `Failed to decrypt data file: ${errorMessage}` },
        500
      );
    }

    const decryptedImages: Array<{ filename: string; data: string }> = [];
    if (Array.isArray(encryptedImages) && encryptedImages.length > 0) {
      for (const imageEntry of encryptedImages) {
        try {
          if (!imageEntry.iv || typeof imageEntry.iv !== 'string') {
            return respond(
              { error: `Missing IV for image ${imageEntry.filename}` },
              400
            );
          }

          const imageBlob = await decryptExportImageWithRegistry(
            imageEntry.encryptedData,
            wrappedKey,
            imageEntry.iv,
            decryptionContext
          );

          const base64Data = arrayBufferToBase64(await imageBlob.arrayBuffer());
          decryptedImages.push({
            filename: imageEntry.filename,
            data: base64Data
          });
        } catch (error) {
          console.error(`Image decryption failed for ${imageEntry.filename}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
          return respond(
            { error: `Failed to decrypt image ${imageEntry.filename}: ${errorMessage}` },
            500
          );
        }
      }
    }

    return respond({
      success: true,
      plaintext: plaintextData,
      decryptedImages
    });
  } catch (error) {
    console.error('Export decryption request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respond({ error: errorMessage }, 500);
  }
}