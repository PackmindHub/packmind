import { Span, SpanStatusCode, trace } from '@opentelemetry/api';

// The instrumentation scope, surfaced in Tempo as `scope.name`. It is what
// distinguishes our own spans from those the auto-instrumentations emit
// (`@opentelemetry/instrumentation-http` and friends).
const tracer = trace.getTracer('packmind');

/**
 * Run `fn` inside a span named `name`, nested under whatever span is currently
 * active.
 *
 * Auto-instrumentation only patches known library modules — http, express,
 * nestjs-core, winston — so first-party code is invisible in a trace unless it
 * says so itself. This is how it says so.
 *
 * When no OTel SDK is running (unit tests, or the API started without
 * OTEL_EXPORTER_OTLP_ENDPOINT) `trace.getTracer` hands back a no-op tracer:
 * `fn` still runs, nothing is recorded, and the overhead is a function call.
 */
export function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // In `finally` so the span closes on the error path too — an unended
      // span is never exported, and the whole trace looks truncated.
      span.end();
    }
  });
}
