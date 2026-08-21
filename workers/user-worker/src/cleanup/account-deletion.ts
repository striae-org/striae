import { deleteFirebaseAuthUser } from '../firebase/admin';
import { readUserRecord } from '../storage/user-records';
import type { AccountDeletionProgressEvent, Env } from '../types';
import { readCaseFileIds } from './case-data-reader';

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
    // readCaseFileIds is best-effort and never throws, so deletion always proceeds below.
    for (const fileId of await readCaseFileIds(env, caseDataKey)) {
      fileIds.add(fileId);
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
    // R2 delete-call failures are logged but must not block auth/user record removal.
    console.error(`Account deletion for ${userUid} proceeding despite incomplete case cleanup: ${caseCleanupErrors.join(' | ')}`);
  }

  await deleteUserConfirmationSummary(env, userUid);

  await deleteFirebaseAuthUser(env, userUid);
  await env.USER_DB.delete(userUid);

  return {
    success: caseCleanupErrors.length === 0,
    message: caseCleanupErrors.length === 0
      ? 'Account successfully deleted'
      : `Account deleted; some case data cleanup failed and may require manual review: ${caseCleanupErrors.join(' | ')}`,
    totalCases,
    completedCases
  };
}