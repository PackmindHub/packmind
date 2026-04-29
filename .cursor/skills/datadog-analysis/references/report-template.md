# Datadog Report Template

Output path, scaffold, ordering, and labels for the Phase 4 report.

## Output path

Write the report to `datadog_{YYYY_MM_DD}.md` at the project root, where the date is today's date.

## Report structure

The report is organized with **one top-level section per application**, each containing its own issues:

````markdown
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
````

## Ordering (within each section)

Sort issues by severity:
1. Infrastructure errors (Redis, database connectivity, Nginx permission errors)
2. Application bugs (unhandled exceptions returning 500, missing static assets)
3. External service failures (Amplitude, third-party APIs)
4. Deprecation warnings (Node.js, library deprecations)
5. Expected user errors logged at wrong level (failed logins)

## Occurrence labels

Use these labels based on the pattern:
- **ONCE** -- single occurrence in the period
- **{N} TIMES** -- N occurrences total, no clear daily pattern
- **{N} DAYS THIS WEEK** -- recurring across N distinct days
- **ALL {N} DAYS** -- present every day in the period
- **{N} lines, {M} day(s)** -- for high-volume infra errors, specify raw log line count and day spread

## Summary table

After writing the report, print a summary table covering all services:

| Service | # | Issue | Occurrences | Severity |
|---------|---|-------|-------------|----------|
| API | 1 | ... | ... | High/Medium/Low |
| MCP | 1 | ... | ... | High/Medium/Low |
| Frontend | 1 | ... | ... | High/Medium/Low |
