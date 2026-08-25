// MUST stay first: OpenTelemetry patches modules as they are required, so it
// has to run before anything below pulls in winston, express or ioredis.
import { otelStarted } from './otel';

import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import * as Sentry from '@sentry/nestjs';

Configuration.getConfig('SENTRY_DSN_API').then((sentryDSN) => {
  if (sentryDSN) {
    new PackmindLogger('Sentry').info('Initializing Sentry', {
      skipOpenTelemetrySetup: otelStarted,
    });
    Sentry.init({
      dsn: sentryDSN,
      environment: process.env.NODE_ENV || 'development',
      // Sentry is OpenTelemetry-based and would register a tracer provider of
      // its own, displacing the one ./otel already installed — leaving the API
      // serving traffic with no traces and nothing in the logs to say so. So
      // when OTLP export is on, OpenTelemetry owns tracing and Sentry is
      // narrowed to error reporting.
      //
      // Deliberately NOT paired with Sentry's SentrySampler: it defers to the
      // client's `tracesSampleRate`, which is unset here, and an unset rate
      // means "tracing disabled" — measured, that drops every span, including
      // the ones bound for OTLP. SentryPropagator and SentryContextManager are
      // left out for the same reason, that tracing is not Sentry's job here:
      // the default W3C propagator is what an OTLP backend expects.
      //
      // The cost is that Sentry issues carry no trace id, so there is no
      // click-through between a Sentry issue and its trace.
      //
      // False when OTLP is off, which is production today: Sentry then sets up
      // its own OpenTelemetry exactly as before, and nothing about this path
      // changes.
      skipOpenTelemetrySetup: otelStarted,
    });
  } else {
    new PackmindLogger('Sentry').info('Sentry not initialized');
  }
});
