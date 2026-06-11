# Datadog MCP Server Reference

Reference guide for using the Datadog MCP server tools. Read this before making any Datadog MCP calls.

## Available Tools

### `mcp__datadog-mcp__search_datadog_logs`

**Purpose**: Search and retrieve raw log entries or log patterns. Best for viewing raw logs, discovering patterns, and discovering custom attributes.

**Key parameters**:
- `query` (required): Datadog search query using `key:value` syntax
- `from` / `to`: Time range. Use relative format `now-Xh`, `now-Xd`. Default: last 1 hour
- `use_log_patterns` (boolean): When `true`, clusters similar log messages into patterns with counts instead of returning raw logs. Essential for the initial discovery phase.
- `extra_fields` (array): Include extra attributes/tags. Use `["*"]` to get all metadata (tags, pod names, container info, etc.)
- `max_tokens`: Cap response size. Default 5000, use 10000 for pattern discovery
- `start_at`: Pagination offset for large result sets

**When to use**:
- Initial pattern discovery (`use_log_patterns: true`)
- Fetching full stack traces for specific errors
- Getting tag metadata with `extra_fields: ["*"]`

### `mcp__datadog-mcp__analyze_datadog_logs`

**Purpose**: Run SQL queries against logs. Best for aggregations, counts, group-bys, and time-series analysis.

**Key parameters**:
- `sql_query` (required): SQL against a virtual `logs` table
- `filter`: Datadog search query to pre-filter logs before SQL
- `from` / `to`: Time range (same format as search)
- `extra_columns`: Extend the `logs` table with typed columns from log attributes
- `max_tokens`: Default 10000

**Default columns**: `timestamp`, `host`, `service`, `env`, `version`, `status`, `message`

**When to use**:
- Counting errors by message, day, or host
- Time-series aggregations (`DATE_TRUNC`)
- Top-N queries

## Query Syntax

### Datadog Search Query (for `query` / `filter` parameters)

```
service:api-proprietary status:error              # Basic tag filtering
service:api-proprietary status:(error OR critical) # OR within a tag
"exact phrase match"                               # Quoted exact match
service:api-proprietary "Recipe" "not found"       # Multiple terms (AND)
@http.status_code:[400 TO 499]                     # Range on raw attribute
-version:beta                                      # Exclusion
service:web*                                       # Wildcard
```

### DDSQL (for `sql_query` parameter)

DDSQL is a PostgreSQL subset with restrictions:
- Every non-aggregated `SELECT` column must appear in `GROUP BY`
- `SELECT` aliases **cannot** be reused in `WHERE`, `GROUP BY`, or `HAVING` -- repeat the full expression instead
- Only declared table columns may be referenced
- Use `->` or `json_extract_path_text` for JSON access (cast as needed)
- Column names with special characters like `@` must be quoted: `SELECT "@foo" FROM logs`

**Unsupported**: `ANY()`, `->>`, `information_schema`, `current_timestamp`

**Common patterns**:

```sql
-- Count by message
SELECT message, count(*) as cnt FROM logs GROUP BY message ORDER BY cnt DESC LIMIT 50

-- Daily distribution
SELECT DATE_TRUNC('day', timestamp) as day, count(*) as cnt
FROM logs
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY DATE_TRUNC('day', timestamp)

-- Filter with LIKE
SELECT message, count(*) as cnt
FROM logs
WHERE message LIKE '%SpaceMembershipRequiredError%'
GROUP BY message ORDER BY cnt DESC LIMIT 10

-- Hourly breakdown
SELECT DATE_TRUNC('hour', timestamp) as hour, count(*) as cnt
FROM logs
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY DATE_TRUNC('hour', timestamp)
```

## Gotchas and Lessons Learned

### 1. Pattern search vs raw search return different formats

- `use_log_patterns: true` returns **TSV_DATA** with columns: `first_seen`, `last_seen`, `count`, `status`, `pattern`
- Raw search returns **TSV_DATA** or **YAML_DATA** with individual log entries
- Pattern search is much more useful for initial discovery -- always start with it

### 2. Datadog search does NOT support regex -- use LIKE in SQL as fallback

Queries like `"Recipe * not found"` with wildcards in quoted strings will return 0 results. Instead:
- Use multiple quoted terms: `"Recipe" "not found"` (matches logs containing both)
- Or use unquoted keywords: `Recipe not found` (matches as AND)
- Wildcards only work on tag values: `service:web*`

When `search_datadog_logs` still returns 0 results for a complex pattern, fall back to `analyze_datadog_logs` with `WHERE message LIKE '%pattern%'`. The SQL LIKE operator works on the raw message text and is more flexible than the search query syntax.

### 3. Multi-line stack traces are separate log entries

In Datadog, each line of a stack trace is typically a separate log entry. A single exception with a 10-line stack trace produces 10 log entries. This means:
- Raw log counts are inflated (one error = many log lines)
- Pattern discovery helps group these related lines
- To find the actual error message, filter for the line containing the exception class name (e.g., `ExceptionsHandler`)

### 4. ANSI escape codes appear in log messages

Production NestJS logs contain ANSI color codes like `[31m`, `[39m`, `[38;5;3m`. These appear in raw log output. When searching, ignore these codes -- they won't affect keyword matching but make messages harder to read visually.

### 5. The `extra_fields: ["*"]` option returns extensive tag metadata

Using `["*"]` returns all Kubernetes/cloud metadata (pod name, node, container, cluster, etc.). This is useful for:
- Identifying which pods are affected
- Determining if errors are node-specific
- Cross-referencing with infrastructure incidents

But it significantly increases response size -- only use when needed.

### 6. Time range format

- Relative: Must start with `now-` (e.g., `now-5d`, `now-24h`, `now-30m`)
- Absolute: ISO 8601 (e.g., `2026-04-10T00:00:00Z`)
- Default is `now-1h` which is too short for most analyses -- always set explicitly

### 7. Token limits and pagination

- Default `max_tokens` is 5000 for search and 10000 for analyze
- If results are truncated, the response includes `is_truncated: true` and a `truncation_message` with the next `start_at` offset
- For pattern discovery, 10000 tokens is usually sufficient
- For raw log fetching with `extra_fields`, reduce the number of results or increase max_tokens

### 8. DDSQL GROUP BY alias trap

This fails:
```sql
SELECT DATE_TRUNC('day', timestamp) as day, count(*) as cnt
FROM logs GROUP BY day  -- ERROR: 'day' alias not recognized
```

This works:
```sql
SELECT DATE_TRUNC('day', timestamp) as day, count(*) as cnt
FROM logs GROUP BY DATE_TRUNC('day', timestamp)  -- Repeat full expression
```

### 9. Storage tier for older logs

For logs older than the default retention period, use `storage_tier: "flex_and_indexes"` to also search Flex storage. This is only needed for the analyze tool; the search tool supports both `flex_and_indexes` and `online_archives_and_indexes`.
