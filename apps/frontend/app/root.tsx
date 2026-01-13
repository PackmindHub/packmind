import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type MetaFunction,
  type LinksFunction,
} from 'react-router';
import { initSentry } from '../src/services/vendors/SentryService';
import {
  PMHeading,
  PMSpinner,
  PMVStack,
  PMToaster,
  UIProvider,
} from '@packmind/ui';
import { useAuthContext } from '../src/domain/accounts/hooks';
import { UserContextChangeSubscription } from '../src/domain/accounts/components/UserContextChangeSubscription';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider } from '../src/providers/AuthProvider';
import { SSEProvider } from '../src/services/sse';
import { ErrorBoundary } from '../src/providers/ErrorBoundary';
import { AnalyticsProvider } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import nProgress from 'nprogress';
import { useNavigation } from 'react-router';
import { useEffect, useRef } from 'react';

initSentry();

// Export route error boundary
export { RouteErrorBoundary as ErrorBoundary } from './components/RouteErrorBoundary';

export const meta: MetaFunction = () => [
  {
    title: 'Packmind',
  },
];

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://unpkg.com/nprogress@0.2.0/nprogress.css',
  },
];

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigation = useNavigation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip NProgress on the very first render (initial hydration)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (navigation.state === 'idle') {
      nProgress.done();
    } else {
      nProgress.start();
    }
  }, [navigation.state]);

  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{ height: '100%' }} suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <UIProvider>
      <div
        style={{
          minHeight: '100%',
          height: '100%',
          maxHeight: '100%',
          minWidth: '100%',
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <PMHeading>Loading Packmind...</PMHeading>
        <PMSpinner size={'xl'} />
      </div>
    </UIProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuthContext();

  return (
    <div
      style={{
        minHeight: '100%',
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PMVStack
        flex="1"
        gap={0}
        minH={'100%'}
        maxH={'100%'}
        h="100%"
        w="100%"
        maxW={'100%'}
        mx="auto"
      >
        {isAuthenticated && <UserContextChangeSubscription />}
        <Outlet />
        <PMToaster />
      </PMVStack>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary level="app">
      <QueryProvider>
        <AuthProvider>
          <SSEProvider>
            <AnalyticsProvider>
              <UIProvider>
                <AppContent />
              </UIProvider>
            </AnalyticsProvider>
          </SSEProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
