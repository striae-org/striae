import { useEffect, useState } from 'react';
import { useLocation } from '@remix-run/react';
import styles from './mobile-warning.module.css';

export default function MobileWarning() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkMobileOrTablet = () => {
      // Check for mobile/tablet by screen size (up to 1024px to include tablets)
      const isSmallScreen = window.innerWidth < 1024;
      
      // Additional checks for mobile/tablet user agents
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTabletUA = /tablet|ipad/i.test(userAgent);
      
      setIsMobileOrTablet(isSmallScreen || isMobileUA || isTabletUA);
    };
    
    checkMobileOrTablet();
    window.addEventListener('resize', checkMobileOrTablet);
    return () => window.removeEventListener('resize', checkMobileOrTablet);
  }, []);

  const isAuthPath = location.pathname.includes('auth');

  if (!isMobileOrTablet || !isAuthPath) return null;

  return (
    <div className={styles.mobileWarning}>
      <div className={styles.content}>
        <h2>Desktop Only</h2>
        <p>Striae is optimized for desktop use only. Mobile devices and tablets are not supported. Please visit us on a desktop computer for the best experience.</p>
      </div>
    </div>
  );
}