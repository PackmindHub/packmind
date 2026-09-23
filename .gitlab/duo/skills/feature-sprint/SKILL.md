---
name: 'feature-sprint'
description: 'Execute the implementation plan produced by /feature-spec. Loads tasks from tmp/feature-specs/{slug}/implementation-plan.md, hydrates them as Claude Tasks, runs parallel groups via subagents in the correct repo (OSS sibling at ../packmind or the proprietary repo in cwd), syncs progress back to checkboxes, commits per group, and runs Nx quality gates. Resumable across sessions via checkbox state.'
---

# Feature Sprint Skill

Execute a Packmind feature implementation plan via subagents with automatic parallel execution and sync-back. Companion to `/feature-spec`.

## When to Use

| Scenario | Use feature-sprint | Use plan + architect-executor |
|----------|--------------------|-----------------------------------|
| Fast execution of an already-specified feature | ✅ | ❌ |
| Parallel group execution | ✅ | partial |
| Multi-repo (OSS + proprietary) execution | ✅ | ❌ |
| Heavy TDD enforcement, per-task escalation | ❌ | ✅ |
| Specs in `tmp/feature-specs/` (this flow) | ✅ | ❌ |
| Specs in `.claude/specs/` and `.claude/plans/` | ❌ | ✅ |

**Rule of thumb**: `/feature-sprint` is the executor for `/feature-spec`. For more careful, single-task-at-a-time execution with the global `plan` skill, use `architect-executor` instead.

## Prerequisites

A completed feature spec at `tmp/feature-specs/{slug}/`:
- `{slug}.md` with `status: COMPLETE` in frontmatter
- `context.md` with YAML frontmatter (version 1.0+)
- `implementation-plan.md` with task checkboxes

If missing or DRAFT: tell the user to run `/feature-spec {source}` first.

## Architecture: Orchestration + Subagents + Sync-Back

**Core Principle**: The main session **orchestrates only**. All implementation happens in Task subagents — that keeps the main context clean and lets agents do heavy reading without poisoning your conversation.

```
┌─────────────────────────────────────────────────────────────────┐
│  Persistent Layer (tmp/, git-ignored)                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ implementation-plan.md                                      │ │
│  │ Source of truth: task checkboxes [ ] / [x]                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ Hydrate (session start)      │ Sync-back (per group)
         ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│  Main Session (ORCHESTRATION ONLY)                               │
│  • Load spec & state         • Spawn subagents (one per group)  │
│  • Parse agent output        • Sync checkboxes                  │
│  • Run Nx quality gates      • Commit per group                 │
│  • NEVER implement tasks directly                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Spawn (parallel or sequential)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Subagent Layer (IMPLEMENTATION)                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ Group A agent  │  │ Group B agent  │  │ Group C agent      │ │
│  │ Backend tasks  │  │ Frontend tasks │  │ Tests / integration│ │
│  │ cwd: OSS repo  │  │ cwd: OSS repo  │  │ cwd: depends       │ │
│  └────────────────┘  └────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Hydration (session start)
1. Read `implementation-plan.md` → extract tasks with checkbox state (`[ ]` pending, `[x]` done)
2. Read `context.md` → extract `parallel_groups`, `target_repo`, `quality_gates`
3. Use `TaskCreate` for each pending task (visual tracking)
4. Wire `addBlockedBy` from `parallel_groups[*].blocked_by`

### Subagent delegation
Every group runs in a Task subagent — parallel or sequential. The main session never touches code, never reads source files, never runs Nx commands itself.

### Sync-back (automatic)
After each group's subagent completes:
1. Parse output for `TASK_COMPLETE: {id}` markers
2. Update `implementation-plan.md` checkboxes: `[ ]` → `[x]`
3. Update Claude Tasks status

Progress is durable: kill the session, restart `/feature-sprint {slug}`, and it resumes from where checkboxes left off.

## Workflow Phases

| Phase | File | Purpose |
|-------|------|---------|
| 1 | `phase-1-init.md` | Load spec, hydrate tasks, get approval |
| 2 | `phase-2-execute.md` | Parallel execution via subagents with auto sync-back + per-group commits |
| 3 | `phase-3-finalize.md` | Run Nx quality gates, final report, optional archive |

## State Management

```
tmp/feature-specs/{slug}/
├── {slug}.md              # status: COMPLETE
├── context.md             # parallel_groups, target_repo, quality_gates
├── implementation-plan.md # tasks with checkboxes — SOURCE OF TRUTH for progress
├── discovery.md           # reference patterns
└── functional-spec.md     # acceptance criteria
```

Progress is tracked entirely through `implementation-plan.md` checkboxes — no separate state file.

## OSS / Proprietary Routing

`context.md` declares `target_repo` and each parallel group declares its `repo` field. The main session sets `cwd` for each subagent accordingly:

- `repo: oss` → `cwd: ../packmind` (the OSS sibling cloned next to the proprietary repo)
- `repo: proprietary` → `cwd: .` (this repo)

After all OSS work is committed and merged upstream, remind the user to `git pull` here so the proprietary fork picks up the auto-merge before any proprietary tasks run.

## Commit Strategy

**Each parallel group gets its own commit** when its subagent reports success (one commit per group, not per task). This matches the Packmind CLAUDE.md rule "Each sub-task should have its own commit" — we treat a parallel group as a coherent sub-task unit.

Commits follow the `git-commit-guidelines` skill format (gitmoji + Conventional Commits, never auto-closing issues). The main session always shows the proposed message and asks for approval before running `git commit`.

## Invocation

### New sprint

```
/feature-sprint {task_slug}
```

If `{task_slug}` is omitted, the skill lists available specs in `tmp/feature-specs/` and asks the user to pick one.

### Resume

Same command. The skill detects existing checkbox state and offers to continue.

## Status

Show progress across active sprints:

```
/feature-sprint status
```

(Implemented by listing `tmp/feature-specs/*/implementation-plan.md` and counting checkbox state in each.)

## Error Handling

| Situation | Action |
|-----------|--------|
| Spec not found | Error: "Run /feature-spec first" |
| Spec DRAFT | Error: "Complete the spec first — `status` is DRAFT" |
| No parallel groups | Fall back to single-group sequential execution |
| `repo: oss` but `../packmind` missing | Ask user — switch to proprietary or abort |
| Agent fails | Sync completed tasks, pause sprint, report error |
| Quality gate fails | Sync progress, report failures, prompt for fix-and-retry |

## Integration with /feature-spec

```
/feature-spec #123              # produces tmp/feature-specs/{slug}/
/feature-sprint {slug}          # executes the plan
```

Sprint reads:
- `context.md` → `parallel_groups`, `target_repo`, `quality_gates`
- `implementation-plan.md` → task list with checkboxes (source of truth)
- `{slug}.md` → verify `status: COMPLETE`