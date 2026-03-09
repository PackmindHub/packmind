# GitHub MCP Tools Reference

## Search Pull Requests

**Tool**: `mcp__github__search_pull_requests`

Search for pull requests matching a query.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | GitHub search query (e.g., `is:pr is:merged merged:>2025-01-01 repo:owner/repo`) |
| `order` | string | No | Sort order: `asc` or `desc` (default: `desc`) |
| `page` | number | No | Page number for pagination (default: 1) |
| `per_page` | number | No | Results per page, max 100 (default: 30) |

### Response Fields

- `total_count` - total number of matching PRs
- `items[]` - array of PR objects
  - `number` - PR number
  - `title` - PR title
  - `html_url` - web URL
  - `user.login` - author login
  - `merged_at` - merge timestamp
  - `body` - PR description

### Query Syntax for Merged PRs

```
is:pr is:merged merged:>YYYY-MM-DD repo:owner/repo
```

Date qualifier uses ISO 8601 format. Supports `>`, `>=`, `<`, `<=`, and `..` range.

---

## Read Pull Request Data

**Tool**: `mcp__github__pull_request_read`

Read various data from a specific pull request.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `pullNumber` | number | Yes | PR number |
| `method` | string | Yes | One of: `get_review_comments`, `get_reviews`, `get_comments` |

### Methods

#### `get_review_comments`

Returns inline code review comments (comments attached to specific lines in the diff).

Response fields per comment:
- `id` - comment ID
- `body` - comment text
- `path` - file path the comment is on
- `diff_hunk` - surrounding diff context
- `user.login` - comment author
- `author_association` - relationship to repo (`OWNER`, `MEMBER`, `CONTRIBUTOR`, `COLLABORATOR`, `BOT`, `NONE`)
- `created_at` - timestamp
- `html_url` - web URL
- `in_reply_to_id` - parent comment ID (for threaded replies)

#### `get_reviews`

Returns top-level PR reviews (approve/request changes/comment).

Response fields per review:
- `id` - review ID
- `body` - review body text
- `state` - `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`, `DISMISSED`
- `user.login` - reviewer
- `author_association` - relationship to repo

#### `get_comments`

Returns issue-level comments on the PR (not attached to specific code lines).

Response fields per comment:
- `id` - comment ID
- `body` - comment text
- `user.login` - author
- `author_association` - relationship to repo
- `created_at` - timestamp
