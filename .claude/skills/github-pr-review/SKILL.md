---
name: github-pr-review
description: Manually triggered skill that harvests PR review comments from a GitHub repository using MCP tools, classifies them for playbook relevance, and auto-invokes packmind-update-playbook with structured findings. Use when wanting to mine merged PR reviews for recurring patterns, missing conventions, or stale rules that should be captured in the Packmind playbook. Supports non-interactive mode via `CI=true` or `--non-interactive` for scheduled GitHub Actions runs.
---

# GitHub PR Review Mining

Harvest code review comments from merged GitHub pull requests, classify them for playbook relevance, and feed actionable findings into the `packmind-update-playbook` workflow.

**Workflow: Phase 0 → 1 → 2 → 3 → 4 → 5. Follow every phase in order.**

> **Prerequisite**: The GitHub MCP server must be available. Load `references/github-mcp-tools.md` for tool signatures and parameters.

## Phase 0: Collect Parameters

Gather the required inputs before fetching any data.

### Execution Mode Detection

Determine the execution mode **before** collecting any parameters:

1. **Check `CI` env var**: run `echo $CI`. If the value is `true`, set `non_interactive = true`.
2. **Check skill arguments**: if the skill was invoked with `--non-interactive`, set `non_interactive = true`.
3. **Parse optional arguments**:
   - `--days N` — override the default time period (default: 7 days)
   - `--repo owner/repo` — override git remote inference

If neither condition is met, `non_interactive = false` (interactive mode — original behavior).

### Collect Parameters

1. **Infer `owner` and `repo`** from the git remote:
   ```bash
   git remote get-url origin
   ```
   Parse `owner/repo` from the URL.
   - **Interactive**: If the remote is unavailable or ambiguous, ask the user.
   - **Non-interactive**: If `--repo` was provided, use it. Otherwise abort with error: "Could not infer owner/repo from git remote. Use `--repo owner/repo`."

2. **Gather `time_period`**:
   - **Interactive**: Ask the user how far back to look (default: 7 days, max: 90 days).
   - **Non-interactive**: Use `--days` value if provided, otherwise default to 7 days silently.

   Compute the cutoff date as `today - time_period` in `YYYY-MM-DD` format.

3. **Confirm** before proceeding:
   - **Interactive**: Display and **BLOCK** until the user confirms:
     > "Mining PR reviews for **owner/repo** merged in the last **N days** (since YYYY-MM-DD). Proceed?"
   - **Non-interactive**: Log the parameters and proceed automatically:
     > "Non-interactive mode: mining PR reviews for **owner/repo** merged in the last **N days** (since YYYY-MM-DD)."

## Phase 1: Fetch Merged PRs

Use `mcp__github__search_pull_requests` with query:

```
is:pr is:merged merged:>YYYY-MM-DD repo:owner/repo
```

- Paginate at 30 per page, collect all PR numbers, titles, and URLs.
- If `total_count` is 0, inform the user and stop.
- Display progress: "Found **N** merged PRs to analyze."

## Phase 2: Fetch Review Comments

For each PR, call `mcp__github__pull_request_read` with `method: "get_review_comments"`.

### Filtering

Apply these filters to discard noise:

**Low-value filtering** — discard comments that:
- Are shorter than 15 characters
- Match low-value patterns: consists only of "LGTM", "+1", thumbs-up emoji variants, "nit", or "thanks"

**Thread deduplication** — when a comment has `in_reply_to_id`, keep only the root comment unless the reply adds substantive new feedback.

Display progress: "Collected **N** review comments from **M** PRs (after filtering)."

If no comments remain after filtering, inform the user and stop.

## Phase 3: Classify Comments

Categorize each remaining comment by playbook relevance:

### High relevance (keep)
- **convention** — Enforces or suggests a naming, structure, or organizational pattern
- **best-practice** — Recommends a better approach for correctness, performance, or maintainability
- **recurring-feedback** — Same feedback appears across 2+ different PRs
- **bug-prevention** — Points out a pattern that could lead to bugs

### Low relevance (discard)
- **style** — Pure formatting preference
- **clarification** — Asks a question without suggesting a change
- **nitpick** — Minor, one-off preference

Retain only High-relevance comments.

### Recurring Theme Detection

Group retained comments by semantic similarity. A **recurring theme** is 2+ comments across different PRs that address the same underlying pattern. For each theme:
- Assign a short descriptive label
- List all contributing comments
- Note the occurrence count

## Phase 4: Build Findings Report

Choose the output path based on execution mode:
- **Interactive**: `.claude/tmp/pr-review-findings.md`
- **Non-interactive**: `.claude/reports/pr-review-findings-YYYY-MM-DD.md` (using today's date, timestamped for CI artifact upload)

Create the target directory if needed.

### Report Structure

```markdown
# PR Review Findings Report

**Repository**: owner/repo
**Period**: YYYY-MM-DD to YYYY-MM-DD
**PRs analyzed**: N
**Comments collected**: N (after filtering)
**Actionable findings**: N

---

## Recurring Themes

### Theme: <label>
**Occurrences**: N across N PRs

| PR | File | Author | Comment |
|----|------|--------|---------|
| [#123](url) | path/to/file.ts | @author | Summary of comment |
| [#456](url) | path/to/other.ts | @author | Summary of comment |

**Suggested playbook action**: <Create standard | Update standard X | Create skill | ...>
**Rationale**: <Why this theme warrants a playbook change>

---

## Individual Findings

### Finding: <short description>
- **PR**: [#123](url)
- **File**: path/to/file.ts
- **Diff hunk**: (include relevant diff context)
- **Author**: @author
- **Comment**: Full comment text
- **Category**: convention | best-practice | bug-prevention
- **Suggested playbook action**: <action>
```

## Phase 5: Present and Hand Off

### Interactive mode

1. Display a summary to the user:
   - Number of recurring themes found
   - Number of individual findings
   - List of suggested playbook actions

2. Ask the user:
   > "Found **N recurring themes** and **M individual findings**. Review the full report at `.claude/tmp/pr-review-findings.md`. Proceed to update the playbook with these findings?"

3. **On confirm**: Invoke the `packmind-update-playbook` skill with the full report content as the intent. This maps to **Case B (explicit intent)** of that skill's Phase 0. Frame the intent as:
   > "Update the Packmind playbook based on the following PR review findings report: <full report content>"

4. **On decline**: Inform the user the report is available at `.claude/tmp/pr-review-findings.md` for manual review.

### Non-interactive mode

1. Display a summary (same as interactive: themes count, findings count, suggested actions).
2. Do **NOT** prompt the user. Do **NOT** invoke `packmind-update-playbook` (requires human review).
3. Log the final output path and stop:
   > "Report written to `.claude/reports/pr-review-findings-YYYY-MM-DD.md`."

## Resources

### references/
- `github-mcp-tools.md` — GitHub MCP tool signatures and parameters used by this skill
