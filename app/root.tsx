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
import Footer from '~/components/footer/footer';
import { AuthProvider } from '~/components/auth/auth-provider';
import { Icon } from '~/components/icon/icon';
import { useEffect, useState } from 'react';
import styles from '~/styles/root.module.css';
import './tailwind.css';

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
  const isAuthPath = location.pathname.startsWith('/auth');
  const showReturnToTop = !isAuthPath;
  const showFooter = !isAuthPath;
  const [hasScrolledPastThreshold, setHasScrolledPastThreshold] = useState(false);

  const handleReturnToTop = () => {
    const topAnchor = document.getElementById('__page-top');
    if (topAnchor) {
      topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

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

  useEffect(() => {
    if (!showReturnToTop) {
      setHasScrolledPastThreshold(false);
      return;
    }

    const updateVisibility = () => {
      const threshold = window.innerHeight * 0.2;
      const documentScrollTop =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const activeElement = document.scrollingElement as HTMLElement | null;
      const elementScrollTop = activeElement?.scrollTop ?? 0;
      const scrollTop = Math.max(documentScrollTop, elementScrollTop);

      setHasScrolledPastThreshold(scrollTop >= threshold);
    };

    requestAnimationFrame(updateVisibility);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    document.addEventListener('scroll', updateVisibility, { passive: true, capture: true });
    window.addEventListener('resize', updateVisibility);

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      document.removeEventListener('scroll', updateVisibility, true);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [showReturnToTop, location.pathname]);

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
      <body className="flex flex-col h-screen w-full overflow-x-hidden">
        <div id="__page-top" />
        <ThemeProvider theme={theme} className="">
        <main>
          {children}
        </main>
        {showReturnToTop && hasScrolledPastThreshold && (
          <button
            type="button"
            className={styles.returnToTop}
            onClick={handleReturnToTop}
            aria-label="Return to top"
          >
            <Icon icon="chevron-right" className={styles.returnToTopIcon} size={20} />
          </button>
        )}
        {showFooter && <Footer />}
        </ThemeProvider>        
        <Scripts />
        <ScrollRestoration 
          getKey={(location) => getScrollRestorationKey(location)}
        />
      </body>
    </html>
  );
}

export default function App() {
  const matches = useMatches();
  const isAuthRoute = matches.some(match => 
    match.id.includes('auth') || 
    match.pathname?.includes('/auth')    
  );

  if (isAuthRoute) {
    return (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    );
  }

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
        <body className="flex flex-col h-screen">
          <ThemeProvider theme="light" className="">          
          <main>
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
      <body className="flex flex-col h-screen">
        <ThemeProvider theme="light" className="">        
        <main>
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