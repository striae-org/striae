import {
  encryptJsonForUserKv,
  tryParseEncryptedRecord,
  validateEncryptedRecord
} from '../encryption-utils';
import { decryptUserKvRecord, parseUserKvPrivateKeyRegistry } from '../registry/user-kv';
import type { Env, UserData } from '../types';

export async function readUserRecord(env: Env, userUid: string): Promise<UserData | null> {
  const storedValue = await env.USER_DB.get(userUid);
  if (storedValue === null) {
    return null;
  }

  const encryptedRecord = tryParseEncryptedRecord(storedValue);
  if (!encryptedRecord) {
    throw new Error('User KV record is not encrypted');
  }

  validateEncryptedRecord(encryptedRecord);
  const keyRegistry = await parseUserKvPrivateKeyRegistry(env);
  const decryptedJson = await decryptUserKvRecord(encryptedRecord, keyRegistry);
  return JSON.parse(decryptedJson) as UserData;
}

export async function writeUserRecord(env: Env, userUid: string, userData: UserData): Promise<void> {
  const encryptedPayload = await encryptJsonForUserKv(
    JSON.stringify(userData),
    env.USER_KV_ENCRYPTION_PUBLIC_KEY,
    env.USER_KV_ENCRYPTION_KEY_ID
  );

  await env.USER_DB.put(userUid, encryptedPayload);
}