import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '~/services/firebase';
import { INACTIVITY_CONFIG } from '~/config/inactivity';

interface UseInactivityTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
  enabled?: boolean;
}

export const useInactivityTimeout = ({
  timeoutMinutes = INACTIVITY_CONFIG.TIMEOUT_MINUTES,
  warningMinutes = INACTIVITY_CONFIG.WARNING_MINUTES,
  onWarning,
  onTimeout,
  enabled = true
}: UseInactivityTimeoutOptions = {}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(0);

  const shouldEnable = enabled;

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      onTimeout?.();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [onTimeout]);

  const handleWarning = useCallback(() => {
    onWarning?.();
  }, [onWarning]);

  const resetTimer = useCallback(() => {
    if (!shouldEnable) return;

    lastActivityRef.current = Date.now();
    clearTimeouts();

    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    if (warningMs > 0) {
      warningTimeoutRef.current = setTimeout(handleWarning, warningMs);
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(handleSignOut, timeoutMs);
  }, [shouldEnable, timeoutMinutes, warningMinutes, handleWarning, handleSignOut, clearTimeouts]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const getRemainingTime = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = (timeoutMinutes * 60 * 1000) - elapsed;
    return Math.max(0, Math.floor(remaining / 1000));
  }, [timeoutMinutes]);

  useEffect(() => {
    if (!shouldEnable) {
      clearTimeouts();
      return;
    }

    const activities = INACTIVITY_CONFIG.TRACKED_ACTIVITIES;

    const handleActivity = () => {
      resetTimer();
    };

    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, true);
    });

    resetTimer();

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity, true);
      });
      clearTimeouts();
    };
  }, [shouldEnable, resetTimer, clearTimeouts]);

  return {
    extendSession,
    getRemainingTime,
    clearTimeouts
  };
};
