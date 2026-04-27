---
name: 'datadog-analysis'
description: 'Analyze Datadog error logs for Packmind production services (API, MCP server, Frontend), group them into patterns, perform root cause analysis against the codebase, and produce a structured bug report. This skill should be used when investigating production errors, triaging bugs, auditing service health, or performing periodic error reviews. Also triggers when the user mentions Datadog, production logs, error analysis, prod issues, service health, or asks about what errors are happening in prod. Also triggers on references to specific Datadog service names like api-proprietary, mcp-proprietary, or frontend-proprietary.'
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

1. **Grep for the error class or message** in the codebase using the Grep tool (e.g., `SpaceMembershipRequiredError`, `Recipe.*not found`)
2. **Read the source files** where the error is thrown
3. **Trace the call chain**: error class -> service/use case -> controller/adapter
4. **Identify the root cause**: missing error handling, wrong HTTP status, race condition, missing validation, Dockerfile misconfiguration, etc.

For frontend Nginx errors, check:
- `dockerfile/Dockerfile.frontend` for permission/ownership issues
- `dockerfile/nginx.k8s.conf`, `dockerfile/nginx.k8s.no-ingress.conf`, `dockerfile/nginx.compose.conf` for config issues
- `dockerfile/nginx-entrypoint.sh` for entrypoint issues

### Phase 4: Generate Report

Write the report to `datadog_{YYYY_MM_DD}.md` at the project root, where the date is today's date.

#### Report Structure

The report is organized with **one top-level section per application**, each containing its own issues:

```markdown
# Datadog Error Report

**Period**: {start_date} to {end_date} ({N} days)

---

# API (`api-proprietary`)

**Total error log lines**: ~{count}

| Day       | Error count |
|-----------|------------|
| {date}    | {count}    |

## 1. {Issue Title}

**Occurrences**: {frequency description}

**Datadog search pattern**:
```
service:api-proprietary status:error {specific pattern keywords}
```

**Description**: {What the error is and how it manifests}

**Root cause**: {Analysis with source file paths and line numbers from the codebase.}

**Source**: `{file_path}:{line_number}`

---

## 2. {Next Issue}
...

---

# MCP Server (`mcp-proprietary`)

**Total error log lines**: ~{count}

| Day       | Error count |
|-----------|------------|
| {date}    | {count}    |

## 1. {Issue Title}
...

---

# Frontend (`frontend-proprietary`)

**Total error log lines**: ~{count} (excluding Nginx [notice] noise)

| Day       | Error count |
|-----------|------------|
| {date}    | {count}    |

## 1. {Issue Title}
...
```

#### Ordering (within each section)

Sort issues by severity:
1. Infrastructure errors (Redis, database connectivity, Nginx permission errors)
2. Application bugs (unhandled exceptions returning 500, missing static assets)
3. External service failures (Amplitude, third-party APIs)
4. Deprecation warnings (Node.js, library deprecations)
5. Expected user errors logged at wrong level (failed logins)

#### Occurrence Labels

Use these labels based on the pattern:
- **ONCE** -- single occurrence in the period
- **{N} TIMES** -- N occurrences total, no clear daily pattern
- **{N} DAYS THIS WEEK** -- recurring across N distinct days
- **ALL {N} DAYS** -- present every day in the period
- **{N} lines, {M} day(s)** -- for high-volume infra errors, specify raw log line count and day spread

After writing the report, print a summary table covering all services:

| Service | # | Issue | Occurrences | Severity |
|---------|---|-------|-------------|----------|
| API | 1 | ... | ... | High/Medium/Low |
| MCP | 1 | ... | ... | High/Medium/Low |
| Frontend | 1 | ... | ... | High/Medium/Low |

## Known Error Patterns

### API (`api-proprietary`)

| Pattern | Datadog query | Codebase entry point |
|---------|--------------|---------------------|
| Redis connection failure | `service:api-proprietary status:error ETIMEDOUT OR ECONNREFUSED` | `ioredis` client, infra-level |
| Space membership check | `service:api-proprietary status:error SpaceMembershipRequiredError` | `packages/node-utils/src/application/AbstractSpaceMemberUseCase.ts` |
| Recipe not found | `service:api-proprietary status:error "Recipe" "not found"` | `packages/recipes/src/application/services/RecipeService.ts` |
| Artefact not found | `service:api-proprietary status:error "Artefact" "not found"` | `packages/playbook-change-management/src/application/services/validateArtefactInSpace.ts` |
| Sign-in failure | `service:api-proprietary status:error "Failed to sign in"` | `apps/api/src/app/auth/auth.controller.ts` |
| Onboarding status failure | `service:api-proprietary status:error "onboarding status"` | `apps/api/src/app/auth/auth.service.ts` |
| Amplitude tracking failure | `service:api-proprietary status:error Amplitude` | Amplitude Node.js SDK (external) |
| PG concurrent query | `service:api-proprietary status:error "client.query() when the client is already executing"` | `pg` driver through TypeORM |

### Frontend (`frontend-proprietary`)

| Pattern | Datadog query | Codebase entry point |
|---------|--------------|---------------------|
| Nginx PID unlink permission denied | `service:frontend-proprietary "unlink" "nginx.pid"` | `dockerfile/Dockerfile.frontend:17` + `dockerfile/nginx.*.conf:3` |
| Nginx notice logs misclassified | `service:frontend-proprietary status:error "[notice]"` | Datadog log pipeline config (not code) |