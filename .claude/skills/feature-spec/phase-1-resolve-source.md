# Phase 1: Resolve Source & Decide Fork Routing

Detect the source type, fetch content, decide where the work will land (OSS fork or proprietary), and create the initial state directory.

## Input

User provides `task_input` — one of:
- GitHub issue: `#123`, `owner/repo#123`, or `https://github.com/.../issues/123`
- File path: `file:spec.md`, `path/to/spec.md`
- URL: `https://example.com/...`
- Direct prompt: any other text

## Steps

### 1.1 Detect Source Type

| Pattern | Source Type |
|---------|-------------|
| `#\d+` or `owner/repo#\d+` or `github.com/.../issues/` | github |
| `file:` prefix or readable file path with `.md`/`.txt`/`.json` extension | file |
| `https?://` (non-GitHub) | url |
| Anything else | prompt |

### 1.2 Generate Task Slug

Create `task_slug` from the user-provided title or first meaningful phrase:
- Convert to lowercase
- Replace spaces and special characters with hyphens
- Strip leading/trailing hyphens, collapse consecutive hyphens
- Keep it under 60 characters

### 1.3 Create State Directory

```bash
mkdir -p tmp/feature-specs/{task_slug}/
```

`tmp/` is git-ignored — these files never get committed.

### 1.4 Create Initial Spec File (DRAFT)

Write `tmp/feature-specs/{task_slug}/{task_slug}.md`:

```markdown
---
status: DRAFT
task_slug: {task_slug}
created: {ISO-8601 timestamp}
finished: null
---

# {task_name}

_Specification in progress. See state directory for current phase._
```

### 1.5 Fetch Content

Use the appropriate tool based on source type:

**GitHub:**
- If `gh` is available, use `gh issue view {issue_ref} --json title,body,labels,url,author`
- Otherwise use WebFetch on the issue URL
- Extract: `task_id` (e.g. `GH-{number}`), `task_name`, `task_description`, `task_url`, `labels`

**File:**
- Read the file with the Read tool
- `task_name` = first heading or filename; `task_description` = full body

**URL:**
- Use WebFetch
- Extract: `task_name`, `task_description`, `task_url`

**Prompt:**
- `task_description` = the raw input
- `task_name` = first line (truncated to ~80 chars)
- `task_id` = `PROMPT-{timestamp}`

### 1.6 Decide Fork Routing (Required)

Packmind ships from two repos:
- **OSS** (`../packmind`): public packages and features. **Most code changes go here.** After merge, the proprietary fork pulls from upstream automatically.
- **Proprietary** (this repo): closed-source extensions. Examples: `packages/editions` (forbidden import elsewhere), some `packages/deployments` proprietary flows, billing, enterprise auth.

Before continuing, classify the work using these heuristics:

| Signal | Likely target |
|--------|---------------|
| Touches `packages/editions/`, billing, license, enterprise auth, paid deploy flows | proprietary |
| Touches `apps/api`, `apps/frontend`, `apps/cli`, `apps/mcp-server`, or any package present in BOTH repos | oss |
| Mentions enterprise-only features or paid customers in the issue | likely proprietary |
| Public bug, generic feature, OSS-visible UI | oss |
| Unsure | ask the user |

Use `AskUserQuestion` to confirm:

```json
{
  "questions": [{
    "question": "Where should this feature be implemented?",
    "header": "Fork routing",
    "multiSelect": false,
    "options": [
      {"label": "OSS (../packmind) (Recommended)", "description": "Default for most work. Auto-merges into proprietary; you pull afterward."},
      {"label": "Proprietary (this repo)", "description": "Closed-source only: editions, paid deployments, enterprise features."},
      {"label": "Both (split)", "description": "Some tasks land on OSS, others on proprietary. Spec will split them in Phase 3."}
    ]
  }]
}
```

Record the answer as `target_repo` in `oss | proprietary | both`.

**If `target_repo == "oss"`**: verify the OSS repo exists at `../packmind`. If missing, warn the user and ask whether to proceed targeting proprietary instead.

### 1.7 Check for Existing Documentation

Look for prior work on the same topic:
- Glob: `tmp/feature-specs/*{task_slug_keyword}*/`
- Glob: `.claude/specs/*{task_slug_keyword}*.md` (existing design specs)
- Glob: `.claude/plans/*{task_slug_keyword}*.md` (existing plans)

If matches are found, read them and surface them in the summary so the user can decide whether to extend or supersede.

### 1.8 Update Spec Frontmatter

Update `tmp/feature-specs/{task_slug}/{task_slug}.md` with full metadata:

```markdown
---
status: DRAFT
task_slug: {task_slug}
task_id: {task_id}
source_type: {github | file | url | prompt}
source_url: {url or null}
task_name: {task_name}
target_repo: {oss | proprietary | both}
created: {ISO-8601 timestamp}
finished: null
---

# {task_name}

{task_description}

## Related Prior Work

{Optional: list of existing specs/plans found in step 1.7, or "None found."}
```

This frontmatter is the source of truth for task metadata. Phase progress is inferred from which output files exist in the directory — no separate state file needed.

## Task Summary

Display before proceeding:

```
**Phase 1 complete.** Source resolved.

**Task:** {task_name}
**ID:** {task_id}
**Source:** {source_type}
**Target repo:** {target_repo}
**Prior work:** {none | list of matched files}

{task_description (first 500 chars)}
```

## Next Phase

Proceed automatically to `phase-2-discovery-and-spec.md`.
