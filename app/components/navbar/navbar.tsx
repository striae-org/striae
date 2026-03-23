import { useEffect, useRef, useState, useContext } from 'react';
import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';
import { ManageProfile } from '../user/manage-profile';
import { CaseImport } from '../sidebar/case-import/case-import';
import { PublicSigningKeyModal } from '~/components/public-signing-key-modal/public-signing-key-modal';
import { getCurrentPublicSigningKeyDetails } from '~/utils/forensics';
import { AuthContext } from '~/contexts/auth.context';
import { getUserData } from '~/utils/data';
import { type ImportResult, type ConfirmationImportResult } from '~/types';

interface NavbarProps {
  isUploading?: boolean;
  company?: string;
  isReadOnly?: boolean;
  isReviewOnlyCase?: boolean;
  currentCase?: string;
  currentFileName?: string;
  isCurrentImageConfirmed?: boolean;
  hasLoadedCase?: boolean;
  hasLoadedImage?: boolean;
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
  onOpenCase?: () => void;
  onOpenListAllCases?: () => void;
  onOpenCaseExport?: () => void;
  onOpenAuditTrail?: () => void;
  onOpenRenameCase?: () => void;
  onDeleteCase?: () => void;
  onArchiveCase?: () => void;
  onClearROCase?: () => void;
  onOpenViewAllFiles?: () => void;
  onDeleteCurrentFile?: () => void;
  onOpenImageNotes?: () => void;
  archiveDetails?: {
    archived: boolean;
    archivedAt?: string;
    archivedBy?: string;
    archivedByDisplay?: string;
    archiveReason?: string;
  };
}

export const Navbar = ({
  isUploading = false,
  company,
  isReadOnly = false,
  isReviewOnlyCase = false,
  currentCase,
  currentFileName,
  isCurrentImageConfirmed = false,
  hasLoadedCase = false,
  hasLoadedImage = false,
  onImportComplete,
  onOpenCase,
  onOpenListAllCases,
  onOpenCaseExport,
  onOpenAuditTrail,
  onOpenRenameCase,
  onDeleteCase,
  onArchiveCase,
  onClearROCase,
  onOpenViewAllFiles,
  onDeleteCurrentFile,
  onOpenImageNotes,
  archiveDetails,
}: NavbarProps) => {
  const { user } = useContext(AuthContext);
  const [userBadgeId, setUserBadgeId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPublicKeyModalOpen, setIsPublicKeyModalOpen] = useState(false);
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const { keyId: publicSigningKeyId, publicKeyPem } = getCurrentPublicSigningKeyDetails();
  const caseMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUserBadgeId = async () => {
      if (user) {
        try {
          const userData = await getUserData(user);
          if (userData?.badgeId) {
            setUserBadgeId(userData.badgeId);
          }
        } catch (err) {
          console.error('Failed to load user badge ID:', err);
        }
      }
    };

    loadUserBadgeId();
  }, [user]);

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
  const disableLongRunningCaseActions = isUploading;
  const isCaseManagementActive = true;
  const isFileManagementActive = isFileMenuOpen || hasLoadedImage;
  const canOpenImageNotes = hasLoadedImage && !isCurrentImageConfirmed && !isReadOnly;
  const isImageNotesActive = canOpenImageNotes;
  const canDeleteCurrentFile = hasLoadedImage && !isReadOnly;
  const isArchivedRegularReadOnly = Boolean(isReadOnly && archiveDetails?.archived && !isReviewOnlyCase);

  return (
    <>
      <header className={styles.navbar} aria-label="Canvas top navigation">
        <div className={styles.companyLabelContainer}>
          <div className={styles.companyLabel}>
            {isReviewOnlyCase ? 'CASE REVIEW ONLY' : `${company}${user?.displayName ? ` | ${user.displayName}` : ''}${userBadgeId ? `, ${userBadgeId}` : ''}`}
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
              title={isUploading ? 'Some case actions are unavailable while files are uploading' : undefined}
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
                  disabled={isReviewOnlyCase}
                  title={isReviewOnlyCase ? 'Clear the read-only case first to open or switch cases' : undefined}
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
                  disabled={isReviewOnlyCase}
                  title={isReviewOnlyCase ? 'Clear the read-only case first to list all cases' : undefined}
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
                  disabled={!hasLoadedCase || disableLongRunningCaseActions || isArchivedRegularReadOnly}
                  title={
                    isArchivedRegularReadOnly
                      ? 'Export is unavailable for archived cases loaded from your regular case list'
                      : !hasLoadedCase
                      ? 'Load a case to export case data'
                      : disableLongRunningCaseActions
                        ? 'Export is unavailable while files are uploading'
                        : undefined
                  }
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
                <div className={styles.caseMenuSectionLabel}>Maintenance</div>
                {isReviewOnlyCase && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.caseMenuItem} ${styles.caseMenuItemClearRO}`}
                    disabled={!hasLoadedCase}
                    title={!hasLoadedCase ? 'No read-only case is loaded' : undefined}
                    onClick={() => {
                      onClearROCase?.();
                      setIsCaseMenuOpen(false);
                    }}
                  >
                    Clear RO Case
                  </button>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.caseMenuItem} ${styles.caseMenuItemRename}`}
                    disabled={!hasLoadedCase || disableLongRunningCaseActions}
                    title={
                      !hasLoadedCase
                        ? 'Load a case to rename it'
                        : disableLongRunningCaseActions
                          ? 'Rename is unavailable while files are uploading'
                          : undefined
                    }
                    onClick={() => {
                      onOpenRenameCase?.();
                      setIsCaseMenuOpen(false);
                    }}
                  >
                    Rename Case
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.caseMenuItem} ${styles.caseMenuItemDelete}`}
                  disabled={!hasLoadedCase || disableLongRunningCaseActions || isReviewOnlyCase}
                  title={
                    isReviewOnlyCase
                      ? 'Clear the read-only case first before deleting'
                      : !hasLoadedCase
                        ? 'Load a case to delete it'
                        : disableLongRunningCaseActions
                          ? 'Delete is unavailable while files are uploading'
                          : undefined
                  }
                  onClick={() => {
                    onDeleteCase?.();
                    setIsCaseMenuOpen(false);
                  }}
                >
                  Delete Case
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.caseMenuItem} ${styles.caseMenuItemArchive}`}
                    disabled={!hasLoadedCase || disableLongRunningCaseActions}
                    title={
                      !hasLoadedCase
                        ? 'Load a case to archive it'
                        : disableLongRunningCaseActions
                          ? 'Archive is unavailable while files are uploading'
                          : undefined
                    }
                    onClick={() => {
                      onArchiveCase?.();
                      setIsCaseMenuOpen(false);
                    }}
                  >
                    Archive Case
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
                {archiveDetails?.archived && (
                  <div className={styles.caseArchiveDetails}>
                    <strong>Archived Case</strong>
                    <span>Archived At: {archiveDetails.archivedAt ? new Date(archiveDetails.archivedAt).toLocaleString() : 'Unknown'}</span>
                    <span>
                      Archived By (Name, ID): {archiveDetails.archivedByDisplay || archiveDetails.archivedBy || 'Unknown'}
                      {archiveDetails.archivedByDisplay && archiveDetails.archivedBy ? ` (${archiveDetails.archivedBy})` : ''}
                    </span>
                    <span>Reason: {archiveDetails.archiveReason || 'Not provided'}</span>
                  </div>
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
            title={
              !hasLoadedImage
                ? 'Load an image to enable image notes'
                : isCurrentImageConfirmed
                  ? 'Confirmed images are read-only and viewable via toolbar only'
                  : isReadOnly
                    ? 'Image notes are disabled for read-only cases'
                    : undefined
            }
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
            Import Case/Confirmations
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
