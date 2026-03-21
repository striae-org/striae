import type { AuditAction, AuditResult } from '~/types';
import type { DateRangeFilter } from './types';
import styles from '../user-audit.module.css';

interface AuditFiltersPanelProps {
  dateRange: DateRangeFilter;
  customStartDate: string;
  customEndDate: string;
  customStartDateInput: string;
  customEndDateInput: string;
  caseNumber?: string;
  filterCaseNumber: string;
  caseNumberInput: string;
  filterBadgeId: string;
  badgeIdInput: string;
  filterAction: AuditAction | 'all';
  filterResult: AuditResult | 'all';
  onDateRangeChange: (value: DateRangeFilter) => void;
  onCustomStartDateInputChange: (value: string) => void;
  onCustomEndDateInputChange: (value: string) => void;
  onApplyCustomDateRange: () => void;
  onClearCustomDateRange: () => void;
  onCaseNumberInputChange: (value: string) => void;
  onApplyCaseFilter: () => void;
  onClearCaseFilter: () => void;
  onBadgeIdInputChange: (value: string) => void;
  onApplyBadgeFilter: () => void;
  onClearBadgeFilter: () => void;
  onFilterActionChange: (value: AuditAction | 'all') => void;
  onFilterResultChange: (value: AuditResult | 'all') => void;
}

export const AuditFiltersPanel = ({
  dateRange,
  customStartDate,
  customEndDate,
  customStartDateInput,
  customEndDateInput,
  caseNumber,
  filterCaseNumber,
  caseNumberInput,
  filterBadgeId,
  badgeIdInput,
  filterAction,
  filterResult,
  onDateRangeChange,
  onCustomStartDateInputChange,
  onCustomEndDateInputChange,
  onApplyCustomDateRange,
  onClearCustomDateRange,
  onCaseNumberInputChange,
  onApplyCaseFilter,
  onClearCaseFilter,
  onBadgeIdInputChange,
  onApplyBadgeFilter,
  onClearBadgeFilter,
  onFilterActionChange,
  onFilterResultChange,
}: AuditFiltersPanelProps) => {
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="dateRange">Time Period:</label>
        <select
          id="dateRange"
          value={dateRange}
          onChange={(e) => {
            onDateRangeChange(e.target.value as DateRangeFilter);
          }}
          className={styles.filterSelect}
        >
          <option value="1d">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {dateRange === 'custom' && (
        <div className={styles.customDateRange}>
          <div className={styles.customDateInputs}>
            <div className={styles.filterGroup}>
              <label htmlFor="startDate">Start Date:</label>
              <input
                type="date"
                id="startDate"
                value={customStartDateInput}
                onChange={(e) => onCustomStartDateInputChange(e.target.value)}
                className={styles.filterInput}
                max={customEndDateInput || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="endDate">End Date:</label>
              <input
                type="date"
                id="endDate"
                value={customEndDateInput}
                onChange={(e) => onCustomEndDateInputChange(e.target.value)}
                className={styles.filterInput}
                min={customStartDateInput}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.dateRangeButtons}>
              {(customStartDateInput || customEndDateInput) && (
                <button
                  type="button"
                  onClick={onApplyCustomDateRange}
                  className={styles.filterButton}
                  title="Apply custom date range"
                >
                  Apply Dates
                </button>
              )}
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={onClearCustomDateRange}
                  className={styles.clearButton}
                  title="Clear custom date range"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
          {(customStartDate || customEndDate) && (
            <div className={styles.activeFilter}>
              <small>
                Custom range:
                {customStartDate && <strong> from {new Date(customStartDate).toLocaleDateString()}</strong>}
                {customEndDate && <strong> to {new Date(customEndDate).toLocaleDateString()}</strong>}
              </small>
            </div>
          )}
        </div>
      )}

      <div className={styles.filterGroup}>
        <label htmlFor="caseFilter">Case Number:</label>
        <div className={styles.inputWithButton}>
          <input
            type="text"
            id="caseFilter"
            value={caseNumberInput}
            onChange={(e) => onCaseNumberInputChange(e.target.value)}
            className={styles.filterInput}
            placeholder="Enter case number..."
            disabled={!!caseNumber}
            title={
              caseNumber
                ? 'Case filter disabled - viewing specific case'
                : 'Enter complete case number and click Filter'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && caseNumberInput.trim() && !caseNumber) {
                onApplyCaseFilter();
              }
            }}
          />
          {!caseNumber && (
            <div className={styles.caseFilterButtons}>
              {caseNumberInput.trim() && (
                <button
                  type="button"
                  onClick={onApplyCaseFilter}
                  className={styles.filterButton}
                  title="Apply case filter"
                >
                  Filter
                </button>
              )}
              {filterCaseNumber && (
                <button
                  type="button"
                  onClick={onClearCaseFilter}
                  className={styles.clearButton}
                  title="Clear case filter"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
        {filterCaseNumber && !caseNumber && (
          <div className={styles.activeFilter}>
            <small>
              Filtering by case: <strong>{filterCaseNumber}</strong>
            </small>
          </div>
        )}
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="badgeFilter">Badge/ID #:</label>
        <div className={styles.inputWithButton}>
          <input
            type="text"
            id="badgeFilter"
            value={badgeIdInput}
            onChange={(e) => onBadgeIdInputChange(e.target.value)}
            className={styles.filterInput}
            placeholder="Enter badge/id #..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && badgeIdInput.trim()) {
                onApplyBadgeFilter();
              }
            }}
          />
          <div className={styles.caseFilterButtons}>
            {badgeIdInput.trim() && (
              <button
                type="button"
                onClick={onApplyBadgeFilter}
                className={styles.filterButton}
                title="Apply badge filter"
              >
                Filter
              </button>
            )}
            {filterBadgeId && (
              <button
                type="button"
                onClick={onClearBadgeFilter}
                className={styles.clearButton}
                title="Clear badge filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {filterBadgeId && (
          <div className={styles.activeFilter}>
            <small>
              Filtering by Badge/ID: <strong>{filterBadgeId}</strong>
            </small>
          </div>
        )}
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="actionFilter">Activity Type:</label>
        <select
          id="actionFilter"
          value={filterAction}
          onChange={(e) => onFilterActionChange(e.target.value as AuditAction | 'all')}
          className={styles.filterSelect}
        >
          <option value="all">All Activities</option>
          <optgroup label="User Sessions">
            <option value="user-login">Login</option>
            <option value="user-logout">Logout</option>
          </optgroup>
          <optgroup label="Case Management">
            <option value="case-create">Case Create</option>
            <option value="case-rename">Case Rename</option>
            <option value="case-delete">Case Delete</option>
            <option value="case-archive">Case Archive</option>
            <option value="case-export">Case Export</option>
            <option value="case-import">Case Import</option>
          </optgroup>
          <optgroup label="File Operations">
            <option value="file-upload">File Upload</option>
            <option value="file-access">File Access</option>
            <option value="file-delete">File Delete</option>
          </optgroup>
          <optgroup label="Annotations">
            <option value="annotation-create">Annotation Create</option>
            <option value="annotation-edit">Annotation Edit</option>
            <option value="annotation-delete">Annotation Delete</option>
          </optgroup>
          <optgroup label="Confirmation Activity">
            <option value="confirmation-create">Confirmation Create</option>
            <option value="confirmation-export">Confirmation Export</option>
            <option value="confirmation-import">Confirmation Import</option>
          </optgroup>
          <optgroup label="Documents">
            <option value="pdf-generate">PDF Generate</option>
          </optgroup>
          <optgroup label="Security">
            <option value="security-violation">Security Violation</option>
          </optgroup>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="resultFilter">Result:</label>
        <select
          id="resultFilter"
          value={filterResult}
          onChange={(e) => onFilterResultChange(e.target.value as AuditResult | 'all')}
          className={styles.filterSelect}
        >
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
    </div>
  );
};
