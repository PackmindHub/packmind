# Local tracing with OpenTelemetry

Packmind is instrumented with the OpenTelemetry SDK and exports plain **OTLP**. Nothing in the
application code names a vendor — it only knows an endpoint. Locally that endpoint is
`grafana/otel-lgtm`, a single throwaway container bundling the OTel Collector, Tempo (traces),
Prometheus (metrics), Loki (logs) and Grafana.

## Running it

Tracing is **off by default**. Two switches turn it on — the profile starts the container, the env
vars make the apps export:

```bash
COMPOSE_PROFILES=observability \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318 \
VITE_OTEL_EXPORTER_URL=http://localhost:4318/v1/traces \
docker compose up
```

Or, more comfortably, put those three lines in a `.env` file at the repo root — Compose reads it
automatically:

```dotenv
COMPOSE_PROFILES=observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318
VITE_OTEL_EXPORTER_URL=http://localhost:4318/v1/traces
```

Grafana is then on <http://localhost:3001> (`admin` / `admin`).

All three otel-lgtm ports are published on **loopback only**, because OTLP ingestion is
unauthenticated and Grafana runs on default credentials. If you drive Docker from another machine —
a remote host, or some WSL setups — the ports will look dead; drop the `127.0.0.1:` prefixes in
`docker-compose.yml` to reach them.

Leave the env vars unset and the SDK never starts: no spans, no exporter, no overhead. That is also
why production is unaffected — the same gate applies there.

Note the asymmetry in the two URLs. `OTEL_EXPORTER_OTLP_ENDPOINT` is resolved inside the backend
container, so it uses the compose service name. `VITE_OTEL_EXPORTER_URL` is baked into the frontend
bundle and resolved by **your browser**, so it must be a host URL.

## Finding your way around Grafana

Everything below is provisioned by the image — there are no dashboards to build. Three entry
points, easiest first.

### 1. "This request was slow, why?" — Explore → Tempo → Search

Pick the **Tempo** datasource, set Service Name to `packmind-api`, and sort by duration. Open a
trace to get the waterfall:

```
GET /api/v0/spaces/…            412ms   ← HTTP span
  └─ SpacesController.list      408ms   ← Nest handler
       ├─ pg.query              180ms   ← SELECT … FROM spaces …
       └─ pg.query              210ms   ← the N+1 you did not know about
```

Click any `pg.query` span and read `db.statement` for the SQL. Statements are parameterized —
bind values are deliberately **not** captured, so user data never reaches the trace backend.

### 2. "What is slow?" — Explore → Tempo → Service Graph

A live diagram of `packmind-frontend → packmind-api → postgres/redis`, with request and error rates
on each edge, synthesized from spans by Tempo's metrics-generator. Use this when you do not yet
know which request to look at, then click through an edge into the traces behind it.

### 3. "What happened during that request?" — logs ↔ traces

Logs carry `trace_id` automatically, so the two directions both work:

- **From a log to its trace**: Explore → Loki, filter `service_name="packmind-api"`, then click the
  `Trace:` button that appears on any log line.
- **From a trace to its logs**: open a span, then "Logs for this span".

This round trip is usually the fastest way to debug something, and it is the reason log export is
enabled rather than just log correlation.

## What is instrumented

Via `@opentelemetry/auto-instrumentations-node` in `apps/api/src/otel.ts`:

| Spans you get | From |
| --- | --- |
| Incoming HTTP, Express middleware, Nest controllers | `http`, `express`, `nestjs-core` |
| **PostgreSQL queries** (all TypeORM traffic) | `pg` — at driver level |
| Redis: cache, SSE pub/sub, BullMQ connection | `ioredis` |
| Outgoing LLM calls (OpenAI, Anthropic, Google GenAI) | `undici`, `openai` |
| Browser page loads and API calls | `sdk-trace-web` in the frontend |

Prompt and completion **content** is not captured — only model and token metadata. Setting
`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` would change that; don't, unless you have
thought about what ends up in Loki.

You also get **Node runtime metrics** for free — event-loop lag, heap and GC, from the bundle's
`runtime-node` instrumentation, which the SDK exports to Prometheus alongside the traces. Nobody
configured this; it is on by default. Look for them in Explore → Prometheus.

Two known gaps:

- **BullMQ jobs** are traced (they run in the API process) but are *not* linked to the HTTP request
  that queued them — BullMQ has no auto-instrumentation, and crossing Redis needs a manual
  `traceparent` inject/extract.
- **TypeORM** produces no ORM-level spans, only the driver-level `pg` ones. The community
  `opentelemetry-instrumentation-typeorm` package is unmaintained and not part of
  `opentelemetry-js-contrib`, so it is deliberately not used.

## Using a different backend

Because the apps speak plain OTLP to a Collector, swapping backends is a config change, not a code
change — point `OTEL_EXPORTER_OTLP_ENDPOINT` somewhere else:

- **Grafana Cloud** free tier — same Tempo/Loki/Grafana experience, hosted.
- **SigNoz**, **Jaeger**, **Uptrace**, … — any OTLP-native backend.
- **Datadog** — via the DD Agent's OTLP ingest, a Collector with the `datadog` exporter, or DD's
  direct OTLP intake. Be aware that OTel-instrumented data cannot drive some Datadog proprietary
  products (Continuous Profiler, App & API Protection, Database Monitoring), which still expect
  `dd-trace`.

## Gotchas

- **Sentry also uses OpenTelemetry.** `@sentry/nestjs` v10 sets up its own tracer provider, so
  running both without coordination gives two competing providers. Today they never overlap
  (`SENTRY_DSN_API` is unset locally, `OTEL_EXPORTER_OTLP_ENDPOINT` is unset in production).
  Enabling both in one environment requires Sentry's `skipOpenTelemetrySetup: true` plus its
  `SentrySampler` / `SentryPropagator` / `SentryContextManager`.
- **The image tag is pinned** (`0.30.2`). Its bundled Grafana provisioning and collector config are
  internal details that change between releases; bump deliberately, not automatically.
