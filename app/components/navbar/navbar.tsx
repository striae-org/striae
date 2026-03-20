import { useState } from 'react';
import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';
import { ManageProfile } from '../user/manage-profile';
import { CaseImport } from '../sidebar/case-import/case-import';
import { type ImportResult, type ConfirmationImportResult } from '~/types';

interface NavbarProps {
  isUploading?: boolean;
  company?: string;
  isReadOnly?: boolean;
  hasLoadedCase?: boolean;
  hasLoadedImage?: boolean;
  activeSection?: 'case-management' | 'file-management' | 'image-notes';
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
}

export const Navbar = ({
  isUploading = false,
  company,
  isReadOnly = false,
  hasLoadedCase = false,
  hasLoadedImage = false,
  activeSection = 'case-management',
  onImportComplete,
}: NavbarProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <>
      <header className={styles.navbar} aria-label="Canvas top navigation">
        <div className={styles.companyLabel}>
          {isReadOnly ? 'CASE REVIEW ONLY' : company}
        </div>
        <div className={styles.navCentral}>
          <button
            type="button"
            className={`${styles.navSectionButton} ${activeSection === 'case-management' ? styles.navSectionButtonActive : ''}`}
            aria-pressed={activeSection === 'case-management'}
          >
            Case Management
          </button>
          <button
            type="button"
            className={`${styles.navSectionButton} ${activeSection === 'file-management' ? styles.navSectionButtonActive : ''}`}
            disabled={!hasLoadedCase}
            aria-pressed={activeSection === 'file-management'}
            title={!hasLoadedCase ? 'Load a case to enable file management' : undefined}
          >
            File Management
          </button>
          <button
            type="button"
            className={`${styles.navSectionButton} ${activeSection === 'image-notes' ? styles.navSectionButtonActive : ''}`}
            disabled={!hasLoadedImage}
            aria-pressed={activeSection === 'image-notes'}
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
