/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Sidebar } from './sidebar';
import type { User } from 'firebase/auth';
import { type FileData } from '~/types';
import styles from './sidebar.module.css';
import { getAppVersion } from '~/utils/common';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';

interface SidebarContainerProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  onOpenCase: () => void;
  imageId?: string;
  currentCase: string;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  onAnnotationRefresh?: () => void;
  isReadOnly?: boolean;
  isArchivedCase?: boolean;
  isConfirmed?: boolean;
  confirmationSaveVersion?: number;
  isUploading?: boolean;
  onUploadStatusChange?: (isUploading: boolean) => void;
}

export const SidebarContainer: React.FC<SidebarContainerProps> = (props) => {
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);
  const year = new Date().getFullYear();
  const appVersion = getAppVersion();

  const {
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen: isFooterModalOpen,
    onClose: () => setIsFooterModalOpen(false),
  });
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Sidebar */}
      <Sidebar {...props} />
      
      {/* Footer Section */}
      <div className={styles.footerSection}>
        <button 
          onClick={() => setIsFooterModalOpen(true)}
          className={styles.footerSectionButton}
        >
          About & Support
        </button>
      </div>

      {/* Footer Modal */}
      {isFooterModalOpen && (
        <div className={styles.footerModalOverlay} {...overlayProps} aria-label="Close About and Support dialog">
          <div className={styles.footerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.footerModalHeader}>
              <h2 className={styles.footerModalTitle}>About Striae</h2>
              <button
                className={styles.footerModalClose}
                {...getCloseButtonProps({ ariaLabel: 'Close About and Support dialog' })}
              >
                ×
              </button>
            </div>
            <div className={styles.footerModalContent}>
              <div className={styles.footerModalLinks}>                                
                <Link                   
                  to="https://striae.org/support" 
                  target="_blank"
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Need Help?
                </Link>
                <Link                   
                  to="https://striae.org/bugs" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerModalLink}>
                  Report a Bug
                </Link>
                <Link
                  to="https://striae.org/privacy"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Privacy Policy
                </Link>
                <Link
                  to="https://striae.org/terms"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Terms of Service
                </Link>
                <Link
                  to="https://striae.org/security"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Security Policy
                </Link>                
              </div>

              <div className={styles.footerModalCopyright}>
                <a href={`https://github.com/striae-org/striae/releases/tag/v${appVersion}`} className={styles.link} target="_blank" rel="noopener noreferrer">Striae v{appVersion}</a> © {year}.{' '}
                Licensed under Apache 2.0.
              </div>              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
