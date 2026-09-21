# Phase 2: Execute Sprint

Execute tasks via subagents with automatic sync-back and per-group commits. Runs autonomously after Phase 1 approval.

## Critical Rule: Subagent-Only Execution

**The main session MUST NOT implement tasks directly.** All implementation lives in Task subagents.

- Main session = orchestration (spawn agents, parse output, sync state, run commits)
- Subagents = implementation (read specs, write code, run small validation commands)

This keeps the main context clean and lets agents read heavily without poisoning your conversation.

## Prerequisites

- Phase 1 completed
- `execution_mode` chosen (parallel or sequential)
- `sessionTasks` map populated
- `groupedTasks` populated from `parallel_groups`

## Execution Modes

### Parallel Mode (Default)

Spawn Task subagents for ALL ready groups **simultaneously in a single message**. Agents run concurrently.

### Sequential Mode

Spawn Task subagents **one at a time**. Wait for each to complete before spawning the next. Used when:
- No `parallel_groups` defined (single sequential group)
- User chose "Sequential only" in Phase 1
- Only one ready group exists

## Steps

### 2.1 Identify Ready Groups

Call the bundled script — it reads `context.md` + `implementation-plan.md` and classifies every group as `ready | completed | partial | blocked`:

```bash
python3 .claude/skills/feature-sprint/scripts/resolve_ready_groups.py \
  tmp/feature-specs/{task_slug}/context.md \
  tmp/feature-specs/{task_slug}/implementation-plan.md
```

Output JSON contains `ready_group_ids[]` and per-group `status`/`completed_ids`/`blocked_ids`. Use this every iteration of the loop in step 2.10 — never hand-compute the readiness check.

### 2.2 Pick Working Directory per Group

For each ready group:

| group.repo | cwd |
|------------|-----|
| `oss` | `oss_root` from context (the OSS sibling at `../packmind`, resolved to absolute path at spec time) |
| `proprietary` | `proprietary_root` from context (the proprietary repo, the cwd when /feature-spec ran) |

This `cwd` is passed to the subagent's prompt as the *implementation root*. The subagent must Bash with absolute paths so it works regardless of the agent's own cwd.

### 2.3 Build Subagent Prompt

Read the bundled template once: `.claude/skills/feature-sprint/references/group-prompt-template.md`. Substitute the placeholders documented at the top of that file. For `{TASKS_BLOCK}`, concatenate the `raw_block` of each task in `group.task_ids` (from the Phase 1 `parse_implementation_plan.py` output) separated by blank lines.

Do not paraphrase the template — it is the authoritative contract subagents respond to (`TASK_COMPLETE`, `GROUP_COMPLETE`, `BLOCKED`, `FILES_MODIFIED` markers are parsed in step 2.5).

### 2.4 Spawn Subagents

**Parallel mode**: send a single message containing one `Agent` tool call per ready group. They run concurrently.

**Sequential mode**: send one `Agent` call, wait for it to return, then move to the next.

In both cases, set `subagent_type="general-purpose"`.

### 2.5 Parse Subagent Output

For each agent that returns, parse:

- `TASK_COMPLETE: {id}` markers — collect into `completed[]`
- `GROUP_COMPLETE: {id}` marker — group finished cleanly
- `BLOCKED: {id} - {reason}` markers — collect into `blocked[]`
- `FILES_MODIFIED: ...` — capture for the commit step

### 2.6 Sync Checkboxes to implementation-plan.md

Apply both completed and blocked updates in one pass via the bundled script:

```bash
python3 .claude/skills/feature-sprint/scripts/sync_checkboxes.py \
  tmp/feature-specs/{task_slug}/implementation-plan.md \
  --complete {comma-separated ids from completed[]} \
  --blocked  "{id1}:{reason1}" "{id2}:{reason2}"
```

`--blocked` takes one `id:reason` per argument (so reasons may contain commas freely). `--complete` is a single comma-joined ID list.

**Omit a flag entirely when its list is empty** — do not pass an unquoted empty value (`--complete `) since argparse will treat the next flag as the value. If `completed[]` and `blocked[]` are both empty, skip this step (nothing to sync).

The script returns JSON with `applied_complete`, `applied_blocked`, and `missing` (any task ID that didn't match — surface these as a warning; don't retry the agent). Exit code is `1` if anything was missing, `0` otherwise.

### 2.7 Update Claude Tasks

For every task in `completed[]`:

```
TaskUpdate({ taskId: sessionTasks[task_id], status: "completed" })
```

For tasks currently being executed but not yet complete (shouldn't normally happen here since groups are atomic), mark them `in_progress`.

### 2.8 Commit the Group

After the agent finishes (whether all tasks completed or some blocked), commit the changes if anything was modified:

1. Switch to the group's working repo (use absolute path):
   ```
   git -C {repo_root} status --short
   ```
   If nothing changed, skip the commit step for this group.

2. Stage only the files listed in `FILES_MODIFIED` (don't `git add -A`):
   ```
   git -C {repo_root} add {files...}
   ```

3. Build the commit message using the `git-commit-guidelines` skill conventions:
   - Gitmoji prefix (✨ for new features, 🐛 for fixes, ♻️ for refactor, ✅ for tests, etc.)
   - Conventional Commits format: `<type>(<scope>): <subject>`
   - NEVER use `Close`/`Fix #` keywords (no auto-closing of issues)
   - Body lists completed task IDs and references the spec slug
   - Include `Co-Authored-By: Claude <noreply@anthropic.com>`

   Template:
   ```
   {emoji} {type}({scope}): {one-line subject derived from group_name}

   Sprint group {group_id} ({group_name}) for feature `{task_slug}`.

   Completed tasks:
   - {1.1}: {description}
   - {1.2}: {description}

   Refs: tmp/feature-specs/{task_slug}/

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

4. Show the message to the user and ask for approval:

   ```json
   {
     "questions": [{
       "question": "Commit group {group_id} ({group_name})?",
       "header": "Commit",
       "multiSelect": false,
       "options": [
         {"label": "Commit (Recommended)", "description": "Apply the proposed message"},
         {"label": "Edit message", "description": "Provide a new commit message"},
         {"label": "Skip commit", "description": "Leave changes staged for manual commit later"}
       ]
     }]
   }
   ```

5. On approval, run:
   ```
   git -C {repo_root} commit -m "$(cat <<'EOF'
   {message}
   EOF
   )"
   ```

   If a pre-commit hook fails, do NOT use `--no-verify`. Fix the underlying issue or pass control back to the user.

### 2.9 Refresh Group Status

Group status is derived from checkbox state on the next call to `resolve_ready_groups.py` — no in-memory bookkeeping required. The sync step in 2.6 is the only state mutation.

### 2.10 Loop Until No Ready Groups Remain

After each round, re-run `resolve_ready_groups.py` (it reads from disk, so it picks up the sync from 2.6):

1. If `ready_group_ids[]` is non-empty → repeat steps 2.3–2.8 for the new ready groups
2. If `ready_group_ids[]` is empty AND `all_completed` is false → every remaining group is blocked (status `blocked` or `partial`). Report blockers and exit to Phase 3.
3. If `all_completed` is true → proceed to Phase 3.

### 2.11 Final Sync Summary

Before handing off to Phase 3, print a summary:

```
**Execution Phase Complete**

| Group | Repo | Tasks | Status | Commit |
|-------|------|-------|--------|--------|
| A: backend-{domain} | oss | 3/3 | ✅ Complete | abc123 |
| B: frontend-{domain} | oss | 2/2 | ✅ Complete | def456 |
| C: tests | oss | 1/2 | 🔄 Partial | ghi789 |

Total: {completed}/{total} tasks done
Blocked: {list of blocked task IDs with reasons}
```

## Error Recovery

| Scenario | Action |
|----------|--------|
| Agent times out | Sync completed tasks, mark group `partial`, continue |
| Agent crashes | Sync completed tasks, log the error, pause sprint and ask user |
| Lint/test fails inside subagent | Subagent should self-correct; if it can't, it emits `BLOCKED` |
| File conflict (group A writes while group B is reading) | Shouldn't happen if Phase 3D grouping was correct. If it does: pause, report, ask user to resolve |
| All ready groups are blocked | Pause sprint, report blockers, suggest fixes |
| `git commit` fails | Surface the error verbatim; do NOT retry with `--no-verify` |

## Handling Interruption

If the session is killed mid-sprint:
- Completed tasks already have `[x]` in `implementation-plan.md`
- Blocked tasks have the `_(BLOCKED: ...)_` annotation
- Re-running `/feature-sprint {task_slug}` resumes from those checkboxes

## Next Phase

After all reachable groups are completed or blocked, read `phase-3-finalize.md`.
