# Local tracing with OpenTelemetry

The API is instrumented with the OpenTelemetry SDK and exports plain **OTLP**. Nothing in the
application code names a vendor — it only knows an endpoint. Locally that endpoint is
`grafana/otel-lgtm`, one throwaway container bundling the OTel Collector, Tempo (traces), Prometheus
(metrics), Loki (logs) and Grafana.

## Running it

Tracing is **off by default**. Two switches turn it on — the profile starts the container, the env
var makes the API export:

```bash
COMPOSE_PROFILES=observability \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318 \
docker compose up
```

Put both in a root `.env` instead and Compose picks them up automatically. Grafana is then on
<http://localhost:3001> (`admin` / `admin`), and alert mail lands in <http://localhost:8025>.

Leave `OTEL_EXPORTER_OTLP_ENDPOINT` unset and the SDK never starts: no spans, no exporter, no
overhead. That single gate is also what keeps production unaffected.

Ports are published on **loopback only** — OTLP ingestion is unauthenticated and Grafana runs on
default credentials. Driving Docker from another machine (a remote host, some WSL setups) makes them
look dead; drop the `127.0.0.1:` prefixes in `docker-compose.yml` to reach them.

**Scope: the API only.** The browser is deliberately not instrumented — sending telemetry from a page
means either shipping a credential in a public JS bundle or running an unauthenticated ingest
endpoint on our domain. Traces start at the HTTP span, not at the click.

**Postgres is not traced.** Query-level database observability is Datadog Database Monitoring's job;
it reads `pg_stat_statements` and expects `dd-trace`, so it cannot consume OTLP spans anyway. The
`pg` instrumentation is switched off in `apps/api/src/otel.ts` — see
[What is instrumented](#what-is-instrumented).

## Pointing it at Datadog

Datadog ingests OTLP natively, so switching backends is an **environment change, not a code change** —
the same gate, the same spans, a different endpoint. Verified working against Datadog EU1.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.datadoghq.eu \
OTEL_EXPORTER_OTLP_HEADERS=dd-api-key=<key>,compute_stats=true \
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=local,service.version=dev \
docker compose up
```

Keep the key in the gitignored root `.env`, never in `docker-compose.yml` — it is a bearer
credential and GitGuardian runs on CI. Note that Compose only forwards variables it names, which
`docker-compose.yml` already does for all four.

**Do not adopt `dd-trace`.** Datadog's docs push their proprietary Node.js tracer, and it would
replace the SDK wholesale: the noise filtering, the express-middleware suppression, the router
double-instrumentation fix, the tenant/space `startIncomingSpanHook` and the
`withSpan`/`instrumentMethods` layer in `@packmind/node-utils` all go with it. Since retargeting is
one env var, vendor lock-in buys nothing.

Three things that make this work with no extra mapping:

- **Unified Service Tagging is free.** Datadog reads `service.name` as `service`,
  `deployment.environment.name` as `env` and `service.version` as `version` — all three are already
  set above and in the Helm values.
- **`compute_stats=true` is not optional** if you want APM trace metrics. Without it you get
  traces but empty service dashboards.
- **The direct intake takes `http/protobuf` and `http/json`, never gRPC.** We are on
  `exporter-trace-otlp-http`, which defaults to protobuf, so there is nothing to change.

Two traps worth knowing before this goes past local:

- **The agentless endpoint is gated per organisation** — an unapproved org gets `403` with a
  perfectly valid key. Datadog also recommends an Agent or Collector over direct intake for
  production workloads, and our cluster already runs DD Agents, so production would set
  `OTEL_EXPORTER_OTLP_ENDPOINT=http://<agent>:4318` instead. Logs over that path additionally need
  `DD_LOGS_ENABLED=true` and `DD_OTLP_CONFIG_LOGS_ENABLED=true` on the Agent.
- **Sentry and OpenTelemetry both want to own the tracer provider.** `@sentry/nestjs` is itself
  OTel-based. They have never collided because each is gated on a different variable —
  `SENTRY_DSN_API` is unset locally, `OTEL_EXPORTER_OTLP_ENDPOINT` is unset in production. Enabling
  Datadog in production collides for the first time, and needs Sentry's
  `skipOpenTelemetrySetup: true` plus its `SentrySampler` / `SentryPropagator` /
  `SentryContextManager` — or a decision that Datadog replaces Sentry tracing.

### Falling back to local Grafana

An inline variable beats `.env`, so the stack below still works with a Datadog endpoint configured —
useful for offline work or for reading spans without leaving the machine:

```bash
COMPOSE_PROFILES=observability \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-lgtm:4318 \
docker compose up
```

## One image, several environments

Everything is environment variables; the same artifact runs everywhere with nothing baked in at
build time.

|                               | local                               | staging                           | production                               | self-hosted |
| ----------------------------- | ----------------------------------- | --------------------------------- | ---------------------------------------- | ----------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-lgtm:4318`             | Cloud endpoint                    | Cloud endpoint                           | _unset_     |
| `OTEL_EXPORTER_OTLP_HEADERS`  | —                                   | `Authorization=Basic …`           | `Authorization=Basic …`                  | —           |
| `OTEL_RESOURCE_ATTRIBUTES`    | `deployment.environment.name=local` | `…=staging,service.version=<tag>` | `…=production,service.version=<tag>`     | —           |
| sampling                      | everything                          | everything                        | tail sampling in a collector — see below | —           |

Staging and production values live in the Helm charts in `PackmindHub/packmind-ai-helm-charts`.
Self-hosted deployments ship with observability entirely off: nothing sets the endpoint in
`dockerfile/prod/docker-compose.yml`, so the same neutral image simply never starts the SDK.

**Declaring the environment is mandatory when exporting.** With an endpoint set but no
`deployment.environment.name`, the SDK does not start and logs an error — the API still serves
traffic, because a telemetry typo must never take the service down. The rule exists because of a
concrete trap: the API image hardcodes `NODE_ENV=production`, so deriving the environment from it
made staging announce itself as production, merging its traces, logs and percentiles into the
production ones with nothing looking wrong.

> **Two environments sharing one backend will blend their percentiles.** The environment attribute
> reaches traces (`resource.deployment.environment.name` in TraceQL) and logs (the
> `deployment_environment_name` Loki label), but **not** the span metrics — those are labelled only
> `service`, `span_name`, `span_kind`, `status_code` and `le`. Either promote the attribute to a
> metrics dimension (Grafana Cloud's metrics-generator can, at the price of more billed active
> series) or run one stack per environment and switch between them with the bundled dashboard's
> `${ds}` datasource variable.

## Finding your way around Grafana

**You mostly do not have to write queries.**

- **Drilldown apps** — `grafana-exploretraces-app`, `grafana-lokiexplore-app` and
  `grafana-metricsdrilldown-app` install on startup. Point-and-click: pick a service, see its RED
  metrics and latency breakdown, click into slow traces. Start here. (Downloaded from grafana.com on
  first run, so they need outbound network once.)
- **A provisioned dashboard** — `docker/otel/grafana/dashboards/packmind-api.json` loads
  automatically: latency percentiles per endpoint, request and error rates, and a latency heatmap.
  Under Dashboards → _Packmind API — latency & throughput_.

> **Importing a community dashboard from grafana.com?** Expect empty panels, and do not conclude the
> setup is broken. Span-metric names are fragmented across the ecosystem: this stack's Tempo
> metrics-generator emits **`traces_spanmetrics_latency_bucket`**, while the OTel Collector's
> `spanmetrics` connector and Alloy emit `traces_spanmetrics_duration_milliseconds_bucket` and old
> Tempo emitted `traces_spanmetrics_duration_seconds_bucket`. Most published dashboards target one of
> the other two. Edit the metric name in the imported panels, or add a recording rule aliasing ours.

### Reading a waterfall

Explore → Tempo → Search, service `packmind-api`, sort by duration, open a trace.

A request reads top to bottom as HTTP → route → controller → use case → service → repository. The two
Nest rows are one layer and not two: `instrumentation-nestjs-core` emits a `REQUEST_CONTEXT` span
named `Controller.method` and, nested inside it, a `REQUEST_HANDLER` span named after `handler.name`
alone. Both are the controller — a bare method name in a waterfall is still the route handler, never
the use case.

Three deliberate reductions in `apps/api/src/otel.ts` keep that readable, and each is commented
there. The first two together took one measured request from 24 spans to 6 — 18 of them were
`middleware - patched` noise and duplicated routing, burying the handful that carried the story:

- **Express middleware layers are dropped**, so `cookieParser`, `jsonParser`, `cors` and friends stop
  emitting a span each. The cost is losing body-parsing time as its own span.
- **`instrumentation-router` is off.** Express 5 routes through the standalone `router` package, so
  routing was traced twice.
- **`instrumentation-pg` is off.** Database work now appears as the repository-method span that
  issued it, not as `pg.query` / `pg-pool.connect` children. An N+1 therefore shows up as a
  repository method repeating under one parent rather than as repeated sibling queries.

Three routes emit no trace at all, filtered by `ignoreIncomingRequestHook`: `/api/v0` and
`/api/v0/healthcheck` (polled every few seconds by the container healthcheck, and otherwise most of
the trace list) and `/api/v0/sse/stream` (a long-lived stream whose root span stays open for the
whole connection, so it appeared as a multi-minute "request" dominating every duration sort). Drop
one from `IGNORED_PATHS` if you need to debug it.

### Query cookbook

The escape hatch for what the click-through UIs do not cover. Worth reading once, not memorising.

**TraceQL** (Explore → Tempo → TraceQL) — `traceDuration` is the whole request, `duration` is a
single span, which is the distinction people trip on:

```traceql
{ traceDuration > 800ms }                                  # slow requests
{ duration > 800ms }                                       # one slow span, even in a fast request
{ resource.service.name = "packmind-api" && duration > 800ms }
{ instrumentation:name = "packmind" }                      # our own spans only
{ name =~ "SkillRepository.*" && duration > 200ms }        # slow database work
{ span.packmind.organization.id = "6940d397-f6f8-4cc9-bf56-9f7f365a45a8" }
```

Note the scope intrinsic is `instrumentation:name`, **not** `scope.name`, which does not parse.

**PromQL** (Explore → Prometheus) — Tempo's metrics-generator turns every span into a histogram, so
percentiles per operation need no extra instrumentation. Values are **seconds**; set the panel unit
accordingly.

```promql
# p95 per operation
histogram_quantile(0.95, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket[5m])))

# incoming endpoints only (server spans), or outbound calls only (redis, LLM APIs)
histogram_quantile(0.95, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket{span_kind="SPAN_KIND_SERVER"}[5m])))
histogram_quantile(0.99, sum by (le, span_name) (rate(traces_spanmetrics_latency_bucket{span_kind="SPAN_KIND_CLIENT"}[5m])))

# the other two of RED: throughput and errors
sum by (span_name, status_code) (rate(traces_spanmetrics_calls_total[5m]))
```

Comparing an endpoint's p99 against the p99 of the repository span beneath it is the quickest
diagnosis available: when they are the same number, the tail is the database rather than our code.

Two gotchas: `rate()` over a window with **no traffic returns NaN**, so a quiet dev environment shows
an empty panel rather than a broken setup — widen the window or generate load. And requests matching
no route collapse to a bare `POST` span name, so 404s and unmatched paths share one bucket.

**Service Graph** (Explore → Tempo → Service Graph) — a live diagram with request and error rates on
each edge, synthesized from client spans. Redis and the outbound LLM APIs appear; Postgres does not,
since nothing emits client spans for it any more.

### Logs ↔ traces

Logs carry `trace_id` automatically, so both directions work: from a log line, click the `Trace:`
button (Explore → Loki, `service_name="packmind-api"`); from a span, "Logs for this span". This round
trip is usually the fastest way to debug something, and it is why log export is enabled rather than
just log correlation.

The correlation is exact, not approximate — verified by cross-referencing traces and logs from one
request. Records emitted inside a request carry the same `trace_id` as the HTTP span and a `span_id`
belonging to that trace; startup logs, emitted outside any request, correctly carry none. Inbound
`traceparent` is honoured, so a caller that already has a trace gets the API's spans _and_ its log
lines attached to it.

> **Do not drop `@opentelemetry/winston-transport` from the dependencies.** It is an _optional_ peer
> of `instrumentation-winston`, so nothing breaks loudly without it — logs simply never reach Loki,
> and the only clue is an OTel diag warning invisible unless `OTEL_LOG_LEVEL` is set. Trace ids still
> appear in the console, which makes it look like everything works.

## Alerting on slow requests

One provisioned rule, mailed to a local inbox. Both come up with the `observability` profile — no
account, no credential anywhere.

```
Alerting → Alert rules   →  Packmind / latency  →  "Packmind API — slow requests (root span p95 > 2s)"
http://localhost:8025    →  the inbox the mail arrives in
```

Everything lives in `docker/otel/grafana/provisioning-alerting.yaml` — contact point, notification
policy and rule in one file. That file being in git is the whole reason the channel is a local mail
catcher: a Slack or Discord webhook URL is a secret and could not be committed. Swapping in something
real is a `type` and a `settings` block in the same `contactPoints` list, with the URL passed through
an env var and referenced as `$SLACK_URL`.

**Provisioned alerting is read-only in the UI.** Change the threshold in the file and restart the
container. While iterating, build the rule in the UI first — it is the far better editor, with a live
preview of what would have fired — then copy it down into the YAML.

**Why it queries Prometheus and not Tempo.** The obvious rule is TraceQL `{ traceDuration > 2s }`,
and it does not work: Grafana only lets a rule query a datasource whose plugin declares
`alerting: true`, and Tempo declares `false`. So the rule reads `traces_spanmetrics_latency_bucket`
filtered to `span_kind="SPAN_KIND_SERVER"`. That is less of a compromise than it sounds — the root
span of an API trace _is_ the HTTP server span, covering the whole request, so its duration is the
trace's total.

Four things that will bite you:

- **The threshold is in SECONDS.** `traces_spanmetrics_latency_*` is a seconds histogram; `2000` looks
  like a sane millisecond budget and would never fire.
- **`/sse/stream` has to be excluded**, and so will any future streaming endpoint — a long-lived
  connection whose root span legitimately runs for minutes holds the rule permanently firing. It is
  excluded by name in the `expr`.
- **`rate()` over an idle window returns NaN**, so a quiet local API produces no series rather than
  low ones. The rule sets `noDataState: OK`; without it you get NoData mail every evening.
- **`SPAN_KIND_SERVER` misses BullMQ jobs.** They are traced, but rooted at a first-party `INTERNAL`
  span — there is no incoming request to root them at — so a slow job never trips this rule.

And the environment caveat from [above](#one-image-several-environments) applies here too: the span
metrics cannot tell two environments apart.

## What is instrumented

Via `@opentelemetry/auto-instrumentations-node` in `apps/api/src/otel.ts`:

| Spans you get                                        | From                             |
| ---------------------------------------------------- | -------------------------------- |
| Incoming HTTP, Express routing, Nest controllers     | `http`, `express`, `nestjs-core` |
| Redis: cache, SSE pub/sub, BullMQ connection         | `ioredis`                        |
| Outgoing LLM calls (OpenAI, Anthropic, Google GenAI) | `undici`, `openai`               |

Prompt and completion **content** is not captured — only model and token metadata. Setting
`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` would change that; don't, unless you have
thought about what ends up in Loki.

**Node runtime metrics** come for free — event-loop lag, heap and GC, from the bundle's
`runtime-node` instrumentation, exported to Prometheus alongside the traces. Nobody configured it.

And from our own code, all under the instrumentation scope `packmind`: a span per use case, **a span
per async method on every use case, service and repository**, and anything wrapped in `withSpan()` by
hand. See [Adding your own spans](#adding-your-own-spans).

Three known gaps:

- **Postgres, deliberately.** No `pg.query` or `pg-pool.connect` spans; the repository-method span is
  what a trace records about a database call, and Datadog DBM has the statement. Re-enable by
  deleting the `instrumentation-pg` line in `apps/api/src/otel.ts` if you ever need statement-level
  spans locally — and note that with it off, the repository spans are the _only_ record of database
  work in a trace, so they are not the layer to drop when trimming span volume.
- **TypeORM** produces no ORM-level spans. The community `opentelemetry-instrumentation-typeorm` is
  unmaintained and not part of `opentelemetry-js-contrib`, so it is deliberately not used. Our
  repository spans cover the part that mattered — which method issued a given statement — but nothing
  reports on TypeORM's own work.
- **BullMQ jobs** are traced (they run in the API process) but are _not_ linked to the HTTP request
  that queued them. BullMQ has no auto-instrumentation, and crossing Redis needs a manual
  `traceparent` inject/extract; `withSpan()` is half of what that would take, the other half is
  carrying context through the job payload.

## Adding your own spans

Auto-instrumentation patches known library modules — `http`, `express`, `nestjs-core`, `winston` —
and nothing else. It cannot discover your classes, so `packages/*` would be invisible unless it
instruments itself.

**Almost certainly you do not need to do anything.** Use cases, services and repositories are already
covered automatically, with no per-method opt-in.

### The automatic layer

`instrumentMethods()` from `@packmind/node-utils` walks an instance's **prototype chain** and wraps
every async method in a span. Four calls apply it to the whole backend:

| Called from                                   | Covers                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `AbstractMemberUseCase` constructor           | every authenticated use case, through its three subclass bases                      |
| each domain adapter's `initialize()`          | every other use case — roughly a third of them extend no base class at all          |
| `AbstractRepository` constructor              | its 26 subclasses, wherever they are constructed                                    |
| each `*Services` / `*Repositories` aggregator | domain services, and the seven repositories that do not extend `AbstractRepository` |

The adapter row is the odd one out, deliberately. A use case has no shared base class the way
repositories and services do — 68 of them implement `IUseCase` or nothing, so nothing opted them in
and they emitted no span at all. What they share is where they are built: nine adapters construct the
whole domain's use cases at the end of `initialize()`, and one `instrumentUseCases(this)` there covers
all of them. It reflects over the adapter's own fields and keeps values whose class name ends in
`UseCase` — selecting on the class, not the field name, because `GitAdapter` calls its fields
`_addGitProvider` and `_commitToGit`.

That call is part of the `IBaseAdapter` contract and has a test
(`instrumentUseCases.arch.spec.ts`), because forgetting it fails nothing at runtime — the traces just
stop one level short, silently, which is how the gap opened in the first place. `SpacesAdapter` builds
a use case per call rather than storing it, so it wraps at the `new` site with `instrumentUseCase()`;
so does `FetchFileContentJobFactory`, the one use case wired outside an adapter.

Patching the prototype rather than the instance is what makes **depth** work: a `this.b()` call from
inside `this.a()` resolves through the same patched prototype, so nesting continues for as many levels
as the call chain has. **Private methods are captured too** — TypeScript `private` is erased at
runtime, so they are ordinary prototype properties. Span names are `Class.method` resolved at call
time, so an inherited `AbstractRepository.add` reports as `SkillRepository.add`.

Five things to know before you go looking for a missing span:

- **Only `async` methods.** A span has to be active _while_ the original runs, or spans created inside
  it become roots of their own — so the decision is made at patch time by asking whether the method is
  a native `AsyncFunction`. A plain method returning a promise, `list() { return this.repo.find(); }`,
  is skipped. Mark it `async`, or wrap it by hand.
- **A use case's entry point is named after the class alone**, `SignInUserUseCase` rather than
  `SignInUserUseCase.execute`, so one TraceQL query matches a use case however it was instrumented.
  `AbstractMemberUseCase` gets there by skipping `execute` and wrapping it by hand — it also needs
  that call site to set the tenant attributes; the adapter sweep gets there with the `bare` option.
- **Use cases naming their entry point after the domain report qualified.** The `bare` name lands on
  `execute`, so the twenty or so classes exposing `commitToGit()` or `getStandardVersion()` show up as
  `CommitToGitUseCase.commitToGit` — the same shape every service gets.
- **Adapters, controllers and free functions are not covered.** An adapter's delegating methods are
  not `async` — they `return this._useCase.execute(command)` — so the async-only rule skips them.
  Nothing is lost: the use-case span sits immediately beneath the Nest handler either way.
- **Only authenticated use cases carry `packmind.organization.id`** on their own span, from
  `AbstractMemberUseCase.spanAttributes()`. Filtering by tenant still works everywhere, because
  `startIncomingSpanHook` puts the same attribute on every request's root span.

`PACKMIND_OTEL_INSTRUMENT_METHODS=false` turns the whole layer off without losing tracing. It is read
straight off `process.env` at module load, not through `Configuration.getConfig()` — that is async,
and prototypes are patched during construction, long before such a promise would resolve.

> **This is a lot of spans**, and the adapter sweep widened it again — the endpoints that gained most
> are the ones that had nothing before, through `accounts`, `deployments` and `git`. A request that
> was 16 spans is now plausibly 60–100. Two consequences. The default `BatchSpanProcessor` queue is
> 2048 spans in 512-span batches, so under load spans start being dropped _silently_ — do not assume
> a trace is complete when chasing something under load. And `span_name` is a Prometheus label on
> `traces_spanmetrics_*`, so going from ~150 distinct names to well over a thousand multiplies active
> series, which bites hardest on Grafana Cloud. If either bites, reach for head sampling rather than
> for the repository layer.

### Doing it by hand

`withSpan()` covers what the automatic layer does not reach, or when you want a name of your own:

```ts
import { withSpan } from '@packmind/node-utils';

await withSpan('renderAgentFiles', async () => {
  // ...
});
```

It nests under whatever span is active, records the exception and sets the error status if the
callback throws, and ends the span on both paths. With no SDK running — unit tests, or the API started
without `OTEL_EXPORTER_OTLP_ENDPOINT` — `trace.getTracer()` returns a no-op tracer, so the callback
still runs and the cost is a function call. Nothing to guard, no reason to branch on whether tracing
is on. `instrumentMethods()` is built on it, so the two behave alike.

### What a trace looks like

`GET /organizations/:orgId/spaces/:spaceId/skills`, with every layer of the automatic instrumentation
visible:

```
GET /api/v0/organizations/:orgId/spaces/:spaceId/skills
  request handler - /api/v0/organizations/:orgId/spaces/:spaceId/skills
    OrganizationsSpacesSkillsController.getSkills
      getSkills
        ListSkillsBySpaceUseCase                            ← scope=packmind, class-named
          ListSkillsBySpaceUseCase.validateMemberAccess
            ListSkillsBySpaceUseCase.fetchUser              ← private, and inherited
            ListSkillsBySpaceUseCase.fetchOrganization
          ListSkillsBySpaceUseCase.executeForMembers        ← space-membership check
            ListSkillsBySpaceUseCase.executeForSpaceMembers
              SkillService.listSkillsBySpace
                SkillRepository.findBySpaceId               ← the database call
```

Two things this shows. Member and space-membership validation each cost a database round trip before
the read the caller asked for — the kind of thing only a use-case-level span makes visible. And
`fetchUser` is `private`, declared on `AbstractMemberUseCase` rather than on the subclass, and wrapped
by nothing in the source, yet it still gets a span named after the concrete use case:

```
{ name = "ListSkillsBySpaceUseCase.fetchUser" }
```

> This shape is derived from the code, not pasted out of Tempo. Re-capture it from a real trace next
> time the stack is up.

### Filtering by organization and space

Requests carrying an organization or a space in their path get `packmind.organization.id` and
`packmind.space.id`, so a customer's traces are one query away. Both are set in two places on
purpose:

- **The root span**, by `startIncomingSpanHook` on `instrumentation-http`. This is the one that
  matters for navigation — Tempo's trace list and the Drilldown filters read root spans, so an
  attribute that only exists deeper down is findable in TraceQL but leaves the list unfilterable. The
  hook runs at span creation, before auth, so it has nothing but the URL and matches a strict UUID
  shape: a literal `:orgId` or a slug never lands in an attribute. Requests with neither get none.
- **The use-case span**, from the validated command. `AbstractMemberUseCase` sets the organization
  before access validation rather than after, so a rejected request stays attributable to whoever
  made it.

Space ids need a seam on the use-case side, because `spaceId` lives on `SpaceMemberCommand` and not on
`PackmindCommand`. So `AbstractMemberUseCase` exposes a protected `spanAttributes(command)` that the
space-scoped bases override:

```ts
protected override spanAttributes(command: Command): Attributes {
  return {
    ...super.spanAttributes(command),
    ...(command.spaceId && { 'packmind.space.id': command.spaceId }),
  };
}
```

Override that when a use case base gains another dimension worth filtering on — it keeps span
concerns inside `execute()` instead of subclasses reaching for `trace.getActiveSpan()` from a nested
call. The conditional spread is deliberate: the SDK does drop `undefined` attribute values silently
(verified), but spreading conditionally means a reader does not have to know that to see the intent.

**What else belongs on a span.** `organizationId` and `spaceId` qualify because they are tenant
identifiers and are _already_ in the backend: the winston transport turns every `PackmindLogger`
metadata key into a Loki label, so those log lines carry them regardless. Spans add no new exposure.
That reasoning does not generalise — `userId`, emails and the like stay off. Before reaching for
`span.setAttribute`, apply the test: traces are retained and queryable by anyone with Grafana access.

> **Do not turn tenant ids into span-metrics dimensions.** They are precisely the cardinality that
> wrecks a Prometheus instance. Tempo indexes span attributes and is built for high cardinality;
> Prometheus is not.

While you are here, note the other half of that finding: because _every_ logger metadata key becomes
a Loki label, per-request values like `connectionId` become unbounded label cardinality on the Loki
side. Loki wants those in the line, not in a label.

## Moving to a hosted backend

Because the API speaks plain OTLP, swapping backends is a config change, not a code change — point
`OTEL_EXPORTER_OTLP_ENDPOINT` somewhere else. Grafana Cloud, SigNoz, Jaeger, Uptrace and any other
OTLP-native backend all work. Datadog accepts OTLP through its Agent, a Collector with the `datadog`
exporter, or direct intake — with the caveat that OTel data cannot drive some Datadog proprietary
products (Continuous Profiler, App & API Protection, Database Monitoring), which want `dd-trace`.

For Grafana Cloud specifically, **env vars alone are enough for traces and logs:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<region>.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64 of instanceID:token>
```

The SDK reads `OTEL_EXPORTER_OTLP_HEADERS` natively — verified by pointing the built API at an
endpoint requiring auth and confirming the header arrives on `/v1/traces` and `/v1/logs`.

> **These must be real environment variables**, not values fetched at runtime.
> `Configuration.getConfig()` is async and may call Infisical, so the SDK would start only once that
> promise resolved — after ioredis, express and winston were already required and therefore never
> patched. Nothing crashes; you silently get no spans. Only the header is sensitive, and the prod
> entrypoint already exports Docker secrets before `exec node main.js` (Kubernetes does the same
> through a `secretKeyRef`).

**What needs actual work:**

1. **Span metrics must be switched on.** The RED dashboards depend on `traces_spanmetrics_*`, which
   otel-lgtm's Tempo generates locally. In Grafana Cloud the metrics-generator is a per-stack setting,
   off by default, and its series are billed as active series.
2. **Datasource uids differ.** The bundled dashboard uses a `${ds}` variable rather than a hardcoded
   uid precisely so it can be repointed — pick the Cloud Prometheus datasource from the dropdown.
3. **Volume becomes a bill.** An early measurement on 50 requests against the simplest endpoint gave
   **6.4 KB of traces and 7.4 KB of logs per request**, uncompressed OTLP/JSON — roughly 360 GB/month
   at 10 req/s, against a 50 GB free tier. Treat both halves as out of date: the method-span layer has
   since multiplied the trace side several times over, and dropping the pg spans took some of it back.
   Re-measure before sizing a plan.

   The shape of the finding still holds, though, and it is the useful part: **logs cost at least as
   much as traces, and trace sampling does nothing about them.** Filtering logs to `warn` and above
   buys more than sampling and costs no diagnostic power, since the traces stay complete.

   On sampling itself, prefer **tail sampling in a collector** over `OTEL_TRACES_SAMPLER=traceidratio`.
   Head sampling decides at random when the trace starts, so it drops 90% of the errors and slow
   requests too — the ones you wanted — and Tempo's metrics-generator only sees what arrives, so rates
   and percentiles end up computed on the sample. A collector sees 100%, decides once the trace is
   complete (keep every error, keep everything over 800 ms, keep ~5% of the rest), and can compute
   span metrics _before_ sampling so they stay exact. The cost is one more component to run.

4. **Sentry still overlaps** — see the gotcha below.

## Gotchas

- **Sentry also uses OpenTelemetry.** `@sentry/nestjs` v10 sets up its own tracer provider, so running
  both without coordination gives two competing providers. Today they never overlap (`SENTRY_DSN_API`
  is unset locally, `OTEL_EXPORTER_OTLP_ENDPOINT` is unset in production). Enabling both in one
  environment requires Sentry's `skipOpenTelemetrySetup: true` plus its `SentrySampler` /
  `SentryPropagator` / `SentryContextManager`.
- **The image tag is pinned** (`0.30.2`). Its bundled Grafana provisioning and collector config are
  internal details that change between releases; bump deliberately, not automatically.
- **Tempo cannot back an alert rule.** Its datasource plugin declares `alerting: false`, so
  `{ traceDuration > 2s }` is a query and never a rule. See
  [Alerting on slow requests](#alerting-on-slow-requests).
- **The image's default notification policy points at a receiver that does not exist** (named
  `empty`), so out of the box a firing alert notifies nothing and explains nothing.
  `provisioning-alerting.yaml` replaces that root policy, which is why it defines `policies` and not
  just a contact point.
