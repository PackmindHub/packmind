# Phase 4: Finalize

Generate the implementation context, mark the spec as complete, and report. This phase runs seamlessly — no approval gate.

Artifacts live in `tmp/feature-specs/{task_slug}/` which is git-ignored, so **no commit step** here. The user commits implementation code via `/feature-sprint`.

## Prerequisites

- Phases 1-3 completed
- If resuming a fresh session, read `discovery.md`, `functional-spec.md`, and `implementation-plan.md` from `tmp/feature-specs/{task_slug}/`

## Steps

### 4.1 Generate Implementation Context

**Purpose**: produce a structured `context.md` that `/feature-sprint` will read to set up parallel execution.

Read `.claude/skills/feature-spec/references/context-schema.md` — it contains the full YAML template, the body template, and the ordered extraction process (sources: `discovery.md` frontmatter, main spec frontmatter, `functional-spec.md` body, `implementation-plan.md` Parallel Groups table).

Write the substituted result to `tmp/feature-specs/{task_slug}/context.md`.

### 4.2 Mark Spec Complete

Update the main spec file's YAML frontmatter:

```markdown
---
status: COMPLETE
...
finished: {ISO-8601 timestamp}
---
```

The body of the main spec should now include a brief summary (one paragraph) and links to the sibling artifacts:

```markdown
# {task_name}

{1-paragraph summary of the feature}

## Artifacts

- [Discovery](./discovery.md) — reference patterns and conventions
- [Functional Spec](./functional-spec.md) — acceptance criteria and scope
- [Implementation Plan](./implementation-plan.md) — task breakdown and parallel groups
- [Context](./context.md) — machine-readable handoff for `/feature-sprint`

## Next Step

```
/feature-sprint {task_slug}
```
```

### 4.3 Completion Report

Output to the user:

```
## ✅ FEATURE SPEC COMPLETE

**Task**: {task_name}
**Slug**: {task_slug}
**Target repo**: {target_repo}

### Summary
- Acceptance criteria: {count} items
- Implementation phases: {phase_count}
- Total tasks: {task_count}
- Parallel groups: {group_count}

### Artifacts
- `tmp/feature-specs/{task_slug}/{task_slug}.md`
- `tmp/feature-specs/{task_slug}/discovery.md`
- `tmp/feature-specs/{task_slug}/functional-spec.md`
- `tmp/feature-specs/{task_slug}/implementation-plan.md`
- `tmp/feature-specs/{task_slug}/context.md`

### Reminder
Artifacts live in `tmp/` (git-ignored). They will NOT be committed automatically — they're scratch state for `/feature-sprint`.

### Next Steps
1. Review the artifacts above
2. Execute: `/feature-sprint {task_slug}`
```

## End of Workflow

The feature spec is ready. The companion skill `/feature-sprint` will pick it up and execute the implementation plan.
