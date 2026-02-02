# Observability Contract

Detect structured logging and correlation/tracing context propagation consistency.

## Search Patterns

### Logging Patterns

```
# Structured logging
logger.info({
logger.error({
log.info({
log.error({
logging.info(
logging.error(
logger.log({
console.log(JSON.stringify(

# Structured logging libraries
winston
pino
bunyan
structlog
loguru
zerolog
zap
slog

# Log levels
.debug(
.info(
.warn(
.error(
.fatal(
.trace(
.verbose(

# Unstructured logging (anti-pattern in prod)
console.log(
console.error(
print(
fmt.Println(
System.out.println(
puts
```

### Correlation/Trace Context

```
# Trace IDs
traceId
trace_id
correlationId
correlation_id
requestId
request_id
x-request-id
x-correlation-id
X-Trace-ID

# OpenTelemetry
@opentelemetry
opentelemetry
otel
tracer.
span.
trace.
Span(
withSpan(
startSpan(
startActiveSpan(

# Distributed tracing
Jaeger
Zipkin
DataDog
dd-trace
newrelic
@sentry

# Context propagation
AsyncLocalStorage
cls-hooked
continuation-local-storage
contextvars
Context.current
context.Background()
```

### Metric Patterns

```
# Metrics
metrics.
counter.
gauge.
histogram.
timer.
increment(
decrement(
observe(
record(

# Metric libraries
prometheus
prom-client
statsd
micrometer
metrics (go)
```

### Context Dropping Indicators

```
# New context without propagation
new Context(
Context.create(
asyncLocalStorage.run(  # without parent context

# Missing context in async
Promise.all([  # without context propagation
setTimeout(    # loses context
setInterval(
process.nextTick(

# Log without context
logger.info('message')  # no metadata
log.error(err)          # no trace context
```

## Analysis Method

1. **Identify logging approach**: Structured vs unstructured
2. **Check for correlation IDs**: Are trace/correlation IDs present?
3. **Trace context propagation**:
   - Is context passed through call chains?
   - Is context preserved across async boundaries?
4. **Find context drops**: Where is tracing context lost?
5. **Module coverage**: Which modules participate in tracing?

## Observability Maturity

| Level         | Indicators                                    |
| ------------- | --------------------------------------------- |
| **None**      | `console.log`, no structure                   |
| **Basic**     | Structured logger, no correlation             |
| **Good**      | Correlation IDs in logs                       |
| **Excellent** | Full distributed tracing, context propagation |

## Context Drop Patterns

| Pattern                   | Risk           | Detection                             |
| ------------------------- | -------------- | ------------------------------------- |
| **Async without context** | Lost trace     | `setTimeout` without propagation      |
| **New request handler**   | Orphan trace   | Handler doesn't extract trace headers |
| **Background job**        | No correlation | Job processor ignores context         |
| **Error boundary**        | Lost context   | Catch without re-adding context       |

## Reporting Threshold

Report only if:

- Logging found AND
- (Unstructured logging in prod code OR context propagation gaps)

## Insight Template

```
INSIGHT:
  id: OBS-[n]
  title: "OBSERVABILITY: [level] maturity, [N] context drops"
  summary: "Logging is [structured|unstructured]. Tracing [present|absent|inconsistent]."
  confidence: [high|medium|low]
  evidence:
    logging:
      structured: [N] files
      unstructured: [N] files
      library: "[winston|pino|etc]"
    tracing:
      present: [true|false]
      library: "[opentelemetry|etc|none]"
      correlation_id_usage: [N] files
    context_drops:
      - path[:line] — async without context propagation
      - path[:line] — log without trace context
    modules_without_tracing:
      - path — no observability instrumentation
```

## Standard/Command Suggestions

- **Standard**: "Use structured logging with correlation IDs"
- **Standard**: "Propagate trace context across async boundaries"
- **Standard**: "Include trace context in all log entries"
- **Command**: "Add observability to module" (instrument new code)
