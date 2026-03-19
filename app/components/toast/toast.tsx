import { useEffect, type ReactNode } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './toast.module.css';

interface ToastProps {
  message: ReactNode;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) => {
  const {
    requestClose,
    handleOverlayMouseDown,
    handleOverlayKeyDown
  } = useOverlayDismiss({
    isOpen: isVisible,
    onClose,
    closeOnEscape: false
  });

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        requestClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, requestClose, duration]);

  if (!isVisible) return null;

  return (
    <>
      <div 
        className={styles.backdrop} 
        onMouseDown={handleOverlayMouseDown}
        onKeyDown={handleOverlayKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Close notification"
      ></div>
      <div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.show : ''}`}>
        <div className={styles.icon}>
          {type === 'success' ? '✓' : type === 'warning' ? '!' : '✗'}
        </div>
        <span className={styles.message}>{message}</span>
        <button 
          className={styles.closeButton}
          onClick={requestClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </>
  );
};
