import * as Sentry from '@sentry/react';
import { getEnvVar } from '../../shared/utils/getEnvVar';

export function initSentry() {
  const sentryDSN = getEnvVar('VITE_SENTRY_FRONTEND_DSN');

  // Use custom environment variable if provided, otherwise fall back to Vite's MODE
  const environment =
    getEnvVar('VITE_SENTRY_ENVIRONMENT') || getEnvVar('MODE', 'development');
  const isDev =
    getEnvVar('DEV') === 'true' || getEnvVar('MODE') === 'development';

  if (sentryDSN) {
    console.log(`Initializing Sentry for ${environment} environment`);
    Sentry.init({
      dsn: sentryDSN,
      environment: environment,
      // Add debug mode for development
      debug: isDev,
      // Only capture errors in production by default, but allow override
      beforeSend(event) {
        // In development, log to console as well
        if (isDev) {
          console.error('Sentry Error:', event);
        }
        return event;
      },
    });
  } else {
    console.debug('Sentry DSN not configured - skipping initialization');
  }
}
