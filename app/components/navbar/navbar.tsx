import { useState } from 'react';
import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';
import { ManageProfile } from '../user/manage-profile';

interface NavbarProps {
  isUploading?: boolean;
}

export const Navbar = ({ isUploading = false }: NavbarProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <>
      <header className={styles.navbar} aria-label="Canvas top navigation">
        <div className={styles.navActions}>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className={styles.profileTextButton}
            disabled={isUploading}
            title={isUploading ? 'Cannot manage profile while uploading files' : undefined}
          >
            Manage Profile
          </button>
          <SignOut disabled={isUploading} />
        </div>
      </header>
      <ManageProfile
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
