import {
	encryptBytesForStorage,
	decryptBytesFromStorage,
	validateEnvelope as validateEnvelopeShared,
	type DataAtRestEnvelope,
	type EncryptBytesAtRestResult,
} from '../../../shared/crypto/rsa-oaep-private';

export type { DataAtRestEnvelope };

const DATA_AT_REST_ENCRYPTION_ALGORITHM = 'RSA-OAEP-AES-256-GCM';
const DATA_AT_REST_ENCRYPTION_VERSION = '1.0';

export function validateEnvelope(envelope: DataAtRestEnvelope): void {
	validateEnvelopeShared(envelope, DATA_AT_REST_ENCRYPTION_ALGORITHM, DATA_AT_REST_ENCRYPTION_VERSION);
}

export async function encryptBinaryForStorage(
	plaintextBytes: ArrayBuffer,
	publicKeyPem: string,
	keyId: string,
): Promise<EncryptBytesAtRestResult> {
	return encryptBytesForStorage(plaintextBytes, publicKeyPem, keyId, DATA_AT_REST_ENCRYPTION_ALGORITHM, DATA_AT_REST_ENCRYPTION_VERSION);
}

export async function decryptBinaryFromStorage(
	ciphertext: ArrayBuffer,
	envelope: DataAtRestEnvelope,
	privateKeyPem: string,
): Promise<ArrayBuffer> {
	validateEnvelope(envelope);

	return decryptBytesFromStorage(ciphertext, envelope, privateKeyPem);
}
