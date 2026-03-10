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
  { rel: 'icon', href: '/favicon.ico' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
];

type AppTheme = 'dark' | 'light';

interface ThemeHandle {
  theme?: AppTheme;
}

const DEFAULT_THEME: AppTheme = 'light';

const isAppTheme = (value: unknown): value is AppTheme => {
  return value === 'dark' || value === 'light';
};

const resolveRouteTheme = (matches: ReturnType<typeof useMatches>): AppTheme => {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const routeHandle = matches[index].handle as ThemeHandle | undefined;

    if (isAppTheme(routeHandle?.theme)) {
      return routeHandle.theme;
    }
  }

  return DEFAULT_THEME;
};

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const theme = resolveRouteTheme(matches);
  const themeColor = theme === 'dark' ? '#000000' : '#f5f5f5';

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={themeColor} />
        <meta name="color-scheme" content={theme} />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />        
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col h-screen w-full overflow-x-hidden">
        <ThemeProvider theme={theme} className="">
        <main>
          {children}
        </main>
        </ThemeProvider>        
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}

export default function App() {
  const matches = useMatches();
  const location = useLocation();
  const isAuthRoute = matches.some(match => 
    match.id.includes('auth') || 
    match.pathname?.includes('/auth')    
  ) || location.pathname === '/';

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
                to="https://striae.org" 
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
              to="https://striae.org" 
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