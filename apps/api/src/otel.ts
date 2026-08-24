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
 *
 * Do NOT source any of these through `Configuration.getConfig()`. It is async
 * and may call out to Infisical, so the SDK would start only once that promise
 * resolves — by which point pg, ioredis, express and winston have long been
 * required, and none of them get patched. Nothing crashes; you simply get no
 * spans, which is the worst kind of failure. The Sentry init in
 * `instrument.ts` demonstrates the trap: its DSN resolves after bootstrap has
 * already begun.
 *
 * These have to be real environment variables at process start. Only
 * OTEL_EXPORTER_OTLP_HEADERS is sensitive, and the container entrypoint
 * already exports secrets that way before `exec node main.js`.
 */
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const ATTR_KEY_DEPLOYMENT_ENVIRONMENT = 'deployment.environment.name';

/**
 * Tenant and space are pulled off the request path to tag the root span. Strict
 * about the UUID shape on purpose: a literal ":orgId" or a slug must never land
 * in an attribute. Compiled once — startIncomingSpanHook runs per request.
 *
 * `/spaces/<uuid>` is unambiguous in this API: every route under
 * `organizations/:orgId/spaces` takes a space id there, and `spaces-management`
 * cannot match because of the trailing slash.
 */
const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ORGANIZATION_ID_IN_PATH = new RegExp(
  `/organizations/(${UUID_PATTERN})`,
  'i',
);
const SPACE_ID_IN_PATH = new RegExp(`/spaces/(${UUID_PATTERN})`, 'i');

/**
 * Requests whose spans carry no diagnostic value and are dropped outright.
 *
 * - Both healthcheck paths are polled every few seconds by the container
 *   runtime and would otherwise be most of what the trace list shows. The
 *   root `/api/v0` is what docker-compose probes (see its `healthcheck.test`);
 *   it is matched exactly and never as a prefix, or the whole API would go
 *   untraced.
 * - `/api/v0/sse/stream` is a long-lived event stream: its root span stays
 *   open for the entire connection, so it surfaces as a multi-minute
 *   "request" that dominates every duration sort and skews the latency
 *   percentiles. What happens inside the stream is logged, not traced.
 *
 * Query string and trailing slashes are stripped so `/api/v0/` and
 * `/api/v0?x=1` cannot slip through.
 */
const IGNORED_PATHS = new Set([
  '/api/v0',
  '/api/v0/healthcheck',
  '/api/v0/sse/stream',
]);

function isNoiseRequest(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0].replace(/\/+$/, '');
  return IGNORED_PATHS.has(path);
}

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

/**
 * The environment is REQUIRED whenever exporting, and must come from
 * OTEL_RESOURCE_ATTRIBUTES — the SDK's own resource detector reads it, so it is
 * the one source of truth.
 *
 * It used to fall back to NODE_ENV, which was a trap: the API image hardcodes
 * NODE_ENV=production, so staging reported itself as production and its traces,
 * logs and latency percentiles merged into the production ones with nothing
 * looking wrong. Mislabelled telemetry is worse than none, so a missing
 * environment disables export rather than guessing.
 */
function declaredEnvironment(): string | undefined {
  const raw = process.env['OTEL_RESOURCE_ATTRIBUTES'];
  if (!raw) {
    return undefined;
  }

  for (const pair of raw.split(',')) {
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (pair.slice(0, separator).trim() === ATTR_KEY_DEPLOYMENT_ENVIRONMENT) {
      return pair.slice(separator + 1).trim() || undefined;
    }
  }

  return undefined;
}

const environment = declaredEnvironment();

/** Undefined whenever tracing is disabled, which makes shutdownOtel a no-op. */
let sdk: NodeSDK | undefined;

/**
 * Bounded so an unreachable collector cannot hold the process past the SIGKILL
 * grace period a container runtime allows after SIGTERM.
 */
const SHUTDOWN_TIMEOUT_MS = 2000;

if (otlpEndpoint && !environment) {
  // Loud, but never fatal: a typo in telemetry config must not stop the API
  // from serving traffic.
  console.error(
    `[otel] OTEL_EXPORTER_OTLP_ENDPOINT is set but "${ATTR_KEY_DEPLOYMENT_ENVIRONMENT}" is missing ` +
      `from OTEL_RESOURCE_ATTRIBUTES. Refusing to export rather than mislabel this deployment. ` +
      `Set e.g. OTEL_RESOURCE_ATTRIBUTES=${ATTR_KEY_DEPLOYMENT_ENVIRONMENT}=staging`,
  );
}

if (otlpEndpoint && environment) {
  sdk = new NodeSDK({
    // deployment.environment.name is deliberately absent here: the resource
    // detector picks it up from OTEL_RESOURCE_ATTRIBUTES, so it cannot be
    // silently overridden by a default.
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] || 'packmind-api',
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
          ignoreIncomingRequestHook: (request) => isNoiseRequest(request.url),

          // Stamp tenant and space onto the ROOT span, which is what Tempo's
          // trace list and the Drilldown filters read - an attribute buried on
          // a child span is findable in TraceQL but does not make the trace
          // list filterable. This runs at span creation, before auth, so the
          // URL is all there is to go on; the use case bases set the same
          // attributes from the validated command for the rest.
          //
          // Requests carrying neither in the path (/auth/me and friends) get
          // no attributes, which is why each key is spread conditionally.
          startIncomingSpanHook: (request) => {
            const url = request.url ?? '';
            const organizationId = url.match(ORGANIZATION_ID_IN_PATH)?.[1];
            const spaceId = url.match(SPACE_ID_IN_PATH)?.[1];

            return {
              ...(organizationId && {
                'packmind.organization.id': organizationId,
              }),
              ...(spaceId && { 'packmind.space.id': spaceId }),
            };
          },
        },

        '@opentelemetry/instrumentation-express': {
          // Drop per-middleware spans. Measured on one request they were 18 of
          // 24 spans — cookieParser, jsonParser, cors and friends, each wrapped
          // in an uninformative "middleware - patched" parent — burying the
          // three spans that carry the story (request handler -> controller ->
          // SQL). Routers and request handlers are kept.
          //
          // The cost is losing body-parsing time as its own span; it stays
          // inside the root span's duration. Re-enable by removing this if you
          // are ever chasing a slow middleware specifically.
          ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
        },

        // Express 5 routes through the standalone `router` package, which the
        // bundle instruments separately — so routing gets traced twice. It
        // contributed 9 opaque "middleware - patched" spans plus a duplicate of
        // the request-handler span that express already emits. Express covers
        // this ground, so the router instrumentation is pure noise here.
        '@opentelemetry/instrumentation-router': { enabled: false },

        // Everything else stays at its defaults, which is deliberate:
        //
        // - `pg` keeps `enhancedDatabaseReporting: false`, so spans carry the
        //   parameterized SQL in `db.query.text` (the stable semconv name, not
        //   the older `db.statement`) but never the bind values — a lookup by
        //   email records `LOWER("user"."email") = LOWER($1)` and not the
        //   address. This is what keeps user data out of the trace backend.
        // - `winston` keeps both trace-context injection AND log sending on.
        //   Log sending additionally requires `@opentelemetry/winston-transport`
        //   to be installed — it is an OPTIONAL peer, and without it the
        //   instrumentation silently sends nothing (it only emits an OTel diag
        //   warning, which is invisible unless OTEL_LOG_LEVEL is set). Keep that
        //   package in the dependencies, here and in docker-package.json.
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

  console.log(
    `[otel] OpenTelemetry started for "${environment}", exporting to ${otlpEndpoint}`,
  );
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
