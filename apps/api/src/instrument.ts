// MUST stay first: OpenTelemetry patches modules as they are required, so it
// has to run before anything below pulls in winston, express or ioredis.
import './otel';

import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import * as Sentry from '@sentry/nestjs';

Configuration.getConfig('SENTRY_DSN_API').then((sentryDSN) => {
  if (sentryDSN) {
    new PackmindLogger('Sentry').info('Initializing Sentry');
    Sentry.init({
      dsn: sentryDSN,
      environment: process.env.NODE_ENV || 'development',
    });
  } else {
    new PackmindLogger('Sentry').info('Sentry not initialized');
  }
});
