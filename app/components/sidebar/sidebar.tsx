import { User } from 'firebase/auth';
import { useState } from 'react';
import styles from './sidebar.module.css';
import { ManageProfile } from '../user/manage-profile';
import { SignOut } from '../actions/signout';
import { CaseSidebar } from './cases/case-sidebar';
import { NotesSidebar } from './notes/notes-sidebar';
import { CaseImport } from './case-import/case-import';
import { ChecksumUtility } from './checksum/checksum-utility';
import { FileData } from '~/types';
import { ImportResult, ConfirmationImportResult } from '~/types';

interface SidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  imageId?: string;
  onCaseChange: (caseNumber: string) => void;
  currentCase: string;
  setCurrentCase: (caseNumber: string) => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  caseNumber: string;
  setCaseNumber: (caseNumber: string) => void;
  error: string;
  setError: (error: string) => void;
  successAction: 'loaded' | 'created' | 'deleted' | null;
  setSuccessAction: (action: 'loaded' | 'created' | 'deleted' | null) => void;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  onAnnotationRefresh?: () => void;
  isReadOnly?: boolean;
  isConfirmed?: boolean;
}

export const Sidebar = ({ 
  user, 
  onImageSelect,
  imageId, 
  onCaseChange,
  currentCase,
  setCurrentCase,
  imageLoaded,
  setImageLoaded,
  files,
  setFiles,
  caseNumber,
  setCaseNumber,
  error,
  setError,
  successAction,
  setSuccessAction,
  showNotes,
  setShowNotes,
  onAnnotationRefresh,
  isReadOnly = false,
  isConfirmed = false
}: SidebarProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChecksumModalOpen, setIsChecksumModalOpen] = useState(false);

  const handleImportComplete = (result: ImportResult | ConfirmationImportResult) => {
    if (result.success) {
      // For case imports, load the imported case automatically
      if ('isReadOnly' in result) {
        // This is an ImportResult (case import)
        if (result.caseNumber && result.isReadOnly) {
          // Successful read-only case import - load the case
          onCaseChange(result.caseNumber);
          setCurrentCase(result.caseNumber);
          setCaseNumber(result.caseNumber);
          setSuccessAction('loaded');
        } else if (!result.caseNumber && !result.isReadOnly) {
          // Read-only case cleared - reset all UI state
          setCurrentCase('');
          setCaseNumber('');
          setFiles([]);
          onImageSelect({ id: 'clear', originalFilename: '/clear.jpg', uploadedAt: '' });
          setImageLoaded(false);
          onCaseChange(''); // This will trigger canvas/annotation state reset in main component
          setShowNotes(false); // Close notes sidebar
          setSuccessAction(null);
        }
      }
      // For confirmation imports, no action needed - the confirmations are already loaded
    }
  };  

  return (
    <div className={styles.sidebar}>
      <div className={styles.userInfo}>
        <h3 className={styles.userTitle}>
          {`${user.displayName?.split(' ')[0] || 'User'}'s Striae`}
        </h3>
        <div className={styles.userActions}>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className={styles.profileButton}
          >
            Manage Profile
          </button>
          <SignOut />
        </div>
      </div>  
      <ManageProfile 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <CaseImport 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
      <ChecksumUtility 
        isOpen={isChecksumModalOpen}
        onClose={() => setIsChecksumModalOpen(false)}
      />
      {showNotes ? (
        <NotesSidebar 
          currentCase={currentCase}
          onReturn={() => setShowNotes(false)}
          user={user}
          imageId={imageId || ''}
          onAnnotationRefresh={onAnnotationRefresh}
          originalFileName={files.find(file => file.id === imageId)?.originalFilename}
        />
      ) : (
        <>
          <CaseSidebar 
            user={user} 
            onImageSelect={onImageSelect}
            onCaseChange={onCaseChange}
            currentCase={currentCase}
            setCurrentCase={setCurrentCase}
            imageLoaded={imageLoaded}
            setImageLoaded={setImageLoaded}
            files={files}
            setFiles={setFiles}
            caseNumber={caseNumber}
            setCaseNumber={setCaseNumber}
            error={error}
            setError={setError}
            successAction={successAction}
            setSuccessAction={setSuccessAction}
            onNotesClick={() => setShowNotes(true)}
            isReadOnly={isReadOnly}
            isConfirmed={isConfirmed}
            selectedFileId={imageId}
          />
          <div className={styles.importSection}>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className={styles.importButton}
            >
              Import/Clear RO Case
            </button>
            <button 
              onClick={() => setIsChecksumModalOpen(true)}
              className={styles.checksumButton}
            >
              Checksum Utility
            </button>
          </div>
        </>
      )}
    </div>
  );
};