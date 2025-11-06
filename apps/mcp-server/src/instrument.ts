import { Configuration } from '@packmind/shared';
import { PackmindLogger } from '@packmind/logger';
import * as Sentry from '@sentry/nestjs';

Configuration.getConfig('SENTRY_DSN_MCP').then((sentryDSN) => {
  if (sentryDSN) {
    new PackmindLogger('Sentry').info('Initializing Sentry');
    Sentry.init({
      dsn: sentryDSN,
      environment: process.env.NODE_ENV || 'development',
    });
  }
});
