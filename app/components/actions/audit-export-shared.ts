import type { User } from 'firebase/auth';
import { auditService } from '~/services/audit';
import type { ValidationAuditEntry } from '~/types';

export const AUDIT_FETCH_WINDOW_DAYS = 30;

export const toUtcDayStart = (value: string): Date => {
  const parsed = new Date(value);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
};

export const toUtcDayEnd = (value: string): Date => {
  const parsed = new Date(value);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
};

export const addUtcDays = (date: Date, days: number): Date => {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
};

export const getAuditEntryIdentity = (entry: ValidationAuditEntry): string => {
  return [
    entry.timestamp,
    entry.userId,
    entry.action,
    entry.result,
    entry.details.caseNumber || '',
    entry.details.fileName || '',
    entry.details.confirmationId || ''
  ].join('|');
};

interface FetchAllCaseEntriesOptions {
  forceOwnEntries?: boolean;
}

export const fetchAllCaseEntriesForExport = async (
  user: User,
  caseNumber: string,
  caseCreatedAtIso: string,
  nowIso: string,
  options: FetchAllCaseEntriesOptions = {}
): Promise<ValidationAuditEntry[]> => {
  const rangeStart = toUtcDayStart(caseCreatedAtIso);
  const rangeEnd = toUtcDayEnd(nowIso);

  const mergedEntries = new Map<string, ValidationAuditEntry>();
  let windowStart = new Date(rangeStart);

  while (windowStart.getTime() <= rangeEnd.getTime()) {
    const windowEndCandidate = addUtcDays(windowStart, AUDIT_FETCH_WINDOW_DAYS - 1);
    const windowEnd = windowEndCandidate.getTime() > rangeEnd.getTime() ? new Date(rangeEnd) : windowEndCandidate;

    const windowEntries = await auditService.getAuditEntriesForUser(user.uid, {
      requestingUser: user,
      caseNumber,
      startDate: windowStart.toISOString(),
      endDate: windowEnd.toISOString(),
      forceOwnEntries: options.forceOwnEntries
    });

    for (const entry of windowEntries) {
      mergedEntries.set(getAuditEntryIdentity(entry), entry);
    }

    windowStart = addUtcDays(windowEnd, 1);
    windowStart = new Date(Date.UTC(
      windowStart.getUTCFullYear(),
      windowStart.getUTCMonth(),
      windowStart.getUTCDate(),
      0,
      0,
      0,
      0
    ));
  }

  return Array.from(mergedEntries.values());
};
