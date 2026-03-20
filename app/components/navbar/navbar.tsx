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
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
}

export const Navbar = ({ isUploading = false, company, isReadOnly = false, onImportComplete }: NavbarProps) => {
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
            onClick={() => setIsImportModalOpen(true)}
            className={styles.navTextButton}
            disabled={isUploading}
            title={isUploading ? 'Cannot import while uploading files' : undefined}
          >
            Import/Clear RO Case
          </button>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className={styles.navTextButton}
            disabled={isUploading}
            title={isUploading ? 'Cannot manage profile while uploading files' : undefined}
          >
            Manage Profile
          </button>
        </div>
        <div className={styles.navActions}>
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
