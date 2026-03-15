import { isValidElement, useEffect, useRef, type ReactNode } from 'react';
import styles from './toast.module.css';

interface ToastProps {
  message: ReactNode;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const TOAST_NOTIFICATION_TITLES: Record<ToastProps['type'], string> = {
  success: 'Striae Notification',
  warning: 'Striae Warning',
  error: 'Striae Alert'
};

const getDesktopNotificationMessage = (message: ReactNode): string => {
  if (typeof message === 'string' || typeof message === 'number') {
    return String(message);
  }

  if (Array.isArray(message)) {
    const joinedMessage = message
      .map((item) => getDesktopNotificationMessage(item))
      .filter(Boolean)
      .join(' ')
      .trim();

    return joinedMessage;
  }

  if (isValidElement<{ children?: ReactNode }>(message) && message.props.children) {
    return getDesktopNotificationMessage(message.props.children);
  }

  return 'You have a new alert notification in Striae.';
};

export const Toast = ({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) => {
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  useEffect(() => {
    const isNewToast = isVisible && !wasVisibleRef.current;

    if (isNewToast && typeof window !== 'undefined' && 'Notification' in window) {
      const desktopMessage = getDesktopNotificationMessage(message);
      const notificationTitle = TOAST_NOTIFICATION_TITLES[type];

      const showDesktopNotification = () => {
        const notification = new Notification(notificationTitle, {
          body: desktopMessage,
          tag: `striae-${type}-toast`
        });

        setTimeout(() => notification.close(), 8000);
      };

      if (Notification.permission === 'granted') {
        showDesktopNotification();
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission()
          .then((permission) => {
            if (permission === 'granted') {
              showDesktopNotification();
            }
          })
          .catch((error) => {
            console.error('Failed to request desktop notification permission:', error);
          });
      }
    }

    wasVisibleRef.current = isVisible;
  }, [isVisible, message, type]);

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
