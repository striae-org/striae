import { useCallback, useEffect, type KeyboardEventHandler, type MouseEventHandler } from 'react';

interface UseOverlayDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  canDismiss?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

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
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, canDismiss, onClose]);

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

  return {
    requestClose,
    handleOverlayMouseDown,
    handleOverlayKeyDown
  };
};