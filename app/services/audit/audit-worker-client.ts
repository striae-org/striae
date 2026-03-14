import paths from '~/config/config.json';
import { ValidationAuditEntry } from '~/types';
import { getDataApiKey } from '~/utils/auth';

const AUDIT_WORKER_URL = paths.audit_worker_url;

interface FetchAuditEntriesParams {
  userId: string;
  startDate?: string;
  endDate?: string;
}

interface FetchAuditEntriesResponse {
  entries: ValidationAuditEntry[];
  total: number;
}

interface PersistAuditEntryResponse {
  success: boolean;
  entryCount: number;
  filename: string;
}

export type PersistAuditEntryResult =
  | {
      ok: true;
      entryCount: number;
    }
  | {
      ok: false;
      status: number;
      errorData: unknown;
    };

export async function fetchAuditEntriesForUser(
  params: FetchAuditEntriesParams
): Promise<ValidationAuditEntry[] | null> {
  const apiKey = await getDataApiKey();
  const url = new URL(`${AUDIT_WORKER_URL}/audit/`);
  url.searchParams.set('userId', params.userId);

  if (params.startDate) {
    url.searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    url.searchParams.set('endDate', params.endDate);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Custom-Auth-Key': apiKey
    }
  });

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as FetchAuditEntriesResponse;
  return result.entries;
}

export async function persistAuditEntryForUser(
  entry: ValidationAuditEntry
): Promise<PersistAuditEntryResult> {
  const apiKey = await getDataApiKey();
  const url = new URL(`${AUDIT_WORKER_URL}/audit/`);
  url.searchParams.set('userId', entry.userId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Custom-Auth-Key': apiKey
    },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      errorData
    };
  }

  const result = (await response.json()) as PersistAuditEntryResponse;
  return {
    ok: true,
    entryCount: result.entryCount
  };
}
