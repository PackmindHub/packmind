/**
 * By default, React Router will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx react-router reveal` ✨
 * For more information, see https://reactrouter.com/explanation/special-files#entryclienttsx
 */

import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { UIProvider } from '@packmind/ui';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider } from '../src/providers/AuthProvider';
import { SSEProvider } from '../src/services/sse';
import { ErrorBoundary } from '../src/providers/ErrorBoundary';
import { AnalyticsProvider } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <ErrorBoundary level="app">
        <QueryProvider>
          <AuthProvider>
            <SSEProvider>
              <AnalyticsProvider>
                <UIProvider>
                  <HydratedRouter />
                </UIProvider>
              </AnalyticsProvider>
            </SSEProvider>
          </AuthProvider>
        </QueryProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
