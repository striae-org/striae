import { useCallback, useEffect, type CSSProperties, type KeyboardEventHandler, type MouseEventHandler } from 'react';

interface UseOverlayDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  canDismiss?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

interface CloseButtonOptions {
  ariaLabel?: string;
  title?: string;
}

const sharedCloseButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '0.6rem',
  right: '0.6rem',
  width: '1.9rem',
  height: '1.9rem',
  borderRadius: '999px',
  border: '1px solid #d6dce2',
  background: '#f8f9fa',
  color: '#495057',
  fontSize: '1.2rem',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 1,
};

export const useOverlayDismiss = ({
  isOpen,
  onClose,
  canDismiss = true,
  closeOnEscape = true,
  closeOnBackdrop = true
}: UseOverlayDismissOptions) => {
  const requestClose = useCallback(() => {
    if (!canDismiss) {
      return;
    }

    onClose();
  }, [canDismiss, onClose]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape || !canDismiss) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, canDismiss, requestClose]);

  const handleOverlayMouseDown = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    if (!closeOnBackdrop || event.target !== event.currentTarget) {
      return;
    }

    requestClose();
  }, [closeOnBackdrop, requestClose]);

  const handleOverlayKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>((event) => {
    if (!closeOnBackdrop || event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      requestClose();
    }
  }, [closeOnBackdrop, requestClose]);

  const overlayProps = {
    role: 'button' as const,
    tabIndex: 0,
    onMouseDown: handleOverlayMouseDown,
    onKeyDown: handleOverlayKeyDown,
    style: { cursor: 'default' as const },
  };

  const getCloseButtonProps = useCallback((options?: CloseButtonOptions) => {
    const ariaLabel = options?.ariaLabel || 'Close modal';

    return {
      type: 'button' as const,
      onClick: requestClose,
      disabled: !canDismiss,
      'aria-label': ariaLabel,
      title: options?.title || ariaLabel,
      style: sharedCloseButtonStyle,
    };
  }, [requestClose, canDismiss]);

  return {
    requestClose,
    handleOverlayMouseDown,
    handleOverlayKeyDown,
    overlayProps,
    getCloseButtonProps,
  };
};