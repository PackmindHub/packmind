/**
 * OpenTelemetry bootstrap.
 *
 * This module MUST be evaluated before anything else in the process — see the
 * first import of `instrument.ts`. Auto-instrumentation works by hooking
 * `require()`, so any module loaded before `sdk.start()` runs is never patched
 * and produces no spans. That is also why nothing here imports `@packmind/*`:
 * `@packmind/logger` pulls in `winston`, and a `winston` required ahead of the
 * hooks would silently lose log/trace correlation. Hence `console.log` below
 * rather than `PackmindLogger`.
 *
 * Everything is gated on `OTEL_EXPORTER_OTLP_ENDPOINT`. Unset — which is the
 * case in production and in tests — and the SDK never starts: no hooks, no
 * exporter, no overhead. See docker/otel/README.md to switch it on locally.
 */
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

/** Undefined whenever tracing is disabled, which makes shutdownOtel a no-op. */
let sdk: NodeSDK | undefined;

/**
 * Bounded so an unreachable collector cannot hold the process past the SIGKILL
 * grace period a container runtime allows after SIGTERM.
 */
const SHUTDOWN_TIMEOUT_MS = 2000;

if (otlpEndpoint) {
  sdk = new NodeSDK({
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] || 'packmind-api',
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
          process.env['NODE_ENV'] || 'development',
      }),
    ),

    // Both exporters resolve their URL from OTEL_EXPORTER_OTLP_ENDPOINT,
    // appending /v1/traces and /v1/logs respectively.
    traceExporter: new OTLPTraceExporter(),
    logRecordProcessors: [
      new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
    ],

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          // The healthcheck is polled by the container healthcheck and would
          // otherwise be most of what you see in the trace list.
          ignoreIncomingRequestHook: (request) =>
            request.url?.startsWith('/api/v0/healthcheck') ?? false,
        },

        // Everything else stays at its defaults, which is deliberate:
        //
        // - `pg` keeps `enhancedDatabaseReporting: false`, so spans carry the
        //   parameterized SQL in `db.query.text` (the stable semconv name, not
        //   the older `db.statement`) but never the bind values — a lookup by
        //   email records `LOWER("user"."email") = LOWER($1)` and not the
        //   address. This is what keeps user data out of the trace backend.
        // - `winston` keeps both trace-context injection AND log sending on.
        //   Sending is what puts logs in Loki carrying a `trace_id`, which is
        //   what makes Grafana's trace<->logs navigation work. Do not also add
        //   `OpenTelemetryTransportV3` to PackmindLogger — combined with this
        //   instrumentation it duplicates every record.
        // - `openai` records model and token metadata but not prompt or
        //   completion content, unless
        //   OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true. Leave it
        //   unset: prompts would end up in Loki.
        // - `fs` and `host-metrics` are excluded by the bundle itself.
      }),
    ],
  });

  // NOTE: @sentry/nestjs v10 is itself built on OpenTelemetry and registers its
  // own tracer provider. The two never overlap today because each is gated on a
  // different variable — SENTRY_DSN_API is unset locally, and
  // OTEL_EXPORTER_OTLP_ENDPOINT is unset in production. Running both in one
  // environment requires Sentry's `skipOpenTelemetrySetup: true` plus its
  // SentrySampler / SentryPropagator / SentryContextManager.
  sdk.start();

  console.log(`[otel] OpenTelemetry started, exporting to ${otlpEndpoint}`);
}

/**
 * Flushes buffered spans and log records, and resolves once they are on the
 * wire (or the timeout above expires).
 *
 * Deliberately NOT wired to SIGTERM/SIGINT here. main.ts already owns graceful
 * shutdown and ends it with process.exit, which kills the process regardless of
 * an in-flight export — a second listener racing it loses the whole final
 * batch. So main.ts awaits this instead, as the last step before exiting.
 *
 * Never rethrows: a failed flush must not change the exit path.
 */
export async function shutdownOtel(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await Promise.race([
      sdk.shutdown(),
      new Promise<void>((resolve) => {
        // unref so a pending timer cannot itself keep the process alive.
        setTimeout(resolve, SHUTDOWN_TIMEOUT_MS).unref();
      }),
    ]);
  } catch (error: unknown) {
    console.error('[otel] Error flushing OpenTelemetry on shutdown', error);
  }
}
