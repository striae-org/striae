import { decryptJsonFromStorage, type DataAtRestEnvelope } from '../encryption-utils';
import { deleteFirebaseAuthUser } from '../firebase/admin';
import { readUserRecord } from '../storage/user-records';
import type {
  AccountDeletionProgressEvent,
  Env,
  PrivateKeyRegistry,
  StoredCaseData
} from '../types';
import { fetchKeyRegistryFromR2 } from '../../../../shared/registry/r2-key-registry';

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function getDataAtRestPrivateKeyRegistry(env: Env): Promise<PrivateKeyRegistry> {
  return fetchKeyRegistryFromR2(
    env.STRIAE_CONFIG,
    'data-at-rest',
    env.DATA_AT_REST_ENCRYPTION_ACTIVE_KEY_ID,
    env.REGISTRY_ENCRYPTION_KEY
  );
}

function buildPrivateKeyCandidates(
  recordKeyId: string | null,
  registry: PrivateKeyRegistry
): Array<{ keyId: string; privateKeyPem: string }> {
  const candidates: Array<{ keyId: string; privateKeyPem: string }> = [];
  const seen = new Set<string>();

  const appendCandidate = (candidateKeyId: string | null): void => {
    if (!candidateKeyId || seen.has(candidateKeyId)) {
      return;
    }

    const privateKeyPem = registry.keys[candidateKeyId];
    if (!privateKeyPem) {
      return;
    }

    seen.add(candidateKeyId);
    candidates.push({ keyId: candidateKeyId, privateKeyPem });
  };

  appendCandidate(recordKeyId);
  appendCandidate(registry.activeKeyId);

  for (const keyId of Object.keys(registry.keys)) {
    appendCandidate(keyId);
  }

  return candidates;
}

function extractDataAtRestEnvelope(file: R2ObjectBody): DataAtRestEnvelope | null {
  const metadata = file.customMetadata;

  if (!metadata) {
    return null;
  }

  const algorithm = getNonEmptyString(metadata.algorithm);
  const encryptionVersion = getNonEmptyString(metadata.encryptionVersion);
  const keyId = getNonEmptyString(metadata.keyId);
  const dataIv = getNonEmptyString(metadata.dataIv);
  const wrappedKey = getNonEmptyString(metadata.wrappedKey);

  if (!algorithm || !encryptionVersion || !keyId || !dataIv || !wrappedKey) {
    return null;
  }

  return {
    algorithm,
    encryptionVersion,
    keyId,
    dataIv,
    wrappedKey
  };
}

async function decryptCaseDataWithRegistry(
  ciphertext: ArrayBuffer,
  envelope: DataAtRestEnvelope,
  env: Env
): Promise<string> {
  const keyRegistry = await getDataAtRestPrivateKeyRegistry(env);
  const candidates = buildPrivateKeyCandidates(getNonEmptyString(envelope.keyId), keyRegistry);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await decryptJsonFromStorage(ciphertext, envelope, candidate.privateKeyPem);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Failed to decrypt case data after ${candidates.length} key attempt(s): ${
      lastError instanceof Error ? lastError.message : 'unknown decryption error'
    }`
  );
}

function extractFileIdsFromCaseData(caseData: StoredCaseData): string[] {
  if (!Array.isArray(caseData.files)) {
    return [];
  }

  return caseData.files
    .map((file) => getNonEmptyString(file?.id))
    .filter((fileId): fileId is string => fileId !== null);
}

async function readCaseFileIds(env: Env, caseDataKey: string): Promise<string[]> {
  const file = await env.STRIAE_DATA.get(caseDataKey);
  if (!file) {
    return [];
  }

  const atRestEnvelope = extractDataAtRestEnvelope(file);
  const fileText = atRestEnvelope
    ? await decryptCaseDataWithRegistry(await file.arrayBuffer(), atRestEnvelope, env)
    : await file.text();

  const parsed = JSON.parse(fileText) as StoredCaseData;
  return extractFileIdsFromCaseData(parsed);
}

async function deleteSingleCase(env: Env, userUid: string, caseNumber: string): Promise<void> {
  const encodedUserId = encodeURIComponent(userUid);
  const encodedCaseNumber = encodeURIComponent(caseNumber);
  const casePrefix = `${encodedUserId}/${encodedCaseNumber}/`;
  const caseDataKey = `${casePrefix}data.json`;
  const deletionErrors: string[] = [];
  const dataKeys: string[] = [];
  const fileIds = new Set<string>();
  let dataCursor: string | undefined;

  do {
    const listed = await env.STRIAE_DATA.list({ prefix: casePrefix, cursor: dataCursor, limit: 1000 });

    for (const obj of listed.objects) {
      dataKeys.push(obj.key);

      const segments = obj.key.split('/');
      if (segments.length === 4 && segments[3] === 'data.json') {
        try {
          fileIds.add(decodeURIComponent(segments[2]));
        } catch {
          fileIds.add(segments[2]);
        }
      }
    }

    dataCursor = listed.truncated ? listed.cursor : undefined;
  } while (dataCursor !== undefined);

  if (dataKeys.includes(caseDataKey)) {
    try {
      for (const fileId of await readCaseFileIds(env, caseDataKey)) {
        fileIds.add(fileId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown case data read error';
      throw new Error(`Failed to read case file references for ${caseNumber}: ${message}`, { cause: error });
    }
  }

  for (const fileId of fileIds) {
    try {
      await env.STRIAE_FILES.delete(fileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown file delete error';
      deletionErrors.push(`file ${fileId} delete threw (${message})`);
    }
  }

  if (dataKeys.length > 0) {
    try {
      await env.STRIAE_DATA.delete(dataKeys);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown data delete error';
      deletionErrors.push(`case data delete threw (${message})`);
    }
  }

  if (deletionErrors.length > 0) {
    throw new Error(`Case cleanup incomplete for ${caseNumber}: ${deletionErrors.join('; ')}`);
  }
}

async function deleteUserConfirmationSummary(env: Env, userUid: string): Promise<void> {
  const encodedUserId = encodeURIComponent(userUid);
  const key = `${encodedUserId}/meta/confirmation-status.json`;

  try {
    await env.STRIAE_DATA.delete(key);
  } catch (error) {
    throw new Error(`Failed to delete confirmation summary metadata: ${error instanceof Error ? error.message : 'unknown error'}`, { cause: error });
  }
}

export async function executeUserDeletion(
  env: Env,
  userUid: string,
  reportProgress?: (progress: AccountDeletionProgressEvent) => void
): Promise<{ success: boolean; message: string; totalCases: number; completedCases: number }> {
  const userData = await readUserRecord(env, userUid);
  if (userData === null) {
    throw new Error('User not found');
  }

  const ownedCases = (userData.cases || []).map((caseItem) => caseItem.caseNumber);
  const readOnlyCases = (userData.readOnlyCases || []).map((caseItem) => caseItem.caseNumber);
  const allCaseNumbers = Array.from(new Set([...ownedCases, ...readOnlyCases]));
  const totalCases = allCaseNumbers.length;
  let completedCases = 0;
  const caseCleanupErrors: string[] = [];

  reportProgress?.({
    event: 'start',
    totalCases,
    completedCases
  });

  for (const caseNumber of allCaseNumbers) {
    reportProgress?.({
      event: 'case-start',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber
    });

    let caseDeletionError: string | null = null;
    try {
      await deleteSingleCase(env, userUid, caseNumber);
    } catch (error) {
      caseDeletionError = error instanceof Error ? error.message : `Case cleanup failed for ${caseNumber}`;
      caseCleanupErrors.push(caseDeletionError);
      console.error(`Case cleanup error for ${caseNumber}:`, error);
    }

    completedCases += 1;

    reportProgress?.({
      event: 'case-complete',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber,
      success: caseDeletionError === null,
      message: caseDeletionError || undefined
    });
  }

  if (caseCleanupErrors.length > 0) {
    throw new Error(`Failed to fully delete all case data: ${caseCleanupErrors.join(' | ')}`);
  }

  await deleteUserConfirmationSummary(env, userUid);

  await deleteFirebaseAuthUser(env, userUid);
  await env.USER_DB.delete(userUid);

  return {
    success: true,
    message: 'Account successfully deleted',
    totalCases,
    completedCases
  };
}