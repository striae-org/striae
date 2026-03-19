import type { User } from 'firebase/auth';
import type { UserData } from '~/types';
import styles from '../user-audit.module.css';

interface AuditUserInfoCardProps {
  user: User;
  userData: UserData | null;
  userBadgeId: string;
}

export const AuditUserInfoCard = ({
  user,
  userData,
  userBadgeId,
}: AuditUserInfoCardProps) => {
  return (
    <div className={styles.summary}>
      <h3>User Information</h3>
      <div className={styles.userInfoContent}>
        <div className={styles.userInfoItem}>
          Name:{' '}
          <strong>
            {userData ? `${userData.firstName} ${userData.lastName}` : user.displayName || 'Not provided'}
          </strong>
        </div>
        <div className={styles.userInfoItem}>
          Email: <strong>{user.email || 'Not provided'}</strong>
        </div>
        <div className={styles.userInfoItem}>
          Lab/Company: <strong>{userData?.company || 'Not provided'}</strong>
        </div>
        <div className={styles.userInfoItem}>
          Badge/ID #:{' '}
          <span className={`${styles.badgeTag} ${!userBadgeId ? styles.badgeTagMuted : ''}`}>
            {userBadgeId || 'Not provided'}
          </span>
        </div>
        <div className={styles.userInfoItem}>
          User ID: <strong>{user.uid}</strong>
        </div>
      </div>
    </div>
  );
};
