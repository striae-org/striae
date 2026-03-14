import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '~/services/firebase';
import { useInactivityTimeout } from '~/hooks/useInactivityTimeout';
import { INACTIVITY_CONFIG } from '~/config/inactivity';
import { AuthContext } from '~/contexts/auth.context';
import { InactivityWarning } from '~/components/user/inactivity-warning';
import { auditService } from '~/services/audit';
import { generateUniqueId } from '~/utils/id-generator';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const { extendSession } = useInactivityTimeout({
    enabled: !!user,
    onWarning: () => {
      setRemainingSeconds(INACTIVITY_CONFIG.WARNING_MINUTES * 60);
      setShowInactivityWarning(true);
    },
    onTimeout: () => {
      setShowInactivityWarning(false);      
    }
  });

  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      setUser(user);      
      if (!user) {
        setShowInactivityWarning(false);
      }
    });
  }, []);

  const handleExtendSession = () => {
    setShowInactivityWarning(false);
    extendSession();
  };

  const handleSignOutNow = async () => {
    setShowInactivityWarning(false);
    
    // Log timeout logout audit before signing out
    if (user) {
      try {
        const sessionId = `session_${user.uid}_timeout_${Date.now()}_${generateUniqueId(8)}`;
        await auditService.logUserLogout(
          user,
          sessionId,
          INACTIVITY_CONFIG.TIMEOUT_MINUTES * 60, // sessionDuration in seconds
          'timeout'
        );
      } catch (auditError) {
        console.error('Failed to log timeout logout audit:', auditError);
        // Continue with logout even if audit logging fails
      }
    }
    
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
      <InactivityWarning
        isOpen={showInactivityWarning}
        remainingSeconds={remainingSeconds}
        onExtendSession={handleExtendSession}
        onSignOut={handleSignOutNow}
      />
    </AuthContext.Provider>
  );
}