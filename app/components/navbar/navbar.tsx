import { useEffect, useRef, useState, useContext } from 'react';
import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';
import { ManageProfile } from '../user/manage-profile';
import { CaseImport } from '../sidebar/case-import/case-import';
import { PublicSigningKeyModal } from '~/components/public-signing-key-modal/public-signing-key-modal';
import { getCurrentPublicSigningKeyDetails } from '~/utils/forensics';
import { AuthContext } from '~/contexts/auth.context';
import { type ImportResult, type ConfirmationImportResult } from '~/types';

interface NavbarProps {
  isUploading?: boolean;
  company?: string;
  isReadOnly?: boolean;
  currentCase?: string;
  currentFileName?: string;
  isCurrentImageConfirmed?: boolean;
  hasLoadedCase?: boolean;
  hasLoadedImage?: boolean;
  userBadgeId?: string;
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
  onOpenCase?: () => void;
  onOpenListAllCases?: () => void;
  onOpenCaseExport?: () => void;
  onOpenAuditTrail?: () => void;
  onOpenRenameCase?: () => void;
  onDeleteCase?: () => void;
  onOpenViewAllFiles?: () => void;
  onDeleteCurrentFile?: () => void;
  onOpenImageNotes?: () => void;
}

export const Navbar = ({
  isUploading = false,
  company,
  isReadOnly = false,
  currentCase,
  currentFileName,
  isCurrentImageConfirmed = false,
  hasLoadedCase = false,
  hasLoadedImage = false,
  userBadgeId,
  onImportComplete,
  onOpenCase,
  onOpenListAllCases,
  onOpenCaseExport,
  onOpenAuditTrail,
  onOpenRenameCase,
  onDeleteCase,
  onOpenViewAllFiles,
  onDeleteCurrentFile,
  onOpenImageNotes,
}: NavbarProps) => {
  const { user } = useContext(AuthContext);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPublicKeyModalOpen, setIsPublicKeyModalOpen] = useState(false);
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const { keyId: publicSigningKeyId, publicKeyPem } = getCurrentPublicSigningKeyDetails();
  const caseMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCaseMenuOpen && !isFileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedOutsideCaseMenu = !caseMenuRef.current?.contains(targetNode);
      const clickedOutsideFileMenu = !fileMenuRef.current?.contains(targetNode);

      if (clickedOutsideCaseMenu) {
        setIsCaseMenuOpen(false);
      }

      if (clickedOutsideFileMenu) {
        setIsFileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isCaseMenuOpen, isFileMenuOpen]);

  const caseActionsDisabled = false;
  const isCaseManagementActive = true;
  const isFileManagementActive = isFileMenuOpen || hasLoadedImage;
  const canOpenImageNotes = hasLoadedImage && !isCurrentImageConfirmed;
  const isImageNotesActive = canOpenImageNotes;
  const canDeleteCurrentFile = hasLoadedImage && !isReadOnly;

  return (
    <>
      <header className={styles.navbar} aria-label="Canvas top navigation">
        <div className={styles.companyLabelContainer}>
          <div className={styles.companyLabel}>
            {isReadOnly ? 'CASE REVIEW ONLY' : `${company}${user?.displayName ? ` | ${user.displayName}` : ''}${userBadgeId ? `, ${userBadgeId}` : ''}`}
          </div>
        </div>
        <div className={styles.navCenterTrack}>
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
                <div className={styles.caseMenuSectionLabel}>Case Access</div>
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
                <div className={styles.caseMenuSectionLabel}>Case Operations</div>
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
                  <div className={styles.caseMenuSectionLabel}>Maintenance</div>
                )}
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
                <div className={styles.caseMenuSectionLabel}>Verification</div>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemKey}`}
                  onClick={() => {
                    setIsPublicKeyModalOpen(true);
                    setIsCaseMenuOpen(false);
                  }}
                >
                  Verify Exports
                </button>
                {currentCase && (
                  <div className={styles.caseMenuCaption}>Case: {currentCase}</div>
                )}
              </div>
            )}
          </div>
          <div className={styles.fileMenuContainer} ref={fileMenuRef}>
            <button
              type="button"
              className={`${styles.navSectionButton} ${isFileManagementActive ? styles.navSectionButtonActive : ''}`}
              disabled={!hasLoadedCase}
              aria-pressed={isFileManagementActive}
              aria-expanded={isFileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsFileMenuOpen((prev) => !prev)}
              title={!hasLoadedCase ? 'Load a case to enable file management' : undefined}
            >
              File Management
            </button>
            {isFileMenuOpen && (
              <div className={styles.fileMenu} role="menu" aria-label="File Management actions">
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.fileMenuItem} ${styles.fileMenuItemViewAll}`}
                  onClick={() => {
                    onOpenViewAllFiles?.();
                    setIsFileMenuOpen(false);
                  }}
                >
                  View All Files
                </button>
                <div className={styles.fileMenuSectionLabel}>Selected File</div>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.fileMenuItem} ${styles.fileMenuItemDelete}`}
                  disabled={!canDeleteCurrentFile}
                  title={!hasLoadedImage ? 'Load an image to delete the selected file' : isReadOnly ? 'Cannot delete files for read-only cases' : undefined}
                  onClick={() => {
                    onDeleteCurrentFile?.();
                    setIsFileMenuOpen(false);
                  }}
                >
                  Delete File
                </button>
                <div
                  className={styles.fileMenuCaption}
                  title={hasLoadedImage && currentFileName ? currentFileName : 'No file loaded'}
                >
                  File: {hasLoadedImage && currentFileName ? currentFileName : 'No file loaded'}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${styles.navSectionButton} ${isImageNotesActive ? styles.navSectionButtonActive : ''}`}
            disabled={!canOpenImageNotes}
            aria-pressed={isImageNotesActive}
            title={!hasLoadedImage ? 'Load an image to enable image notes' : isCurrentImageConfirmed ? 'Confirmed images are read-only and viewable via toolbar only' : undefined}
            onClick={() => {
              onOpenImageNotes?.();
            }}
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
      <PublicSigningKeyModal
        isOpen={isPublicKeyModalOpen}
        onClose={() => setIsPublicKeyModalOpen(false)}
        publicSigningKeyId={publicSigningKeyId}
        publicKeyPem={publicKeyPem}
      />
    </>
  );
};
