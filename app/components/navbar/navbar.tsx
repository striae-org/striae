import { useEffect, useRef, useState } from 'react';
import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';
import { ManageProfile } from '../user/manage-profile';
import { CaseImport } from '../sidebar/case-import/case-import';
import { type ImportResult, type ConfirmationImportResult } from '~/types';

interface NavbarProps {
  isUploading?: boolean;
  company?: string;
  isReadOnly?: boolean;
  currentCase?: string;
  hasLoadedCase?: boolean;
  hasLoadedImage?: boolean;
  activeSection?: 'case-management' | 'file-management' | 'image-notes';
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
  onOpenCase?: () => void;
  onOpenListAllCases?: () => void;
  onOpenCaseExport?: () => void;
  onOpenAuditTrail?: () => void;
  onOpenRenameCase?: () => void;
  onDeleteCase?: () => void;
}

export const Navbar = ({
  isUploading = false,
  company,
  isReadOnly = false,
  currentCase,
  hasLoadedCase = false,
  hasLoadedImage = false,
  activeSection = 'case-management',
  onImportComplete,
  onOpenCase,
  onOpenListAllCases,
  onOpenCaseExport,
  onOpenAuditTrail,
  onOpenRenameCase,
  onDeleteCase,
}: NavbarProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const caseMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCaseMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!caseMenuRef.current?.contains(event.target as Node)) {
        setIsCaseMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isCaseMenuOpen]);

  const caseActionsDisabled = false;
  const isCaseManagementActive = true;
  const isFileManagementActive = hasLoadedCase && activeSection === 'file-management';
  const isImageNotesActive = hasLoadedImage && activeSection === 'image-notes';

  return (
    <>
      <header className={styles.navbar} aria-label="Canvas top navigation">
        <div className={styles.companyLabel}>
          {isReadOnly ? 'CASE REVIEW ONLY' : company}
        </div>
        <div className={styles.navCentral}>
          <div className={styles.caseMenuContainer} ref={caseMenuRef}>
            <button
              type="button"
              className={`${styles.navSectionButton} ${isCaseManagementActive ? styles.navSectionButtonActive : ''}`}
              aria-pressed={isCaseManagementActive}
              aria-expanded={isCaseMenuOpen}
              aria-haspopup="menu"
              disabled={caseActionsDisabled}
              onClick={() => setIsCaseMenuOpen((prev) => !prev)}
              title={isUploading ? 'Cannot access case actions while uploading' : undefined}
            >
              Case Management
            </button>
            {isCaseMenuOpen && (
              <div className={styles.caseMenu} role="menu" aria-label="Case Management actions">
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemOpen}`}
                  onClick={() => {
                    onOpenCase?.();
                    setIsCaseMenuOpen(false);
                  }}
                >
                  Open Case
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemList}`}
                  onClick={() => {
                    onOpenListAllCases?.();
                    setIsCaseMenuOpen(false);
                  }}
                >
                  List All Cases
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemExport}`}
                  disabled={!hasLoadedCase}
                  title={!hasLoadedCase ? 'Load a case to export case data' : undefined}
                  onClick={() => {
                    onOpenCaseExport?.();
                    setIsCaseMenuOpen(false);
                  }}
                >
                  Export Case Data
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemAudit}`}
                  disabled={!hasLoadedCase}
                  title={!hasLoadedCase ? 'Load a case to view audit trail' : undefined}
                  onClick={() => {
                    onOpenAuditTrail?.();
                    setIsCaseMenuOpen(false);
                  }}
                >
                  Case Audit Trail
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.caseMenuItem} ${styles.caseMenuItemRename}`}
                    disabled={!hasLoadedCase}
                    title={!hasLoadedCase ? 'Load a case to rename it' : undefined}
                    onClick={() => {
                      onOpenRenameCase?.();
                      setIsCaseMenuOpen(false);
                    }}
                  >
                    Rename Case
                  </button>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.caseMenuItem} ${styles.caseMenuItemDelete}`}
                    disabled={!hasLoadedCase}
                    title={!hasLoadedCase ? 'Load a case to delete it' : undefined}
                    onClick={() => {
                      onDeleteCase?.();
                      setIsCaseMenuOpen(false);
                    }}
                  >
                    Delete Case
                  </button>
                )}
                {currentCase && (
                  <div className={styles.caseMenuCaption}>Case: {currentCase}</div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${styles.navSectionButton} ${isFileManagementActive ? styles.navSectionButtonActive : ''}`}
            disabled={!hasLoadedCase}
            aria-pressed={isFileManagementActive}
            title={!hasLoadedCase ? 'Load a case to enable file management' : undefined}
          >
            File Management
          </button>
          <button
            type="button"
            className={`${styles.navSectionButton} ${isImageNotesActive ? styles.navSectionButtonActive : ''}`}
            disabled={!hasLoadedImage}
            aria-pressed={isImageNotesActive}
            title={!hasLoadedImage ? 'Load an image to enable image notes' : undefined}
          >
            Image Notes
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className={`${styles.navSectionButton} ${styles.navPrimaryButton}`}
            disabled={isUploading}
            title={isUploading ? 'Cannot import while uploading files' : undefined}
          >
            Import/Clear RO Case
          </button>
        </div>
        <div className={styles.navActions}>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className={styles.navTextButton}
            disabled={isUploading}
            title={isUploading ? 'Cannot manage profile while uploading files' : undefined}
          >
            Manage Profile
          </button>
          <SignOut disabled={isUploading} />
        </div>
      </header>
      <CaseImport
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={onImportComplete}
      />
      <ManageProfile
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
