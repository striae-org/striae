import { User } from 'firebase/auth';
import { useState } from 'react';
import styles from './sidebar.module.css';
import { ManageProfile } from '../user/manage-profile';
import { SignOut } from '../actions/signout';
import { CaseSidebar } from './case-sidebar';
import { NotesSidebar } from './notes-sidebar';
import { FileData } from '~/types';

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
  onAnnotationRefresh
}: SidebarProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);  

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
      {showNotes ? (
        <NotesSidebar 
          currentCase={currentCase}
          onReturn={() => setShowNotes(false)}
          user={user}
          imageId={imageId || ''}
          onAnnotationRefresh={onAnnotationRefresh}
        />
      ) : (
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
        />
      )}
    </div>
  );
};