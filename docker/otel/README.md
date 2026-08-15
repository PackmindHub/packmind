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

**You mostly do not have to write queries.** Two things cover the common cases:

- **Drilldown apps** — Grafana installs `grafana-exploretraces-app`, `grafana-lokiexplore-app` and
  `grafana-metricsdrilldown-app` on startup. They are point-and-click: pick a service, see its RED
  metrics and latency breakdown, click into slow traces. No TraceQL, no PromQL. Start here.
  (They are downloaded from grafana.com on first run, so they need outbound network once.)
- **A provisioned dashboard** — `docker/otel/grafana/dashboards/packmind-api.json` ships with this
  repo and loads automatically: latency percentiles per endpoint, request and error rates, a latency
  heatmap, and database call percentiles. Find it under Dashboards → *Packmind API — latency &
  throughput*. Edit it in the UI and copy the JSON back if you want more.

The query languages below are the escape hatch for when the click-through UIs do not cover what you
want. Worth reading once, not memorising. Five entry points, easiest first.

> **Importing a community dashboard from grafana.com?** Expect empty panels, and do not conclude the
> setup is broken. Span-metric names are fragmented across the ecosystem: this stack's Tempo
> metrics-generator emits **`traces_spanmetrics_latency_bucket`** (verified by querying it), while
> the OpenTelemetry Collector's `spanmetrics` connector and Alloy emit
> `traces_spanmetrics_duration_milliseconds_bucket`, and old Tempo emitted
> `traces_spanmetrics_duration_seconds_bucket`. Most published dashboards target one of the other
> two. Either edit the metric name in the imported panels, or add a Prometheus recording rule
> aliasing ours to the name the dashboard expects. The bundled dashboard avoids the problem by
> being built against what this stack actually produces.

### 1. "This request was slow, why?" — Explore → Tempo → Search

Pick the **Tempo** datasource, set Service Name to `packmind-api`, and sort by duration. Open a
trace to get the waterfall. This is a real one, captured from a single request:

```
24.2ms  POST /api/v0/auth/check-email-availability   ← HTTP span
14.1ms    request handler - /api/v0/auth/check-…     ← Express routing
13.2ms      AuthController.checkEmailAvailability    ← Nest handler
 9.5ms        checkEmailAvailability                 ← use case
 0.2ms          pg-pool.connect                      ← waiting for a connection
 3.5ms          pg.query:SELECT packmind             ← the SQL
```

Six spans, one per layer, reading top to bottom as HTTP → route → controller → use case → SQL.
An N+1 shows up as repeated sibling `pg.query` spans under the same parent.

It is six spans because two instrumentations are deliberately turned off in `apps/api/src/otel.ts`
— see the comments there. Left at defaults the same request produced **24** spans, 18 of them
Express middleware and duplicated routing noise named `middleware - patched`, which buried the four
spans that actually tell you anything.

Click any `pg.query` span and read **`db.query.text`** for the SQL — the full statement TypeORM
generated, joins and all. (It is `db.query.text`, not the older `db.statement`: `instrumentation-pg`
has moved to the stable database semantic conventions. Same reason the neighbouring attributes are
`db.system.name` and `db.namespace`.)

Statements are parameterized and bind values are deliberately **not** captured, so user data never
reaches the trace backend. A lookup by email records:

```
WHERE ( LOWER("user"."email") = LOWER($1) ) AND ( "user"."deleted_at" IS NULL )
```

`$1` stays `$1` — the address itself is nowhere in the span. Turning on `enhancedDatabaseReporting`
in `apps/api/src/otel.ts` is what would attach the values, and that is why it is left off.

### 2. "Show me everything slower than X" — Explore → Tempo → TraceQL

Switch the Tempo query type to **TraceQL** and filter on duration. Two different things, easy to
confuse:

```traceql
{ traceDuration > 800ms }                              # the whole request took > 800ms
{ duration > 800ms }                                   # a single SPAN took > 800ms
{ resource.service.name = "packmind-api" && duration > 800ms }
{ name =~ "pg.query.*" && duration > 200ms }           # slow SQL specifically
{ name =~ "pg.query.*" && duration > 200ms && resource.deployment.environment.name = "production" }
```

`duration` is per span, so `{duration > 800ms}` finds a slow *query* even inside a fast request,
while `{traceDuration > 800ms}` finds slow *requests*. Both return the matching traces, and clicking
one drops you into the waterfall.

### 3. "Latency distribution per endpoint" — Explore → Prometheus

Tempo's metrics-generator turns every span into a Prometheus histogram, so percentiles per
operation need no extra instrumentation. The series is `traces_spanmetrics_latency_bucket`, labelled
`span_name`, `span_kind`, `status_code` and `service`.

```promql
# p95 per operation
histogram_quantile(0.95, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket[5m])))

# only incoming endpoints (server spans), or only DB/outbound calls
histogram_quantile(0.95, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket{span_kind="SPAN_KIND_SERVER"}[5m])))
histogram_quantile(0.99, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket{span_kind="SPAN_KIND_CLIENT"}[5m])))

# the other two of RED: throughput and errors
sum by (span_name, status_code) (rate(traces_spanmetrics_calls_total[5m]))
```

Values are **seconds** — set the panel unit accordingly. For the full distribution rather than a
few quantiles, put `sum by (le) (rate(traces_spanmetrics_latency_bucket{span_name="…"}[5m]))` in a
**Heatmap** panel with format `Heatmap`.

Real output from a local run, which shows why this is worth having:

```
                p50        p95        p99
POST /…/check-email-availability     3.1ms     46.4ms    216.3ms
pg.query:SELECT packmind             1.1ms     21.6ms    213.8ms
```

The endpoint's p99 and the SQL's p99 are the same number — the tail is the query, not our code.
That is the diagnosis, straight off the graph.

Two gotchas:

- `rate()` over a window with **no traffic returns NaN**, so a quiet dev environment shows an empty
  panel. That is normal, not a broken setup. Widen the window or generate some load.
- Requests that match no route collapse to a bare `POST` span name, so 404s and unmatched paths all
  land in one bucket. Filter them out when they distort the picture.

### 4. "What is slow?" — Explore → Tempo → Service Graph

A live diagram of `packmind-frontend → packmind-api → postgres/redis`, with request and error rates
on each edge, synthesized from spans by Tempo's metrics-generator. Use this when you do not yet
know which request to look at, then click through an edge into the traces behind it.

### 5. "What happened during that request?" — logs ↔ traces

Logs carry `trace_id` automatically, so the two directions both work:

- **From a log to its trace**: Explore → Loki, filter `service_name="packmind-api"`, then click the
  `Trace:` button that appears on any log line.
- **From a trace to its logs**: open a span, then "Logs for this span".

This round trip is usually the fastest way to debug something, and it is the reason log export is
enabled rather than just log correlation.

The correlation is exact, not approximate — verified by capturing traces and logs from one request
and cross-referencing them: the log records emitted inside a request carry the **same `trace_id` as
the HTTP span**, and a `span_id` belonging to a span in that same trace. Startup logs, emitted
outside any request, correctly carry no trace context. Inbound `traceparent` is honoured too, so a
browser-initiated request puts the API's spans *and* its log lines on the browser's trace.

> **Do not drop `@opentelemetry/winston-transport` from the dependencies.** It is an *optional* peer
> of `instrumentation-winston`, so nothing breaks loudly without it — logs simply never reach Loki,
> and the only clue is an OTel diag warning you cannot see unless `OTEL_LOG_LEVEL` is set. Trace ids
> still appear in the console, which makes it look like everything works.

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

## Cloud vs self-hosted

**Self-hosted builds ship with observability entirely off**, and that is enforced in CI rather than
left to configuration.

The two halves behave differently and need different handling:

- **API — runtime.** `OTEL_EXPORTER_OTLP_ENDPOINT` is read at startup, so the image is neutral: the
  same artifact traces or does not trace depending on the environment it runs in. Nothing is set in
  `dockerfile/prod/docker-compose.yml`, so a self-hosted deployment never starts the SDK. For Cloud,
  the value comes from the Helm values in `PackmindHub/packmind-ai-helm-charts`, not from this repo.
- **Frontend — build time.** `VITE_OTEL_EXPORTER_URL` is baked into the client bundle by Vite and
  cannot be changed afterwards, so the split has to happen when the bundle is built. That is the
  `Build frontend` step in `.github/workflows/build.yml`, gated exactly like the Sentry and Crisp
  values:

  ```
  vars.PACKMIND_EDITION == 'proprietary' && !startsWith(github.ref, 'refs/tags/release/')
  ```

  Every `release/*` tag produces the self-hosted images (both editions), so the expression resolves
  to `''` there and `initOtel()` returns early.

That step also **fails the build** if any Cloud-only `VITE_` value is non-empty on a `release/*`
tag. The check exists because the failure it guards against is invisible: a leaked endpoint in a
customer's bundle would silently point their browsers at Packmind infrastructure, and nothing in the
running product would look wrong.

## Moving to Grafana Cloud

Mostly env vars — but "just change the endpoint" is not the whole story, and the gaps are not
obvious.

**Works with env vars alone, no code change:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<region>.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64 of instanceID:token>
```

The SDK reads `OTEL_EXPORTER_OTLP_HEADERS` natively — verified by pointing the built API at an
endpoint that requires auth and confirming the `Authorization: Basic …` header arrives on
`/v1/traces` and `/v1/logs`. API traces and logs are done at that point.

**Needs actual work:**

1. **Browser traces cannot go direct.** `VITE_OTEL_EXPORTER_URL` is resolved by the browser, so
   pointing it at Grafana Cloud would mean shipping the Cloud token in a public JS bundle. Do not.
   Either keep a collector you host as the browser's endpoint and let *it* authenticate onward, or
   use Grafana Cloud Frontend Observability (Faro), which is a different SDK. Until one of those is
   in place, browser tracing stays local-only.
2. **Span metrics must be switched on.** The RED dashboards depend on `traces_spanmetrics_*`, which
   otel-lgtm's Tempo generates locally. In Grafana Cloud the metrics-generator is a per-stack setting
   that is off by default, and the series it produces are billed as active series.
3. **Datasource uids differ.** The bundled dashboard uses a `${ds}` variable rather than a hardcoded
   uid precisely so it can be repointed — pick the Cloud Prometheus datasource from the dropdown.
4. **Volume becomes a bill.** Nothing is sampled today, and log export is on for every
   `PackmindLogger` line. That is right for a laptop and wrong for production traffic: add a sampler
   (`OTEL_TRACES_SAMPLER=parentbased_traceidratio`, `OTEL_TRACES_SAMPLER_ARG=0.1`) and consider
   filtering logs below `warn` before pointing production at a paid backend.
5. **Sentry still overlaps.** Enabling OTel in an environment where `SENTRY_DSN_API` is set needs
   Sentry's `skipOpenTelemetrySetup` route — see the note in `apps/api/src/otel.ts`.

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
