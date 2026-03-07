import { useEffect, useRef, useState } from 'react';
import styles from './notice.module.css';

interface NoticeContent {
  title: string;
  content: React.ReactNode;
  buttonText?: string;
}

interface NoticeProps {
  isOpen: boolean;
  onClose: () => void;
  notice: NoticeContent;
  modalClassName?: string;
  expanded?: boolean;
  hideConfirmButton?: boolean;
}

export function Notice({ isOpen, onClose, notice, modalClassName, expanded = false, hideConfirmButton = false }: NoticeProps) {
  const [isContentScrolling, setIsContentScrolling] = useState(false);
  const scrollEndTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
  
      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, []);

  const handleContentScroll = () => {
    setIsContentScrolling(true);

    if (scrollEndTimeoutRef.current !== null) {
      window.clearTimeout(scrollEndTimeoutRef.current);
    }

    scrollEndTimeoutRef.current = window.setTimeout(() => {
      setIsContentScrolling(false);
      scrollEndTimeoutRef.current = null;
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
      tabIndex={-1}
    >
      <div 
        className={`${styles.modal} ${expanded ? styles.expandedModal : ''} ${modalClassName || ''}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
      >
        <div className={styles.header}>
          <h2 id="notice-title">{notice.title}</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div
          className={`${styles.content} ${isContentScrolling ? styles.contentScrolling : ''}`.trim()}
          onScroll={handleContentScroll}
        >
          {notice.content}
        </div>
        {!hideConfirmButton && (
          <button className={styles.confirmButton} onClick={onClose}>
            {notice.buttonText || 'Got it!'}
          </button>
        )}
      </div>    
    </div>
  );
}