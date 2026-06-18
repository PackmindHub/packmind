# Phase 1: Initialize Sprint

Load the feature spec, hydrate Claude Tasks, detect parallel groups, decide OSS-vs-proprietary execution roots, get user approval.

## Prerequisites

- Feature spec exists at `tmp/feature-specs/{task_slug}/`
- Spec `status: COMPLETE`

## Steps

### 1.1 Resolve Task Slug

Extract `{task_slug}` from user input. If not provided:

```bash
ls tmp/feature-specs/
```

For each candidate directory, read `{slug}.md` YAML frontmatter:
- Skip directories without `status: COMPLETE`
- Capture `task_name`, `source_type`, `target_repo`

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Which feature spec do you want to sprint?",
    "header": "Task",
    "multiSelect": false,
    "options": [
      {"label": "{slug-1}", "description": "[{target_repo}] {task_name}"},
      {"label": "{slug-2}", "description": "[{target_repo}] {task_name}"}
    ]
  }]
}
```

If `tmp/feature-specs/` has no COMPLETE specs, tell the user to run `/feature-spec` first.

### 1.2 Load Specification Files

Read from `tmp/feature-specs/{task_slug}/`:

1. **`{task_slug}.md`** — Read YAML frontmatter, verify `status: COMPLETE`. If DRAFT or missing, error and stop.

2. **`context.md`** — Extract YAML frontmatter fields:
   - `version` (≥ 1.0)
   - `target_repo` (`oss | proprietary | both`)
   - `oss_root`, `proprietary_root`, `discovery_root`
   - `parallel_groups[]` (may be empty for trivial features)
   - `quality_gates` (`lint`, `test`, `build`, `extra`)

3. **`implementation-plan.md`** — Parse via the bundled script (do NOT hand-roll the regex; it must handle the `_(BLOCKED: …)_` annotation and indented metadata blocks):

   ```bash
   python3 .claude/skills/feature-sprint/scripts/parse_implementation_plan.py \
     tmp/feature-specs/{task_slug}/implementation-plan.md
   ```

   Output is JSON: `{tasks: [{id, completed, description, metadata, blocked_reason, raw_block}], summary}`. Keep each task's `raw_block` — Phase 2 pastes it verbatim into the subagent prompt.

### 1.3 Verify Repos Exist

For each parallel group, check the repo it targets exists:

- `repo: oss` → confirm `oss_root` directory exists (the OSS sibling, typically `realpath ../packmind` from the proprietary repo)
- `repo: proprietary` → confirm `proprietary_root` exists (the current working directory when /feature-spec was run)

If a required repo is missing, ask the user:

```json
{
  "questions": [{
    "question": "OSS repo at `{oss_root}` is missing. How to proceed?",
    "header": "Missing repo",
    "multiSelect": false,
    "options": [
      {"label": "Abort", "description": "Cancel sprint; user will set up the repo"},
      {"label": "Switch to proprietary", "description": "Run all groups in this repo regardless of repo tag"},
      {"label": "Skip OSS groups", "description": "Only execute groups tagged proprietary"}
    ]
  }]
}
```

### 1.4 Map Tasks to Groups

If `context.md` has non-empty `parallel_groups`:

```javascript
const groupedTasks = {};
for (const group of parallel_groups) {
  groupedTasks[group.group_id] = {
    name: group.group_name,
    tasks: group.task_ids,
    target_files: group.target_files,
    repo: group.repo,
    blocked_by: group.blocked_by ?? [],
    status: 'pending',
  };
}
```

If `parallel_groups` is empty, create a single sequential group covering all tasks, using `target_repo` from context for `repo`.

### 1.5 Detect Resume State

Use the plan-wide totals (`completed`, `pending`, `total`, `percent`) from the `summary` field already returned by `parse_implementation_plan.py`.

For the **per-group** breakdown table below, also run the readiness resolver and use each group's `completed_ids`/`task_ids` lengths:

```bash
python3 .claude/skills/feature-sprint/scripts/resolve_ready_groups.py \
  tmp/feature-specs/{task_slug}/context.md \
  tmp/feature-specs/{task_slug}/implementation-plan.md
```

Map each `groups[*]` entry to a row — `Tasks = len(task_ids)`, `Completed = len(completed_ids)`, `Status` from `status` (`ready` → ✅ Ready / 🔄 Partial / ⏳ Blocked / ✅ Done).

If any tasks are already completed:

```
**Resuming Sprint: {task_slug}**

Previous progress:
- Completed: {n}/{total} ({percent}%)
- Pending: {pending}

| Group | Repo | Tasks | Completed | Status |
|-------|------|-------|-----------|--------|
| A: {name} | oss | 3 | 3 | ✅ Done |
| B: {name} | oss | 2 | 1 | 🔄 Partial |
| C: {name} | oss | 2 | 0 | ⏳ Blocked (after A, B) |
```

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Resume sprint from previous progress?",
    "header": "Resume",
    "multiSelect": false,
    "options": [
      {"label": "Continue (Recommended)", "description": "Resume from {completed}/{total} done"},
      {"label": "Restart", "description": "Reset all checkboxes to [ ] and start over"}
    ]
  }]
}
```

If "Restart": rewrite `implementation-plan.md` replacing every `- [x]` with `- [ ]` and stripping any `_(BLOCKED: …)_` annotations (a single `sed` pass is fine since this is destructive on purpose).

### 1.6 Pull-Before-Sprint (proprietary only)

If `target_repo` is `proprietary` or `both`:

Remind the user (informational, no gate):
```
Heads up: most OSS work auto-merges into this proprietary fork.
Before starting, you may want to run `git pull` here so the fork is up to date.
```

If `target_repo` is `oss` only, skip this reminder.

### 1.7 Hydrate Claude Tasks

For visual feedback, use `TaskCreate` for each pending task:

```
TaskCreate({
  subject: `${task.id}: ${task.description}`,
  description: `Repo: ${task.repo} | Layer: ${task.layer} | Files: ${task.files}`,
  activeForm: `Implementing ${task.id}...`,
})
```

Capture each returned task ID into a `sessionTasks` map keyed by `task.id`.

### 1.8 Set Up Task Dependencies

For each group with `blocked_by`:

```
for blockerGroupId in group.blocked_by:
  for taskId in group.tasks:
    TaskUpdate(
      taskId: sessionTasks[taskId],
      addBlockedBy: blockerGroup.tasks.map(t => sessionTasks[t])
    )
```

This is purely visual — the actual execution gating is enforced in Phase 2 by ready-group selection.

### 1.9 Display Execution Plan

```
**Sprint Ready: {task_slug}**

**Target repo:** {target_repo}
**Tasks:** {pending}/{total} pending ({completed} already done)

**Parallel Execution Plan:**
| Group | Repo | Tasks | Status | Dependencies |
|-------|------|-------|--------|--------------|
| A: {name} | oss | {ids} | ✅ Ready | None |
| B: {name} | oss | {ids} | ✅ Ready | None |
| C: {name} | oss | {ids} | ⏳ Blocked | After A, B |

**Quality gates (final phase):** Nx lint / test / build on affected projects
**Commit strategy:** one commit per group via git-commit-guidelines
```

### 1.10 Authorize Subagent File Edits

Phase 2 spawns Agent subagents that call Edit / Write / Bash on files in the target repo. **Subagents inherit the parent session's permission mode** — in default mode every tool call pauses for approval, which serializes parallel execution and stalls the sprint.

**Before continuing, the user must enable auto-accept mode in the Claude Code TUI** (`Shift+Tab` cycles through modes; pick "accept edits" or "bypass permissions"). The orchestrator cannot toggle this on the user's behalf.

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Confirm auto-accept (Shift+Tab) is enabled so subagents can edit files without prompts?",
    "header": "Authorize",
    "multiSelect": false,
    "options": [
      {"label": "Yes, ready to sprint", "description": "Auto-accept is on; subagents will edit files without per-call prompts"},
      {"label": "Not yet — cancel", "description": "Stop the sprint; I'll toggle auto-accept and re-run /feature-sprint"}
    ]
  }]
}
```

If "Not yet — cancel": stop and leave state untouched. Otherwise continue to §1.11.

### 1.11 Get Approval

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Start sprint execution?",
    "header": "Sprint",
    "multiSelect": false,
    "options": [
      {"label": "Start parallel (Recommended)", "description": "Execute all ready groups in parallel via subagents"},
      {"label": "Sequential only", "description": "One group at a time — slower but easier to debug"},
      {"label": "Cancel", "description": "Don't start"}
    ]
  }]
}
```

Do not continue until the user confirms.

- "Start parallel" → set `execution_mode = "parallel"`
- "Sequential only" → set `execution_mode = "sequential"`
- "Cancel" → stop, leave state untouched

### 1.12 Proceed

Read `phase-2-execute.md` and continue.
