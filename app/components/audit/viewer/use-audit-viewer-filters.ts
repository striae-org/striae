import { useCallback, useMemo, useState } from 'react';
import type { AuditAction, AuditResult, ValidationAuditEntry } from '~/types';
import type { DateRangeFilter } from './types';

const isConfirmationImportEntry = (entry: ValidationAuditEntry): boolean => {
  return entry.action === 'import' && entry.details.workflowPhase === 'confirmation';
};

export const useAuditViewerFilters = (caseNumber?: string) => {
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
  const [filterResult, setFilterResult] = useState<AuditResult | 'all'>('all');
  const [filterCaseNumber, setFilterCaseNumber] = useState<string>('');
  const [caseNumberInput, setCaseNumberInput] = useState<string>('');
  const [filterBadgeId, setFilterBadgeId] = useState<string>('');
  const [badgeIdInput, setBadgeIdInput] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('1d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customStartDateInput, setCustomStartDateInput] = useState<string>('');
  const [customEndDateInput, setCustomEndDateInput] = useState<string>('');

  const handleApplyCaseFilter = useCallback(() => {
    setFilterCaseNumber(caseNumberInput.trim());
  }, [caseNumberInput]);

  const handleClearCaseFilter = useCallback(() => {
    setCaseNumberInput('');
    setFilterCaseNumber('');
  }, []);

  const handleApplyBadgeFilter = useCallback(() => {
    setFilterBadgeId(badgeIdInput.trim());
  }, [badgeIdInput]);

  const handleClearBadgeFilter = useCallback(() => {
    setBadgeIdInput('');
    setFilterBadgeId('');
  }, []);

  const handleApplyCustomDateRange = useCallback(() => {
    setCustomStartDate(customStartDateInput);
    setCustomEndDate(customEndDateInput);
  }, [customStartDateInput, customEndDateInput]);

  const handleClearCustomDateRange = useCallback(() => {
    setCustomStartDateInput('');
    setCustomEndDateInput('');
    setCustomStartDate('');
    setCustomEndDate('');
  }, []);

  const handleDateRangeChange = useCallback((value: DateRangeFilter) => {
    setDateRange(value);
    if (value === 'custom') {
      setCustomStartDateInput(customStartDate);
      setCustomEndDateInput(customEndDate);
    }
  }, [customStartDate, customEndDate]);

  const getFilteredEntries = useCallback((entries: ValidationAuditEntry[]): ValidationAuditEntry[] => {
    const normalizedBadgeFilter = filterBadgeId.trim().toLowerCase();

    return entries.filter(entry => {
      let actionMatch: boolean;
      if (filterAction === 'all') {
        actionMatch = true;
      } else if (filterAction === 'confirmation-create') {
        actionMatch = entry.action === 'confirm' || entry.action === 'confirmation-create';
      } else if (filterAction === 'case-export') {
        actionMatch = entry.action === 'export' && entry.details.workflowPhase === 'case-export';
      } else if (filterAction === 'case-import') {
        actionMatch = entry.action === 'import' && entry.details.workflowPhase === 'case-import';
      } else if (filterAction === 'confirmation-export') {
        actionMatch = entry.action === 'export' && entry.details.workflowPhase === 'confirmation';
      } else if (filterAction === 'confirmation-import') {
        actionMatch = entry.action === 'import' && entry.details.workflowPhase === 'confirmation';
      } else {
        actionMatch = entry.action === filterAction;
      }

      const resultMatch = filterResult === 'all' || entry.result === filterResult;
      const entryBadgeId = entry.details.userProfileDetails?.badgeId?.trim().toLowerCase() || '';
      const reviewerBadgeId = isConfirmationImportEntry(entry)
        ? entry.details.reviewerBadgeId?.trim().toLowerCase() || ''
        : '';
      const badgeMatch =
        normalizedBadgeFilter === '' ||
        entryBadgeId.includes(normalizedBadgeFilter) ||
        reviewerBadgeId.includes(normalizedBadgeFilter);

      return actionMatch && resultMatch && badgeMatch;
    });
  }, [filterAction, filterResult, filterBadgeId]);

  const dateRangeDisplay = useMemo(() => {
    switch (dateRange) {
      case '90d':
        return 'Last 90 Days';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startFormatted = new Date(customStartDate).toLocaleDateString();
          const endFormatted = new Date(customEndDate).toLocaleDateString();
          return `${startFormatted} - ${endFormatted}`;
        }
        if (customStartDate) {
          return `From ${new Date(customStartDate).toLocaleDateString()}`;
        }
        if (customEndDate) {
          return `Until ${new Date(customEndDate).toLocaleDateString()}`;
        }
        return 'Custom Range';
      default:
        return `Last ${dateRange}`;
    }
  }, [dateRange, customStartDate, customEndDate]);

  const effectiveCaseNumber = useMemo(() => {
    const trimmedCaseNumber = filterCaseNumber.trim();
    return caseNumber || trimmedCaseNumber || undefined;
  }, [caseNumber, filterCaseNumber]);

  return {
    filterAction,
    setFilterAction,
    filterResult,
    setFilterResult,
    filterCaseNumber,
    caseNumberInput,
    setCaseNumberInput,
    filterBadgeId,
    badgeIdInput,
    setBadgeIdInput,
    dateRange,
    customStartDate,
    customEndDate,
    customStartDateInput,
    customEndDateInput,
    setCustomStartDateInput,
    setCustomEndDateInput,
    handleApplyCaseFilter,
    handleClearCaseFilter,
    handleApplyBadgeFilter,
    handleClearBadgeFilter,
    handleApplyCustomDateRange,
    handleClearCustomDateRange,
    handleDateRangeChange,
    getFilteredEntries,
    dateRangeDisplay,
    effectiveCaseNumber
  };
};