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
import { AuthProvider } from '~/components/auth/auth-provider';
import { Icon } from '~/components/icon/icon';
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

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = 'light';
  const location = useLocation();
  const isAuthPath = location.pathname.startsWith('/auth');
  const showReturnToTop = !isAuthPath;

  const handleReturnToTop = () => {
    const topAnchor = document.getElementById('__page-top');
    if (topAnchor) {
      topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const scrollOptions: ScrollToOptions = { top: 0, behavior: 'smooth' };
    window.scrollTo(scrollOptions);
    document.documentElement.scrollTo(scrollOptions);
    document.body.scrollTo(scrollOptions);
    (document.scrollingElement as HTMLElement | null)?.scrollTo(scrollOptions);

    const scrollableElements = document.querySelectorAll<HTMLElement>('main, [data-scroll-container], [class*="scroll"]');
    scrollableElements.forEach((element) => {
      if (element.scrollHeight > element.clientHeight) {
        element.scrollTo(scrollOptions);
      }
    });
  };

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
        {showReturnToTop && (
          <button
            type="button"
            className={styles.returnToTop}
            onClick={handleReturnToTop}
            aria-label="Return to top"
          >
            <Icon icon="chevron-right" className={styles.returnToTopIcon} size={20} />
          </button>
        )}
        </ThemeProvider>        
        <Scripts />
        <ScrollRestoration />
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
                to="/" 
                className={styles.errorLink}>
                Return Home
              </Link>
            </div>
          </main>
          </ThemeProvider>
          <ScrollRestoration />
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
              to="/" 
              className={styles.errorLink}>
              Return Home
            </Link>
          </div>
        </main>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />        
      </body>
    </html>
  );
}