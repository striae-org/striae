import type { LinksFunction } from 'react-router';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useMatches,
} from 'react-router';
import { 
  ThemeProvider,
  themeStyles 
} from '~/components/theme-provider/theme-provider';
import { AuthProvider } from '~/components/auth/auth-provider';
import { auth } from '~/services/firebase';
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
  const themeColor = theme === 'dark' ? '#000000' : '#377087';

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
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

interface ErrorBoundaryShellProps {
  title: string;
  children: React.ReactNode;
}

const LOGIN_REDIRECT_PATH = '/';

const errorActionStyle = {
  alignItems: 'center',
  appearance: 'none',
  backgroundColor: '#0d6efd',
  border: '1px solid #0b5ed7',
  borderRadius: '8px',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '1rem',
  fontWeight: 600,
  justifyContent: 'center',
  lineHeight: 1,
  marginTop: '1rem',
  minWidth: '220px',
  padding: '0.9rem 1.6rem',
  textDecoration: 'none',
} as const;

async function returnToLogin() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error boundary sign out failed:', error);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = LOGIN_REDIRECT_PATH;
    }
  }
}

function ErrorBoundaryShell({ title, children }: ErrorBoundaryShellProps) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#377087" />
        <meta name="color-scheme" content="light" />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col h-screen w-full overflow-x-hidden">
        <ThemeProvider theme="light" className="">
          <main>{children}</main>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const statusText = error.statusText || 'Unexpected error';

    return (
      <ErrorBoundaryShell title={`${error.status} ${statusText}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorTitle}>{error.status}</div>
          <p className={styles.errorMessage}>{statusText}</p>
          <button
            type="button"
            onClick={() => void returnToLogin()}
            style={errorActionStyle}
            className={styles.errorLink}>
            Return to Login
          </button>
        </div>
      </ErrorBoundaryShell>
    );
  }

  return (
    <ErrorBoundaryShell title="Oops! Something went wrong">
      <div className={styles.errorContainer}>
        <div className={styles.errorTitle}>500</div>
        <p className={styles.errorMessage}>Something went wrong. Please try again later.</p>
        <button
          type="button"
          onClick={() => void returnToLogin()}
          style={errorActionStyle}
          className={styles.errorLink}>
          Return to Login
        </button>
      </div>
    </ErrorBoundaryShell>
  );
}