import { encryptBinaryForStorage } from '../encryption-utils';
import { requireEncryptionUploadConfig } from '../security/key-registry';
import type { CreateResponse, Env } from '../types';
import { deriveFileKind } from '../utils/content-disposition';

export async function handleImageUpload(request: Request, env: Env, respond: CreateResponse): Promise<Response> {
	requireEncryptionUploadConfig(env);

	const formData = await request.formData();
	const fileValue = formData.get('file');
	if (!(fileValue instanceof Blob)) {
		return respond({ error: 'Missing file upload payload' }, 400);
	}

	const fileBlob = fileValue;
	const uploadedAt = new Date().toISOString();
	const filename = fileValue instanceof File && fileValue.name ? fileValue.name : 'upload.bin';
	const contentType = fileBlob.type || 'application/octet-stream';
	const fileId = crypto.randomUUID().replace(/-/g, '');
	const plaintextBytes = await fileBlob.arrayBuffer();

	const encryptedPayload = await encryptBinaryForStorage(
		plaintextBytes,
		env.DATA_AT_REST_ENCRYPTION_PUBLIC_KEY,
		env.DATA_AT_REST_ENCRYPTION_KEY_ID,
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
		},
	});

	return respond({
		success: true,
		errors: [],
		messages: [],
		result: {
			id: fileId,
			filename,
			uploaded: uploadedAt,
		},
	});
}
