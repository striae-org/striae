import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  Link,
  useLocation,
  useMatches
} from "@remix-run/react";
import { 
  ThemeProvider,
  themeStyles 
} from '~/components/theme-provider/theme-provider';
import Footer from "~/components/footer/footer";
import MobileWarning from "~/components/mobile/mobile-warning";
import { InactivityWarning } from '~/components/user/inactivity-warning';
import "./tailwind.css";
import styles from '~/styles/root.module.css';
import { auth } from "./services/firebase";
import { useInactivityTimeout } from '~/hooks/useInactivityTimeout';
import { INACTIVITY_CONFIG } from '~/config/inactivity';
import { AuthContext } from '~/contexts/auth.context';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auditService } from '~/services/audit.service';
import { generateUniqueId } from '~/utils/id-generator';
import './reset.module.css';

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: 'manifest', href: '/manifest.json' },
  { rel: 'icon', href: '/favicon.ico' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'shortcut_icon', href: '/shortcut.png', type: 'image/png', sizes: '64x64' },
  { rel: 'apple-touch-icon', href: '/icon-256.png', sizes: '256x256' },
];

export function getScrollRestorationKey({ pathname, search, hash }: { pathname: string; search: string; hash: string }) {
  
  if (hash === '#top') {
    return null; 
  }
  
  return pathname + search;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = 'light';
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {        
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000" />
        <meta name="color-scheme" content={theme} />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />        
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen w-screen max-w-full overflow-x-hidden">
        <ThemeProvider theme={theme} className="">
        <MobileWarning />
        <main className="flex-grow w-full">
          {children}
        </main>
        <Footer />
        </ThemeProvider>        
        <Scripts />
        <ScrollRestoration 
          getKey={(location) => getScrollRestorationKey(location)}
        />
      </body>
    </html>
  );
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
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

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <title>{`${error.status} ${error.statusText}`}</title>          
        </head>
        <body className="flex flex-col min-h-screen">
          <ThemeProvider theme="light" className="">          
          <main className="flex-grow">
            <div className={styles.errorContainer}>
              <div className={styles.errorTitle}>{error.status}</div>
              <p className={styles.errorMessage}>{error.statusText}</p>
              <Link 
                viewTransition
                prefetch="intent"
                to="/#top" 
                className={styles.errorLink}>
                Return Home
              </Link>
            </div>
          </main>
          </ThemeProvider>
          <ScrollRestoration 
            getKey={(location) => getScrollRestorationKey(location)}
          />
          <Scripts />          
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Oops! Something went wrong</title>       
      </head>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider theme="light" className="">        
        <main className="flex-grow">
          <div className={styles.errorContainer}>
            <div className={styles.errorTitle}>500</div>
            <p className={styles.errorMessage}>Something went wrong. Please try again later.</p>
            <Link 
              viewTransition
              prefetch="intent"
              to="/#top" 
              className={styles.errorLink}>
              Return Home
            </Link>
          </div>
        </main>
        </ThemeProvider>
        <ScrollRestoration 
          getKey={(location) => getScrollRestorationKey(location)}
        />
        <Scripts />        
      </body>
    </html>
  );
}