import { useEffect, type ReactNode } from 'react';
import styles from './toast.module.css';

interface ToastProps {
  message: ReactNode;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClose();
    }
  };

  return (
    <>
      <div 
        className={styles.backdrop} 
        onClick={onClose}
        onKeyDown={handleBackdropKeyDown}
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
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </>
  );
};
