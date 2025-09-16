/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { Sidebar } from './sidebar';
import { User } from 'firebase/auth';
import { FileData } from '~/types';
import styles from './sidebar.module.css';
import { getAppVersion } from '../../utils/version';

interface SidebarContainerProps {
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

export const SidebarContainer: React.FC<SidebarContainerProps> = (props) => {
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);
  const year = new Date().getFullYear();
  const appVersion = getAppVersion();

  useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isFooterModalOpen) {
          setIsFooterModalOpen(false);
        }
      };

      if (isFooterModalOpen) {
        document.addEventListener('keydown', handleEscape);
      }
  
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isFooterModalOpen]);
  
  useEffect(() => {
    if (isFooterModalOpen && typeof window !== 'undefined') {      
      // No longer need to load external script since we're using direct links
    }
  }, [isFooterModalOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
        <div className={styles.footerModalOverlay} onClick={() => setIsFooterModalOpen(false)}>
          <div className={styles.footerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.footerModalHeader}>
              <h2 className={styles.footerModalTitle}>About Striae</h2>
              <button 
                onClick={() => setIsFooterModalOpen(false)}
                className={styles.footerModalClose}
              >
                ×
              </button>
            </div>
            <div className={styles.footerModalContent}>
              <div className={styles.footerModalLinks}>
                <a href="https://help.striae.org" target="_blank" rel="noopener noreferrer" className={styles.footerModalLink}>User&apos;s Guide</a>                
                <Link 
                  viewTransition
                  prefetch="intent"
                  to="/support" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Need Help?
                </Link>
                <Link 
                  viewTransition
                  prefetch="intent"
                  to="/bugs" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Report a Bug
                </Link>
                <Link 
                  viewTransition
                  prefetch="intent"
                  to="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Privacy Policy
                </Link>
                <Link 
                  viewTransition
                  prefetch="intent"
                  to="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Terms of Service
                </Link>
                <Link 
                  viewTransition
                  prefetch="intent"
                  to="/security" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.footerModalLink}>
                  Security Policy
                </Link>
              </div>
              <div className={styles.badgeContainer}>
                <div className={styles.openCollectiveWidget}>
                  <a 
                    href="https://opencollective.com/striae" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.openCollectiveLink}
                  >
                    <img 
                      src="/open-collective.svg" 
                      alt="Contribute to our Open Collective" 
                      className={styles.openCollectiveImage}
                    />
                  </a>
                </div>
                <div className={styles.oinBadge}>
                  <a
                    href="https://openinventionnetwork.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.oinBadgeLink}
                  >
                    <img 
                      src="/oin-badge.png" 
                      alt="Open Invention Network Community Member" 
                      className={styles.oinBadgeImage}
                    />
                  </a>
                </div>
              </div>
              <div className={styles.footerModalCopyright}>
                <a href="https://github.com/striae-org/striae/blob/master/LICENSE" className={styles.footerModalCopyrightLinklink} target="_blank" rel="noopener noreferrer">Striae {appVersion}</a> © {year}. All rights reserved.              
                <div className={styles.footerModalCopyrightLink}>
                Designed and developed by <a href="https://stephenjlu.com" target="_blank" rel="noopener noreferrer">Stephen J. Lu</a>
                </div>
              </div>              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
