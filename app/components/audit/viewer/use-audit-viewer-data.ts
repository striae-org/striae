import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { auditService } from '~/services/audit';
import { type AuditTrail, type UserData, type ValidationAuditEntry, type WorkflowPhase } from '~/types';
import { getCaseData, getUserData } from '~/utils/data';
import type { DateRangeFilter } from './types';

const isWorkflowPhase = (phase: unknown): phase is WorkflowPhase =>
  phase === 'casework' ||
  phase === 'case-export' ||
  phase === 'case-import' ||
  phase === 'confirmation' ||
  phase === 'user-management';

interface UseAuditViewerDataParams {
  isOpen: boolean;
  user: User | null;
  effectiveCaseNumber?: string;
  dateRange: DateRangeFilter;
  customStartDate: string;
  customEndDate: string;
}

interface AuditDateQuery {
  startDate?: string;
  endDate?: string;
}

const buildAuditDateQuery = (
  dateRange: DateRangeFilter,
  customStartDate: string,
  customEndDate: string
): AuditDateQuery => {
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (dateRange === 'custom') {
    if (customStartDate) {
      startDate = new Date(customStartDate + 'T00:00:00').toISOString();
    }

    if (customEndDate) {
      endDate = new Date(customEndDate + 'T23:59:59').toISOString();
    }

    if (customStartDate && !customEndDate) {
      endDate = new Date().toISOString();
    } else if (!customStartDate && customEndDate) {
      const startDateObj = new Date(customEndDate + 'T23:59:59');
      startDateObj.setDate(startDateObj.getDate() - 30);
      startDate = startDateObj.toISOString();
    }
  } else if (dateRange === '90d') {
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 90);
    startDate = startDateObj.toISOString();
    endDate = new Date().toISOString();
  } else {
    const days = parseInt(dateRange.replace('d', ''), 10);
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    startDate = startDateObj.toISOString();
    endDate = new Date().toISOString();
  }

  return {
    startDate,
    endDate
  };
};

export const useAuditViewerData = ({
  isOpen,
  user,
  effectiveCaseNumber,
  dateRange,
  customStartDate,
  customEndDate
}: UseAuditViewerDataParams) => {
  const [auditEntries, setAuditEntries] = useState<ValidationAuditEntry[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [isArchivedReadOnlyCase, setIsArchivedReadOnlyCase] = useState(false);
  const [bundledAuditWarning, setBundledAuditWarning] = useState<string>('');

  const loadUserData = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const data = await getUserData(user);
      setUserData(data);
    } catch (loadError) {
      console.error('Failed to load user data:', loadError);
    }
  }, [user]);

  const loadAuditData = useCallback(async () => {
    if (!user?.uid) {
      return;
    }

    setLoading(true);
    setError('');
    setBundledAuditWarning('');

    try {
      const { startDate, endDate } = buildAuditDateQuery(dateRange, customStartDate, customEndDate);

      if (effectiveCaseNumber) {
        const caseData = await getCaseData(user, effectiveCaseNumber);
        const archivedReadOnlyCase = Boolean(caseData?.isReadOnly && caseData.archived === true);
        setIsArchivedReadOnlyCase(archivedReadOnlyCase);

        if (archivedReadOnlyCase && !caseData?.bundledAuditTrail?.entries?.length) {
          setBundledAuditWarning(
            'This imported archived case does not include bundled audit trail data. No audit entries are available for this case.'
          );
        }
      } else {
        setIsArchivedReadOnlyCase(false);
      }

      const entries = await auditService.getAuditEntriesForUser(user.uid, {
        requestingUser: user,
        caseNumber: effectiveCaseNumber,
        startDate,
        endDate,
        limit: effectiveCaseNumber ? 1000 : 500
      });

      setAuditEntries(entries);

      if (effectiveCaseNumber && entries.length > 0) {
        const trail: AuditTrail = {
          caseNumber: effectiveCaseNumber,
          workflowId: `workflow-${effectiveCaseNumber}-${user.uid}`,
          entries,
          summary: {
            totalEvents: entries.length,
            successfulEvents: entries.filter(entry => entry.result === 'success').length,
            failedEvents: entries.filter(entry => entry.result === 'failure').length,
            warningEvents: entries.filter(entry => entry.result === 'warning').length,
            workflowPhases: [...new Set(entries
              .map(entry => entry.details.workflowPhase)
              .filter(isWorkflowPhase))],
            participatingUsers: [...new Set(entries.map(entry => entry.userId))],
            startTimestamp: entries[entries.length - 1]?.timestamp || new Date().toISOString(),
            endTimestamp: entries[0]?.timestamp || new Date().toISOString(),
            complianceStatus: entries.some(entry => entry.result === 'failure') ? 'non-compliant' : 'compliant',
            securityIncidents: entries.filter(entry => entry.action === 'security-violation').length
          }
        };
        setAuditTrail(trail);
      } else {
        setAuditTrail(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, customStartDate, customEndDate, effectiveCaseNumber]);

  useEffect(() => {
    if (isOpen && user) {
      void loadAuditData();
      void loadUserData();
    }
  }, [isOpen, user, loadAuditData, loadUserData]);

  return {
    auditEntries,
    userData,
    loading,
    error,
    setError,
    auditTrail,
    isArchivedReadOnlyCase,
    bundledAuditWarning,
    loadAuditData
  };
};