import { type ValidationAuditEntry } from '~/types';
import { fetchAuditApi } from './audit-api-client';

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
  const searchParams = new URLSearchParams();
  searchParams.set('userId', params.userId);

  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }

  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }

  const requestPath = `/audit/?${searchParams.toString()}`;

  const response = await fetchAuditApi(requestPath, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
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
  const searchParams = new URLSearchParams();
  searchParams.set('userId', entry.userId);
  const requestPath = `/audit/?${searchParams.toString()}`;

  const response = await fetchAuditApi(requestPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
