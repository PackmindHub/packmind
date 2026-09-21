---
name: 'feature-spec'
description: 'Generate a Packmind feature specification from a GitHub issue, file, URL, or direct description. Breaks Phase 3 into 4 fine-grained approval gates (domain data structures, ports/use cases/routes, frontend components, implementation plan) to catch problems early. Routes work between the OSS sibling (../packmind) and the proprietary repo (cwd). Outputs spec artifacts under tmp/feature-specs/{slug}/ for use with /feature-sprint.'
---

# Feature Spec Skill

Generate a comprehensive feature specification grounded in Packmind's hexagonal architecture, frontend gateway/PM-UI conventions, and the OSS/proprietary fork boundary.

## When to Use

Use this skill when the user wants to:
- Plan a new feature, fix, or refactor that spans Packmind's stack
- Convert a GitHub issue, design doc, or rough idea into a structured spec
- Get fine-grained validation of data structures, routes, and components before committing to a plan

**Do NOT use** for trivial one-line fixes or pure dependency bumps.

## Packmind Repo Layout (essential context)

- Closed-source fork (`packmind-proprietary`): the current working directory when this skill runs.
- Open-source repo (`packmind`): the sibling directory at `../packmind` (cloned next to the proprietary repo). Resolve to an absolute path at runtime with `realpath ../packmind`.
- **Most feature work happens on the OSS repo and auto-merges into the proprietary fork.** The proprietary fork only contains paid/closed features (e.g. `packages/editions`, certain `packages/deployments` extensions). After an OSS merge, you typically pull on the proprietary side.
- Architecture: hexagonal (`packages/{domain}/{domain,application,infra}`), NestJS API at `apps/api`, React+`@packmind/ui` frontend at `apps/frontend`, TypeORM, Jest+@swc/jest.

## Input Sources

| Source | Examples | Detection |
|--------|----------|-----------|
| GitHub | `#123`, `owner/repo#123`, full issue URL | Pattern `#\d+` or `github.com/.../issues/` |
| File | `file:spec.md`, `path/to/spec.md` | Prefix `file:` or readable file |
| URL | `https://...` | HTTP(S) URL (non-GitHub) |
| Prompt | Any other text | Default |

## Workflow Phases

Execute phases **sequentially**. Phases 1 and 4 run seamlessly (no approval gate). Phases 2 and 3 require user approval before proceeding.

| Phase | File | Purpose | Gate |
|-------|------|---------|------|
| 1 | `phase-1-resolve-source.md` | Detect source type, fetch content, decide OSS-vs-proprietary routing, create state | seamless |
| 2 | `phase-2-discovery-and-spec.md` | Research Packmind patterns (reference domain, hex layers, frontend conventions), draft acceptance criteria, generate functional spec | approval |
| 3 | `phase-3-implementation.md` | Technical approach + implementation plan (4 subtasks below) | 4 approvals |
| 3A | ↳ Subtask 3A | Validate domain data structures (entities, value objects, events, migrations) | approval |
| 3B | ↳ Subtask 3B | Validate ports, contracts, use cases, services, adapters, NestJS routes | approval |
| 3C | ↳ Subtask 3C | Validate frontend components, gateways, query hooks, PM-UI usage | approval |
| 3D | ↳ Subtask 3D | Generate full implementation plan (task breakdown, grouping, coverage) | approval |
| 4 | `phase-4-finalize.md` | Generate `context.md`, mark spec complete, report (no commit — artifacts live in `tmp/`) | seamless |

## State Management

State is persisted to markdown files under a git-ignored `tmp/` directory for cross-session continuity. Phase progress is inferred from which output files exist — no separate state file needed.

```
tmp/feature-specs/{slug}/
├── {slug}.md               # Main spec (status: DRAFT → COMPLETE in frontmatter)
├── discovery.md            # Phase 2 output (YAML frontmatter + markdown)
├── functional-spec.md      # Phase 2 output (informed by discovery)
├── implementation-plan.md  # Phase 3 output (includes parallel groups section)
└── context.md              # Phase 4 output (YAML frontmatter + markdown)
```

### Phase Detection (Resume Logic)

| Files Present | Completed Phase | Resume At |
|---------------|----------------|-----------|
| `{slug}.md` only | Phase 1 | Phase 2 |
| + `discovery.md`, `functional-spec.md` | Phase 2 | Phase 3 |
| + `implementation-plan.md` | Phase 3 | Phase 4 |
| + `context.md` (status: COMPLETE) | Phase 4 | Done |

## Invocation

### Auto-Detection (Resuming)

Before starting, check for an existing task directory at `tmp/feature-specs/{slug}/`:

1. Check which output files exist to determine current phase (see Phase Detection table above)
2. Read the main spec file's YAML frontmatter for `status: DRAFT|COMPLETE`
3. If resuming, display:
   ```
   **Resuming Feature Spec**: {slug}
   **Current Phase**: {detected_phase}
   **Status**: {status from frontmatter}

   Continue from Phase {detected_phase}? (Y/n)
   ```
4. If user confirms, proceed to the appropriate phase file
5. If no task directory found, start a new feature spec

### Starting New

To start a new feature spec: Read `phase-1-resolve-source.md` and follow its instructions.

<feature-spec-rules>
  <rule>Execute phases SEQUENTIALLY — never skip phases</rule>
  <rule>Phases 1 and 4 proceed automatically — no approval gate</rule>
  <rule>Phases 2 and 3 require USER APPROVAL via AskUserQuestion before proceeding</rule>
  <rule>Save all artifacts under tmp/feature-specs/{slug}/ — never under tracked folders</rule>
  <rule>Use Task tool with Explore subagent for codebase research; never read 50 files yourself</rule>
  <rule>Agent NEVER implements code in this skill — output ONLY specification documents</rule>
  <rule>Main spec file has status DRAFT until Phase 4 completes</rule>
  <rule>Always record target_repo (oss | proprietary | both) decided in Phase 1; consumed by /feature-sprint</rule>
  <rule>Never invent OSS/proprietary boundaries — if unsure, ask the user</rule>
</feature-spec-rules>

## Output

Final deliverable: `tmp/feature-specs/{slug}/{slug}.md` + sibling artifacts.

Contains:
- Functional specification with acceptance criteria
- Technical approach grounded in Packmind reference patterns
- Implementation plan with phased tasks (each task has reference `file:line` patterns)
- Parallel Groups section (for parallel execution via `/feature-sprint`)
- `target_repo`: oss | proprietary | both

## Parallel Execution Support

Phase 3 includes a grouping step that analyzes task dependencies and creates parallel execution groups:

**How grouping works:**
1. After generating the implementation plan, a Plan subagent analyzes tasks
2. Tasks are grouped by file dependencies (tasks sharing files go together)
3. Groups are non-overlapping (no file belongs to multiple groups)
4. Results are stored in `implementation-plan.md` (Parallel Groups section) and `context.md` (YAML frontmatter)

**When grouping is skipped:**
- Tasks have no clear file dependencies
- Single-file or trivial implementations
- User opts out during Phase 3 review

## Handoff

When the spec is complete (Phase 4), the next step is `/feature-sprint {slug}` — the companion skill that executes the implementation plan.