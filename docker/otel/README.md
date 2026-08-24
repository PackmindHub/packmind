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
docker compose up
```

Or, more comfortably, put those two lines in a `.env` file at the repo root — Compose reads it
automatically:

```dotenv
COMPOSE_PROFILES=observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318
```

Grafana is then on <http://localhost:3001> (`admin` / `admin`), and the inbox that alert mail lands
in on <http://localhost:8025> — the profile also starts a Mailpit container, see
[Alerting on slow requests](#alerting-on-slow-requests).

All otel-lgtm and Mailpit ports are published on **loopback only**, because OTLP ingestion is
unauthenticated, Grafana runs on default credentials, and the inbox quotes endpoint paths. If you drive Docker from another machine —
a remote host, or some WSL setups — the ports will look dead; drop the `127.0.0.1:` prefixes in
`docker-compose.yml` to reach them.

Leave the env var unset and the SDK never starts: no spans, no exporter, no overhead. That is also
why production is unaffected — the same gate applies there.

**Scope: the API only.** The browser is deliberately not instrumented. Sending telemetry from a page
means either shipping a credential in a public JS bundle or running an unauthenticated ingest
endpoint on our domain, and neither was worth it for the value it adds. Traces therefore start at
the HTTP span, not at the click.

## One image, several environments

Everything is environment variables — the same artifact runs everywhere, and nothing is baked in at
build time.

|                               | local                               | staging                           | production                               | self-hosted |
| ----------------------------- | ----------------------------------- | --------------------------------- | ---------------------------------------- | ----------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-lgtm:4318`             | Cloud endpoint                    | Cloud endpoint                           | _unset_     |
| `OTEL_EXPORTER_OTLP_HEADERS`  | —                                   | `Authorization=Basic …`           | `Authorization=Basic …`                  | —           |
| `OTEL_RESOURCE_ATTRIBUTES`    | `deployment.environment.name=local` | `…=staging,service.version=<tag>` | `…=production,service.version=<tag>`     | —           |
| sampling                      | everything                          | everything                        | tail sampling in a collector — see below | —           |

For staging and production these live in the Helm values in `PackmindHub/packmind-ai-helm-charts`.
Compose defaults the local one, so locally the endpoint remains the only switch you need.

**Declaring the environment is mandatory when exporting.** With an endpoint set but no
`deployment.environment.name`, the SDK does not start and logs an error — the API still serves
traffic, because a telemetry typo must never take the service down, but nothing is exported.

That rule exists because of a concrete trap: the API image hardcodes `NODE_ENV=production`, so
deriving the environment from it made staging announce itself as production. Its traces, logs and
latency percentiles would have merged into the production ones with nothing looking wrong.

**Watch out when several environments share one backend.** The attribute reaches traces and logs out
of the box — filter with `resource.deployment.environment.name` in TraceQL, and Loki exposes it as
the `deployment_environment_name` label. It does **not** reach the span metrics by default: their
labels are `service`, `span_name`, `span_kind`, `status_code` and `le`. Two environments writing to
the same Prometheus would therefore blend their percentiles silently.

Two supported ways out, depending on how far apart you want the environments:

- **One stack, environment as a label.** Grafana Cloud's metrics-generator can promote span or
  resource attributes to dimensions, so `deployment.environment.name` becomes a label on
  `traces_spanmetrics_*`. Cheapest, but every added dimension multiplies active series, which is
  billed — so add that one and resist adding more.
- **One stack per environment.** Add the second stack's Prometheus as an extra datasource in a
  single Grafana (basic auth, the stack's URL, an access-policy token scoped to all stacks). The
  bundled dashboard carries a `${ds}` datasource variable precisely for this: the same JSON serves
  both, and you switch environments from the dropdown. Harder isolation — separate quotas,
  retention and access — at the price of a second stack on the plan.

A single datasource can also query several stacks at once by listing the stack ids as `1|2` in its
User field, which is useful for a cross-environment overview but not for per-environment dashboards.

## Finding your way around Grafana

**You mostly do not have to write queries.** Two things cover the common cases:

- **Drilldown apps** — Grafana installs `grafana-exploretraces-app`, `grafana-lokiexplore-app` and
  `grafana-metricsdrilldown-app` on startup. They are point-and-click: pick a service, see its RED
  metrics and latency breakdown, click into slow traces. No TraceQL, no PromQL. Start here.
  (They are downloaded from grafana.com on first run, so they need outbound network once.)
- **A provisioned dashboard** — `docker/otel/grafana/dashboards/packmind-api.json` ships with this
  repo and loads automatically: latency percentiles per endpoint, request and error rates, a latency
  heatmap, and database call percentiles. Find it under Dashboards → _Packmind API — latency &
  throughput_. Edit it in the UI and copy the JSON back if you want more.

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
13.2ms      AuthController.checkEmailAvailability    ← Nest controller
 9.5ms        checkEmailAvailability                 ← the same method, again
 0.2ms          pg-pool.connect                      ← waiting for a connection
 3.5ms          pg.query:SELECT packmind             ← the SQL
```

Six spans, reading top to bottom as HTTP → route → controller → SQL. The two Nest rows are one
layer and not two: `instrumentation-nestjs-core` emits a `REQUEST_CONTEXT` span named
`Controller.method` and, nested inside it, a `REQUEST_HANDLER` span named after `handler.name`
alone. Both are the controller. Neither is the use case — it patches `RouterExplorer.createHandler`
and nothing else, so a bare method name in a waterfall is still the route handler.

That is also why nothing from `packages/*` appears in this trace: auto-instrumentation patches known
library modules, never your own classes. First-party code has to say so itself — see
[Adding your own spans](#adding-your-own-spans).

An N+1 shows up as repeated sibling `pg.query` spans under the same parent.

It is six spans because two instrumentations are deliberately turned off in `apps/api/src/otel.ts`
— see the comments there. Left at defaults the same request produced **24** spans, 18 of them
Express middleware and duplicated routing noise named `middleware - patched`, which buried the four
spans that actually tell you anything.

Three routes emit no trace at all, filtered by `ignoreIncomingRequestHook` in the same file:
`/api/v0` and `/api/v0/healthcheck` (polled every few seconds by the container healthcheck, and
otherwise most of the trace list) and `/api/v0/sse/stream` (a long-lived event stream whose root
span stays open for the whole connection, so it appeared as a multi-minute "request" that dominated
every duration sort). If you ever need to debug one of them, drop it from `IGNORED_PATHS`.

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

`duration` is per span, so `{duration > 800ms}` finds a slow _query_ even inside a fast request,
while `{traceDuration > 800ms}` finds slow _requests_. Both return the matching traces, and clicking
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

A live diagram of `packmind-api → postgres/redis`, with request and error rates on each edge,
synthesized from spans by Tempo's metrics-generator. Use this when you do not yet know which request
to look at, then click through an edge into the traces behind it.

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
caller that already has a trace gets the API's spans _and_ its log lines attached to it — which is
what would let a future upstream service, or an instrumented browser, join the same trace.

> **Do not drop `@opentelemetry/winston-transport` from the dependencies.** It is an _optional_ peer
> of `instrumentation-winston`, so nothing breaks loudly without it — logs simply never reach Loki,
> and the only clue is an OTel diag warning you cannot see unless `OTEL_LOG_LEVEL` is set. Trace ids
> still appear in the console, which makes it look like everything works.

## Alerting on slow requests

There is one provisioned alert rule, and mail from it lands in a local inbox. Both come up with the
`observability` profile — no extra switch, no account, no credential anywhere.

```
Alerting → Alert rules   →  Packmind / latency  →  "Packmind API — slow requests (root span p95 > 2s)"
http://localhost:8025    →  the inbox the mail arrives in
```

### Why it queries Prometheus and not Tempo

The obvious way to say "alert me when a trace takes too long" is TraceQL — `{ traceDuration > 2s }`
— and it does not work. **Grafana only lets an alert rule query a datasource whose plugin declares
`alerting: true`.** On this stack that is Prometheus and Loki; Tempo declares `false`. Tempo's
TraceQL-metrics endpoint answers `quantile_over_time(duration, .95)` perfectly well when you curl it,
and Explore will happily graph it — it simply cannot back a rule.

So the rule reads `traces_spanmetrics_latency_bucket` instead, filtered to `span_kind="SPAN_KIND_SERVER"`.
That is not a compromise as much as it sounds: **the root span of an API trace is the HTTP server
span, and it covers the whole request**, so its duration _is_ the trace's total duration. TraceQL
stays the tool for finding the individual offenders once the alert has told you which endpoint —
which is exactly what the mail's description tells you to do.

### Editing it

Everything lives in `docker/otel/grafana/provisioning-alerting.yaml` — contact point, notification
policy and rule in one file, mounted into the image's `provisioning/alerting/` directory the same way
the dashboard is. It is in git, which is the whole reason the notification channel is a local mail
catcher: a Slack or Discord webhook URL is a secret and could not be committed.

**Provisioned alerting is read-only in the UI.** Change the threshold in the file and restart the
container. If you are still iterating, build the rule in the UI first — it is the far better editor,
with a live preview of what would have fired — then copy the result down into the YAML.

### Four things that will bite you

- **The threshold is in SECONDS.** `traces_spanmetrics_latency_*` is a seconds histogram. `2000`
  looks like a sane millisecond budget and would never fire.
- **`/sse/stream` has to be excluded**, and so will any future streaming endpoint. It is a long-lived
  connection whose root span legitimately runs for minutes; left in the query it holds the rule
  permanently firing. It is excluded by name in the `expr`.
- **`rate()` over an idle window returns NaN**, so a quiet local API produces no series rather than
  low ones. The rule sets `noDataState: OK` — without it you get NoData mail every evening. You can
  watch this happen: endpoints you stopped calling show up as `Normal (NoData)`, not as breaches.
- **`SPAN_KIND_SERVER` misses BullMQ jobs.** They are traced, but their traces are rooted at a
  first-party span of kind `INTERNAL` — there is no incoming request to root them at — so a slow job
  never trips a rule written this way. Alerting on those needs a separate rule keyed on the span
  name.

And one from further out: the span metrics carry `service`, `span_name`, `span_kind`, `status_code`
and `le` — **not** `deployment.environment.name`. Two environments writing to one Prometheus blend
their percentiles, and this rule cannot tell them apart. Same caveat as the dashboard, described
under [One image, several environments](#one-image-several-environments).

### Swapping mail for something real

Mailpit is right for local and wrong for anywhere else. Grafana offers Slack, Discord, PagerDuty,
Telegram, Teams, OpsGenie and a generic webhook in this build; all of them are a `type` and a
`settings` block in the same `contactPoints` list. The moment you pick one that needs a URL or token,
that value stops being committable — pass it through an env var and reference it as `$SLACK_URL` in
the YAML, the way Grafana provisioning expects.

## What is instrumented

Via `@opentelemetry/auto-instrumentations-node` in `apps/api/src/otel.ts`:

| Spans you get                                        | From                             |
| ---------------------------------------------------- | -------------------------------- |
| Incoming HTTP, Express routing, Nest controllers     | `http`, `express`, `nestjs-core` |
| **PostgreSQL queries** (all TypeORM traffic)         | `pg` — at driver level           |
| Redis: cache, SSE pub/sub, BullMQ connection         | `ioredis`                        |
| Outgoing LLM calls (OpenAI, Anthropic, Google GenAI) | `undici`, `openai`               |

Prompt and completion **content** is not captured — only model and token metadata. Setting
`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` would change that; don't, unless you have
thought about what ends up in Loki.

You also get **Node runtime metrics** for free — event-loop lag, heap and GC, from the bundle's
`runtime-node` instrumentation, which the SDK exports to Prometheus alongside the traces. Nobody
configured this; it is on by default. Look for them in Explore → Prometheus.

And from our own code, all under the instrumentation scope `packmind`: a span per authenticated use
case, **a span per async method on every use case, service and repository**, and anything wrapped in
`withSpan()` by hand. See [Adding your own spans](#adding-your-own-spans).

Two known gaps:

- **BullMQ jobs** are traced (they run in the API process) but are _not_ linked to the HTTP request
  that queued them — BullMQ has no auto-instrumentation, and crossing Redis needs a manual
  `traceparent` inject/extract. `withSpan()` is half of what that would need; the other half is
  carrying the context through the job payload.
- **TypeORM** produces no ORM-level spans, only the driver-level `pg` ones. The community
  `opentelemetry-instrumentation-typeorm` package is unmaintained and not part of
  `opentelemetry-js-contrib`, so it is deliberately not used. Our own repository spans cover the
  part that mattered — knowing which method issued a given statement — but nothing reports on
  TypeORM's own work between the two.

## Adding your own spans

Auto-instrumentation patches known library modules — `http`, `express`, `nestjs-core`, `pg`,
`winston` — and nothing else. It has no way to discover your classes, so `packages/*` would be
invisible unless it instruments itself.

**Almost certainly you do not need to do anything.** Use cases, services and repositories are
already covered, automatically and with no per-method opt-in — read the next section for what that
means, and reach for `withSpan()` only for the cases it does not reach.

### The automatic layer

`instrumentMethods()` from `@packmind/node-utils` walks an instance's **prototype chain** and wraps
every async method in a span. Three calls apply it to the whole backend:

| Called from                                   | Covers                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `AbstractMemberUseCase` constructor           | every authenticated use case, through its three subclass bases                      |
| `AbstractRepository` constructor              | its 26 subclasses, wherever they are constructed                                    |
| each `*Services` / `*Repositories` aggregator | domain services, and the seven repositories that do not extend `AbstractRepository` |

Patching the prototype rather than the instance is what makes **depth** work: a `this.b()` call from
inside `this.a()` resolves through the same patched prototype, so nesting continues for as many
levels as the call chain has. **Private methods are captured too** — TypeScript `private` is erased
at runtime, so they are ordinary prototype properties. Span names are `Class.method`, resolved at
call time, so an inherited `AbstractRepository.add` reports as `SkillRepository.add`.

Three things it does **not** do, each worth knowing before you go looking for a missing span:

- **Only `async` methods.** A span has to be active _while_ the original runs, or spans created
  inside it become roots of their own instead of children — so the decision cannot wait until the
  return value is in hand, and is made at patch time by asking whether the method is a native
  `AsyncFunction`. A plain method that returns a promise, `list() { return this.repo.find(); }`, is
  therefore skipped. Mark it `async`, or wrap it by hand.
- **`execute()` is skipped** on use cases, because it already owns the explicit span named after the
  class. Patching it too would nest an identical `<Subclass>.execute` above it.
- **Adapters, controllers and free functions are not covered.** Nor are use cases implementing
  `IPublicUseCase` directly — they bypass `AbstractMemberUseCase` and get no span at all, as before.

`PACKMIND_OTEL_INSTRUMENT_METHODS=false` turns the whole thing off without also losing tracing. It
is read straight off `process.env` at module load, not through `Configuration.getConfig()` — that is
async, and prototypes are patched during construction, long before such a promise would resolve.

> **This is a lot of spans.** A request that was 17 spans is now plausibly 60–100. Two consequences.
> The default `BatchSpanProcessor` queue is 2048 spans in 512-span batches, so under load spans start
> being dropped _silently_ — do not assume a trace is complete when you are chasing something under
> load. And `span_name` is a Prometheus label on `traces_spanmetrics_*`, so going from ~150 distinct
> names to well over a thousand multiplies active series; that bites hardest on Grafana Cloud. If
> either does bite, the ladder is to drop the repository layer first — `pg` spans already cover that
> ground — and reach for head sampling after that.

### Doing it by hand

`withSpan()` is still there for what the automatic layer does not reach, or when you want a name of
your own:

```ts
import { withSpan } from '@packmind/node-utils';

await withSpan('renderAgentFiles', async () => {
  // ...
});
```

It nests under whatever span is currently active, records the exception and sets the error status if
the callback throws, and ends the span on both paths. When no SDK is running — unit tests, or the
API started without `OTEL_EXPORTER_OTLP_ENDPOINT` — `trace.getTracer()` returns a no-op tracer, so
the callback still runs and the cost is a function call. There is nothing to guard and no reason to
branch on whether tracing is on. `instrumentMethods()` is built on it, so the two behave alike.

### What it looks like

A real capture of `GET /organizations/:orgId/spaces/:spaceId/skills`, taken **before** the automatic
layer was added — kept because it is what shows why the layer was worth adding:

```
2029.76ms  GET /api/v0/organizations/:orgId/spaces/:spaceId/skills
2027.83ms    request handler - /api/v0/organizations/:orgId/spaces/:spaceId/skills
2027.32ms      OrganizationsSpacesSkillsController.getSkills
2024.63ms        getSkills
2023.52ms          ListSkillsBySpaceUseCase                     ← scope=packmind
   0.32ms            pg-pool.connect
   1.25ms            pg.query:SELECT packmind
   1.27ms            pg.query:SELECT packmind
   0.11ms            pg-pool.connect
   0.82ms            pg.query:SELECT packmind
   0.09ms            pg-pool.connect
   0.77ms            pg.query:SELECT packmind
2001.10ms            thisMethodTakesTwoSeconds                  ← scope=packmind
   0.19ms            pg-pool.connect
   1.61ms            pg.query:SELECT packmind
   0.17ms            pg-pool.connect
   1.87ms            pg.query:SELECT packmind
```

Note this endpoint is 17 spans, not six: member and space-membership validation each cost a
connection and a query before the read the caller asked for. That is the kind of thing the use-case
span makes visible — previously all thirteen `pg` spans hung off the controller with nothing to
group them.

But read the thirteen `pg` spans again: they are a flat list of siblings, and nothing in that
capture says which of them is the membership lookup, which is the space read, and which is the query
the caller actually asked for. Filling that in is what the automatic layer does. The same request now
reads roughly:

```
GET /api/v0/organizations/:orgId/spaces/:spaceId/skills
  request handler - /api/v0/organizations/:orgId/spaces/:spaceId/skills
    OrganizationsSpacesSkillsController.getSkills
      getSkills
        ListSkillsBySpaceUseCase                                  ← explicit, unchanged
          ListSkillsBySpaceUseCase.validateMemberAccess           ← new
            ListSkillsBySpaceUseCase.fetchUser                    ← new
              pg-pool.connect
              pg.query:SELECT packmind
            ListSkillsBySpaceUseCase.fetchOrganization            ← new
              pg.query:SELECT packmind
          ListSkillsBySpaceUseCase.executeForMembers              ← new (space-membership check)
            pg.query:SELECT packmind
            ListSkillsBySpaceUseCase.executeForSpaceMembers       ← new
              ListSkillsBySpaceUseCase.thisMethodTakesTwoSeconds  ← new, and private
              SkillService.listSkillsBySpace                      ← new
                SkillRepository.findBySpaceId                     ← new
                  pg.query:SELECT packmind
```

`thisMethodTakesTwoSeconds` is the one to look at: it is `private`, nothing in the source wraps it,
and it still gets a span. Find it with:

```
{ name = "ListSkillsBySpaceUseCase.thisMethodTakesTwoSeconds" }
```

> Re-capture this listing from a real trace next time the stack is up — the shape above is derived
> from the code, not pasted out of Tempo, and the exact `pg` placement will differ.

Our spans carry the instrumentation scope `packmind`, which is what distinguishes them from
`@opentelemetry/instrumentation-pg` and friends. In TraceQL the intrinsic is
`instrumentation:name`, **not** `scope.name` (which does not parse):

```
{ instrumentation:name = "packmind" }
```

### Filtering by organization and space

Requests carrying an organization or a space in their path get `packmind.organization.id` and
`packmind.space.id`, so a customer's traces are one query away:

```
{ span.packmind.organization.id = "6940d397-f6f8-4cc9-bf56-9f7f365a45a8" }
{ span.packmind.space.id = "fc6ff8a5-b8ad-4ab9-ae2d-721a4c4ba70a" }
```

Both are set in two places on purpose:

- **The root span**, by `startIncomingSpanHook` on `instrumentation-http` in `apps/api/src/otel.ts`.
  This is the one that matters for navigation — Tempo's trace list and the Drilldown filters read
  root spans, so an attribute that only exists deeper down is findable in TraceQL but leaves the
  list unfilterable. The hook runs at span creation, before auth, so it has nothing but the URL and
  matches a strict UUID shape: a literal `:orgId` or a slug never lands in an attribute. Requests
  with neither in the path (`/auth/me` and friends) get none. The two patterns are compiled once at
  module scope, since this hook runs on every incoming request.
- **The use-case span**, from the validated command. `AbstractMemberUseCase` sets the organization
  before access validation rather than after, so a rejected request stays attributable to whoever
  made it.

Space ids need a seam on the use-case side, because `spaceId` lives on `SpaceMemberCommand` and not
on `PackmindCommand` — only the space-scoped bases have one. So `AbstractMemberUseCase` exposes a
protected `spanAttributes(command)` that `AbstractSpaceMemberUseCase` and
`AbstractSpaceAdminUseCase` override:

```ts
protected override spanAttributes(command: Command): Attributes {
  return {
    ...super.spanAttributes(command),
    ...(command.spaceId && { 'packmind.space.id': command.spaceId }),
  };
}
```

Override that when a use case base gains another dimension worth filtering on. It keeps span
concerns inside `execute()` instead of subclasses reaching for `trace.getActiveSpan()` from a nested
call.

Note the conditional spread: `spaceId` is optional on some commands, and a trace for a request with
no space should carry no `packmind.space.id` at all rather than an empty one. The SDK does drop
`undefined` attribute values silently — verified — but spreading conditionally means a reader does
not have to know that to see the intent.

> **Do not turn this into a span-metrics dimension.** Tenant ids are precisely the cardinality that
> wrecks a Prometheus instance. Tempo indexes span attributes and is built for high cardinality;
> Prometheus is not. (The collector config inside `grafana/otel-lgtm` is internal to the image
> anyway, so this is not a switch you can reach for locally.)

### What else belongs on a span

`organizationId` and `spaceId` are on spans because they are tenant identifiers, and because they
are _already_ in the observability backend: the winston transport turns every `PackmindLogger`
metadata key into a Loki label, so those log lines carry them regardless. Spans add no new
exposure.

That reasoning does not generalise. `userId`, emails and the like stay off spans — the same reason
`pg` keeps `enhancedDatabaseReporting: false` and bind values are never captured. Before reaching
for `span.setAttribute`, apply the test: traces are retained and queryable by anyone with Grafana
access.

While you are here, note the other half of that finding: because _every_ logger metadata key becomes
a Loki label, per-request values like `connectionId` become unbounded label cardinality on the Loki
side. Labels are not the place for those; Loki wants them in the line.

## Cloud vs self-hosted

**Self-hosted deployments ship with observability entirely off.**

Because tracing lives only in the API, this needs no build-time gating: the image is neutral and
`OTEL_EXPORTER_OTLP_ENDPOINT` is read at startup, so the same artifact traces or does not trace
depending on the environment it runs in. Nothing sets it in
`dockerfile/prod/docker-compose.yml`, so a self-hosted deployment never starts the SDK. For Cloud,
the value comes from the Helm values in `PackmindHub/packmind-ai-helm-charts`, not from this repo.

That is a real advantage of keeping the browser out of it — a bundled value could not be changed
after the build, and would have needed a CI gate to stay out of customer images. (The frontend build
in `.github/workflows/build.yml` still guards the Sentry and Crisp values that way, for the same
reason.)

## Moving to Grafana Cloud

Mostly env vars, and more so now that only the API is instrumented — but "just change the endpoint"
is still not the whole story.

**Works with env vars alone, no code change:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<region>.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64 of instanceID:token>
```

The SDK reads `OTEL_EXPORTER_OTLP_HEADERS` natively — verified by pointing the built API at an
endpoint that requires auth and confirming the `Authorization: Basic …` header arrives on
`/v1/traces` and `/v1/logs`. API traces and logs are done at that point.

**These must be real environment variables**, not values fetched at runtime. `Configuration.getConfig()`
is async and may call Infisical, so the SDK would only start once that promise resolved — after pg,
ioredis, express and winston were already required and therefore never patched. Nothing would crash;
you would just silently get no spans.

Only the header is sensitive, and the container already has a mechanism for that: the prod entrypoint
exports Docker secrets before `exec node main.js`, and Kubernetes does the same through a
`secretKeyRef`. If Infisical has to remain the source of truth, fetch it there — in the entrypoint,
before Node starts — rather than from inside the application.

**Needs actual work:**

1. **Span metrics must be switched on.** The RED dashboards depend on `traces_spanmetrics_*`, which
   otel-lgtm's Tempo generates locally. In Grafana Cloud the metrics-generator is a per-stack setting
   that is off by default, and the series it produces are billed as active series.
2. **Datasource uids differ.** The bundled dashboard uses a `${ds}` variable rather than a hardcoded
   uid precisely so it can be repointed — pick the Cloud Prometheus datasource from the dropdown.
3. **Volume becomes a bill.** Measured on 50 real requests against the simplest endpoint:
   **6.4 KB of traces and 7.4 KB of logs per request**, uncompressed OTLP/JSON. At 10 req/s that is
   roughly 360 GB/month before compression, against a 50 GB free tier — so this needs a plan even at
   modest traffic.

   Note which half is bigger: **logs cost more than traces here**, and trace sampling does nothing
   about them. Filtering logs to `warn` and above buys more than sampling, and costs no diagnostic
   power since the traces stay complete. The other heavy field is `db.query.text` — TypeORM SELECTs
   run ~900 characters.

   On sampling itself, prefer **tail sampling in a collector** over
   `OTEL_TRACES_SAMPLER=traceidratio`. Head sampling decides at random when the trace starts, so it
   drops 90% of the errors and slow requests too — the ones you wanted — and Tempo's
   metrics-generator only sees what arrives, so rates and percentiles end up computed on the sample.
   A collector sees 100%, decides once the trace is complete (keep every error, keep everything over
   800 ms, keep ~5% of the rest), and can compute span metrics _before_ the sampling stage so the
   metrics stay exact. The cost is one more component to run.

4. **Sentry still overlaps.** Enabling OTel in an environment where `SENTRY_DSN_API` is set needs
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
- **Tempo cannot back an alert rule.** Its datasource plugin declares `alerting: false`, so
  `{ traceDuration > 2s }` is a query and never a rule. Latency alerts go through the Prometheus span
  metrics instead — see [Alerting on slow requests](#alerting-on-slow-requests).
- **The image's default notification policy points at a receiver that does not exist** (named
  `empty`). Out of the box a firing alert therefore notifies nothing and explains nothing;
  `provisioning-alerting.yaml` replaces that root policy, which is why the file defines `policies`
  and not just a contact point.
