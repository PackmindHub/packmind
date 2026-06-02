# Phase 3: Finalize Sprint

Run Nx quality gates on affected projects, produce the final report, optionally archive the spec.

## Prerequisites

- Phase 2 completed (all reachable groups completed or blocked)
- Per-group commits already created (or skipped) in each working repo

## Steps

### 3.1 Load Final State

Read `tmp/feature-specs/{task_slug}/implementation-plan.md`:
- Count `[x]` vs `[ ]`
- Find any `_(BLOCKED: ...)_` annotations

Read `tmp/feature-specs/{task_slug}/context.md`:
- `quality_gates` (lint/test/build flags + extras)
- `parallel_groups[]` to derive which Nx projects were touched

### 3.2 Resolve Affected Nx Projects

For each completed group, look at `target_files`:
- A path under `packages/{name}/` → Nx project `{name}`
- A path under `apps/{name}/` → Nx project `{name}`

Build a deduplicated set of `affected_projects[]`. Also note which **repo** each project belongs to (`oss` or `proprietary`) — gates run in the right repo.

If unsure or you want a broader gate, the Nx convention is:
```
./node_modules/.bin/nx affected -t lint
./node_modules/.bin/nx affected -t test
./node_modules/.bin/nx affected -t build
```
But narrowly targeting the specific projects is faster and clearer when you know them.

### 3.3 Run Quality Gates

For each `affected_project` × each gate flag in `quality_gates`:

```bash
# Always cd to the repo via -C; use absolute paths.
{ensure node version per .nvmrc, e.g. via nvm if available}

# Lint
./node_modules/.bin/nx lint {project}

# Test
./node_modules/.bin/nx test {project}

# Build (only if quality_gates.build is true)
./node_modules/.bin/nx build {project}
```

Set `PACKMIND_EDITION=proprietary` in the environment when running gates against the proprietary repo (per `CLAUDE.md`).

Capture for each: `passed: bool`, `duration`, truncated output.

If any extras are listed in `quality_gates.extra`, run them too (e.g., a project-specific e2e command).

### 3.4 Handle Gate Failures

If any gate fails, display the failure:

```
**Quality Gate Failed: {project} / {gate}**

Repo: {repo}
Command: {command}
Exit: {code}

{Last 30 lines of output}
```

Then use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Quality gate '{project}/{gate}' failed. How to proceed?",
    "header": "Gate Failed",
    "multiSelect": false,
    "options": [
      {"label": "Fix and retry (Recommended)", "description": "I'll fix the issue, then retry the gate"},
      {"label": "Spawn fixer subagent", "description": "Delegate the fix to a fresh general-purpose subagent in the right repo"},
      {"label": "Skip gate", "description": "Continue without this gate passing (risky)"},
      {"label": "Pause sprint", "description": "Stop here, investigate manually"}
    ]
  }]
}
```

- "Fix and retry" → wait for the user to make changes, then re-run the gate
- "Spawn fixer subagent" → launch an `Agent` with `subagent_type="general-purpose"`. Prompt: working repo, the failed command and output, the relevant files. Instruct it to make the smallest fix and re-run the gate. On success, commit the fix as a follow-up commit (with user approval, per the per-group commit policy).
- "Skip gate" → record skipped, continue
- "Pause sprint" → exit; progress is preserved in checkboxes + commits

### 3.5 Verify Final Checkbox State

Re-read `implementation-plan.md`:
- Count completed (`[x]`)
- Count remaining (`[ ]`) — these should all be annotated `_(BLOCKED: ...)_` or the sprint is incomplete

If any unblocked `[ ]` tasks remain, the sprint is not finished. Tell the user and offer to resume Phase 2.

### 3.6 Offer to Archive

```
**Sprint Complete: {task_slug}**

All reachable tasks executed, gates run, commits created.

Move spec artifacts to an archive folder? (Still in tmp/ — git-ignored.)
- From: tmp/feature-specs/{task_slug}/
- To:   tmp/feature-specs/done/{task_slug}/
```

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Move completed spec to tmp/feature-specs/done/?",
    "header": "Archive",
    "multiSelect": false,
    "options": [
      {"label": "Yes, archive", "description": "Move under tmp/feature-specs/done/ so /feature-spec sees a clean pending list"},
      {"label": "Keep in place (Recommended)", "description": "Leave it; you may want to revisit it"}
    ]
  }]
}
```

If "Yes, archive":
```bash
mkdir -p tmp/feature-specs/done/
mv tmp/feature-specs/{task_slug} tmp/feature-specs/done/{task_slug}
```

(No commit needed — `tmp/` is git-ignored.)

### 3.7 Pull Reminder (OSS → proprietary)

If any commits landed in the OSS repo (`oss_root`), remind the user:

```
✅ OSS commits created in {oss_root}.

When upstream auto-merges into the proprietary fork, run:
   git -C {proprietary_root} pull
to pick up the changes here.

If this feature has proprietary-only tasks pending (e.g., editions wiring), do that pull before resuming /feature-sprint {task_slug}.
```

Skip this section if `target_repo` was `proprietary`.

### 3.8 Final Report

```
## ✅ SPRINT COMPLETE

**Task**: {task_name}
**Slug**: {task_slug}
**Target repo**: {target_repo}

### Execution Summary

| Metric | Value |
|--------|-------|
| Tasks completed | {n}/{total} |
| Parallel groups | {completed_groups}/{total_groups} |
| Commits created | {commit_count} |
| Files modified | {file_count} |
| Quality gates | {passed}/{total} passed{, X skipped if any} |

### Commits

| Repo | Group | SHA | Message |
|------|-------|-----|---------|
| oss | A: backend-... | abc123 | ✨ feat(...): ... |
| oss | B: frontend-... | def456 | ✨ feat(...): ... |

### Quality Gates

| Project | Gate | Status | Duration |
|---------|------|--------|----------|
| standards | lint | ✅ | 4s |
| standards | test | ✅ | 22s |
| frontend | lint | ✅ | 8s |
| frontend | test | ✅ | 31s |

### Blocked Tasks

{if any:}
| ID | Reason |
|----|--------|
| 3.2 | {reason} |

{else: "None."}

### Files Modified

{abbreviated git status -s output per repo}

---

**Spec**: `tmp/feature-specs/{pending|done}/{task_slug}/`
**Plan**: `tmp/feature-specs/{pending|done}/{task_slug}/implementation-plan.md`

Sprint complete. Changes committed locally (not pushed).
```

### 3.9 Cleanup Session Tasks

```
for (taskId, sessionTaskId) in sessionTasks:
  TaskUpdate({ taskId: sessionTaskId, status: "completed" })
```

`sessionTasks` is ephemeral — nothing else to clean up.

## End of Sprint

To run another: `/feature-sprint {another_task_slug}`
To check overall progress: `/feature-sprint status`
