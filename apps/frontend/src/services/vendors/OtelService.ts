import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';
import { getEnvVar } from '../../shared/utils/getEnvVar';

/**
 * Browser-side OpenTelemetry, so a page interaction and the API work it causes
 * end up on one trace.
 *
 * Call this from entry.client.tsx only. React Router runs in SPA mode but still
 * prerenders the shell at build time, so module-scope initialization in
 * root.tsx would execute this in Node, where window and XMLHttpRequest do not
 * exist.
 *
 * Off unless VITE_OTEL_EXPORTER_URL is set — see docker/otel/README.md. Unlike
 * the API's endpoint, this URL is resolved by the browser, so it must be
 * reachable from the host rather than over the compose network.
 */
export function initOtel() {
  const exporterUrl = getEnvVar('VITE_OTEL_EXPORTER_URL');

  if (!exporterUrl) {
    console.debug('OTLP exporter URL not configured - skipping OpenTelemetry');
    return;
  }

  const provider = new WebTracerProvider({
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'packmind-frontend',
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: getEnvVar('MODE', 'development'),
      }),
    ),
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: exporterUrl })),
    ],
  });

  provider.register();

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      // Axios uses the XHR adapter in the browser, so this is the one that
      // covers packmindApiService; fetch covers React Router's own requests.
      //
      // Neither needs propagateTraceHeaderCorsUrls: the API is reached through
      // the relative path /api, which is same-origin, and the traceparent
      // header is attached to same-origin requests by default. That is also why
      // the API's CORS config needs no change. Only the exporter POST below is
      // cross-origin, and the collector accepts it.
      new XMLHttpRequestInstrumentation({
        // Do not trace the exporter's own requests — that loops.
        ignoreUrls: [exporterUrl],
      }),
      new FetchInstrumentation({
        ignoreUrls: [exporterUrl],
      }),
    ],
  });

  console.log(`Initializing OpenTelemetry, exporting to ${exporterUrl}`);
}
