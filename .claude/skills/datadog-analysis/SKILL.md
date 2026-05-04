---
name: 'datadog-analysis'
description: 'Analyze Datadog error logs for Packmind production services (api-proprietary, mcp-proprietary, frontend-proprietary), group them into patterns, root-cause against the codebase, and produce a structured bug report. Triggers on Datadog, production logs, prod errors, service health, or periodic error reviews.'
---

# Datadog Analysis

Analyze production error logs from Packmind Datadog services, group them into patterns, cross-reference stack traces with the codebase, and produce a structured markdown report with root causes and Datadog search patterns.

## Prerequisites

- The Datadog MCP server must be connected. If not connected, prompt the user to run `/mcp` first.
- Read `references/datadog_mcp.md` before making any MCP tool calls for guidance on tool usage, gotchas, and known pitfalls.

## Services

The analysis covers three production services. Each maps to a Datadog service name, a codebase location, and a Dockerfile:

| Datadog service | App | Codebase | Dockerfile | Runtime |
|----------------|-----|----------|------------|---------|
| `api-proprietary` | API | `apps/api/` + all `packages/` | `dockerfile/Dockerfile.api` | Node.js (NestJS, TypeORM, Redis/ioredis, BullMQ) |
| `mcp-proprietary` | MCP Server | `apps/mcp-server/` + all `packages/` | `dockerfile/Dockerfile.mcp` | Node.js (tree-sitter, SSE) |
| `frontend-proprietary` | Frontend | `apps/frontend/` | `dockerfile/Dockerfile.frontend` | Nginx (static SPA serving) |

Root cause analysis should trace errors back to source files in the monorepo. For Nginx (frontend), also check the Nginx configs in `dockerfile/nginx.*.conf` and the entrypoint `dockerfile/nginx-entrypoint.sh`.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Days to analyze | 7 | Number of past days to look at. Override by user request (e.g., "last 3 days") |

## Exclusions

The following log patterns should be **discarded** and not included in the report. Skip them during pattern discovery and do not count them as errors:

- `(node:1) [DEP0060] DeprecationWarning: The util._extend API is deprecated. Please use Object.assign() instead.` -- Known Node.js deprecation from a transitive dependency. Noise, not actionable. Filter with `-DEP0060`.

- Nginx stale asset 404s (`open() "/usr/share/nginx/html/assets/..." failed (2: No such file or directory)`) -- Expected SPA behavior after deployments. Browsers with a cached `index.html` request old hashed JS chunks that no longer exist. Not a bug. Filter with `-"No such file or directory" -"/assets/"` on `frontend-proprietary`.

When filtering in Phase 1, exclude these patterns from the analysis by appending the exclusion terms to Datadog queries, or remove them during report consolidation.

## Workflow

### Phase 1: Discover Error Patterns (all services in parallel)

For **each** of the three services, launch two parallel MCP calls (6 calls total, all in parallel). If rate-limited by the MCP server, fall back to batching 2 calls per service sequentially.

Every Datadog MCP call requires a `telemetry` object with an `intent` string describing the call's purpose (e.g., `{"intent": "Discover error patterns for api-proprietary over last 7 days"}`). Keep intents concise and avoid including PII or secrets.

1. **Pattern discovery** -- Use `mcp__datadog-mcp__search_datadog_logs` with:
   - `query`: `service:{service_name} status:(error OR critical OR emergency)`
   - `from`: `now-{N}d` (where N = number of days, default 7)
   - `use_log_patterns`: `true`
   - `max_tokens`: `10000`

2. **Error message counts** -- Use `mcp__datadog-mcp__analyze_datadog_logs` with:
   - `filter`: `service:{service_name} status:(error OR critical OR emergency)`
   - `sql_query`: `SELECT message, count(*) as cnt FROM logs GROUP BY message ORDER BY cnt DESC LIMIT 50`
   - `from`: `now-{N}d`
   - `max_tokens`: `10000`

From these results, identify the distinct error groups per service. If a service has zero errors in the period, mention "No issues found" in the report and skip Phases 2-3 for that service.

### Phase 2: Deep Dive Each Error Group

For each distinct error group identified in Phase 1:

1. **Fetch raw logs** -- Use `search_datadog_logs` with a targeted query to get full stack traces and context. Use `extra_fields: ["*"]` for tag metadata when useful.

2. **Get daily distribution** -- Use `analyze_datadog_logs` with:
   - `sql_query`: `SELECT DATE_TRUNC('day', timestamp) as day, count(*) as cnt FROM logs WHERE message LIKE '%<pattern>%' GROUP BY DATE_TRUNC('day', timestamp) ORDER BY DATE_TRUNC('day', timestamp)`

3. **Count occurrences** -- Use `analyze_datadog_logs` to get total unique occurrences grouped by message.

Parallelize independent MCP calls wherever possible to save time.

#### Frontend-Specific Notes

For `frontend-proprietary`, Nginx writes all `error_log` output (including `[notice]`) to stderr. Datadog classifies stderr as `status:error`. Filter out Nginx lifecycle noise:
- Ignore patterns containing `[notice]` (worker start/stop, SIGQUIT, SIGCHLD, SIGIO) -- these are normal Nginx operations misclassified as errors
- Focus on `[error]` (404s for missing files) and `[alert]` (permission issues, config errors)

### Phase 3: Codebase Root Cause Analysis

For each application-level error (not infra/external):

Before grepping, consult `references/known_patterns.md` — if the error matches a catalogued pattern, jump straight to its entry point and skip to step 2.

1. **Grep for the error class or message** in the codebase using the Grep tool (e.g., `SpaceMembershipRequiredError`, `Recipe.*not found`)
2. **Read the source files** where the error is thrown
3. **Trace the call chain**: error class -> service/use case -> controller/adapter
4. **Identify the root cause**: missing error handling, wrong HTTP status, race condition, missing validation, Dockerfile misconfiguration, etc.

For frontend Nginx errors, check:
- `dockerfile/Dockerfile.frontend` for permission/ownership issues
- `dockerfile/nginx.k8s.conf`, `dockerfile/nginx.k8s.no-ingress.conf`, `dockerfile/nginx.compose.conf` for config issues
- `dockerfile/nginx-entrypoint.sh` for entrypoint issues

### Phase 4: Generate Report

Read `references/report-template.md` before writing the report for the output path, scaffold, severity ordering, occurrence labels, and final summary table.