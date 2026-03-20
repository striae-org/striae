import styles from './navbar.module.css';
import { SignOut } from '../actions/signout';

interface NavbarProps {
  isUploading?: boolean;
}

export const Navbar = ({ isUploading = false }: NavbarProps) => {
  return (
    <header className={styles.navbar} aria-label="Canvas top navigation">
      <div className={styles.navActions}>
        <SignOut disabled={isUploading} />
      </div>
    </header>
  );
};
