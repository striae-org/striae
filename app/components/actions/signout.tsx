import { auth } from '~/services/firebase';
import { auditService } from '~/services/audit';
import { generateUniqueId } from '~/utils/common';
import styles from './signout.module.css';

interface SignOutProps {
  redirectTo?: string;
  disabled?: boolean;
}

export const SignOut = ({ redirectTo = '/', disabled = false }: SignOutProps) => {    
  const handleSignOut = async () => {
    try {
      const user = auth.currentUser;
      
      // Log logout audit before signing out
      if (user) {
        try {
          const sessionId = `session_${user.uid}_logout_${Date.now()}_${generateUniqueId(8)}`;
          await auditService.logUserLogout(
            user,
            sessionId,
            0, // sessionDuration - we don't track session start time here
            'user-initiated'
          );
        } catch (auditError) {
          console.error('Failed to log user logout audit:', auditError);
          // Continue with logout even if audit logging fails
        }
      }
      
      await auth.signOut();
      localStorage.clear();
      window.location.href = redirectTo;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <button 
      onClick={handleSignOut} 
      className={styles.signOutButton}
      disabled={disabled}
      title={disabled ? "Cannot sign out while uploading files" : undefined}
    >
      Sign Out
    </button>
  );
};