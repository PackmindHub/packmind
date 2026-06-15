# Implementation Plan Subagent Prompt Template

Loaded by `phase-3-implementation.md` step 3D.2 to generate
`tmp/feature-specs/{task_slug}/implementation-plan.md`. The orchestrator
substitutes every `{placeholder}` and then passes the result as the `prompt`
to `Agent` with `subagent_type="general-purpose"`.

## Placeholders

| Placeholder | Source |
|-------------|--------|
| `{task_name}` | main spec frontmatter |
| `{task_slug}` | spec directory name |
| `{target_repo}` | discovery.md frontmatter (`oss \| proprietary \| both`) |
| `{APPROVED_3A_BLOCK}` | the approved 3A.2 summary, pasted verbatim |
| `{APPROVED_3B_BLOCK}` | the approved 3B.2 summary, pasted verbatim |
| `{APPROVED_3C_BLOCK}` | the approved 3C.2 summary, pasted verbatim |

## Conditional sections

The template includes layer-specific constraint sections. Include or skip each
based on whether any task in that layer exists:

- Backend section → include if 3A or 3B produced any work
- Frontend section → include if 3C produced any work
- Migration section → include if 3A produced any migration entries

**Do not** paste the contents of referenced skills inline. The subagent has
access to the project's `.claude/skills/` directory and should `Read` them
directly. Inline pastes would force the orchestrator to grow with every
upstream skill change.

## Template

```
Design implementation tasks for: {task_name}

IMPORTANT: Do NOT use EnterPlanMode. Write the plan directly to the file path in the Output section below.

## Context files (Read these first)
- tmp/feature-specs/{task_slug}/functional-spec.md (requirements, acceptance criteria)
- tmp/feature-specs/{task_slug}/discovery.md (patterns, reference paths in YAML frontmatter + Technical Approach)

## Validated decisions (from earlier subtasks — treat as LOCKED)

The following have been reviewed and approved by the user. The implementation plan MUST be consistent — do not add, remove, or rename anything listed here.

### Domain Data Structures (Subtask 3A)
{APPROVED_3A_BLOCK}

### Ports, Contracts, Use Cases, Routes (Subtask 3B)
{APPROVED_3B_BLOCK}

### Frontend Components (Subtask 3C)
{APPROVED_3C_BLOCK}

## Architecture Constraints — Backend (include only if backend touched)

Read these skills before producing backend tasks. Do NOT paste their contents into this prompt — they are loaded conditionally and may evolve:

- `.claude/skills/hexagonal-architecture/SKILL.md`
- `.claude/skills/hexagonal-architecture/components/usecase.md`
- `.claude/skills/hexagonal-architecture/components/repository.md`
- `.claude/skills/repository-implementation-and-testing-pattern/SKILL.md` (if it exists)

For each backend task ensure:
- Layer is explicit (domain, application, infra)
- Cross-domain communication goes through a port in `packages/types/` or a domain event — NEVER direct cross-package imports
- The right `Abstract*UseCase` base class is used for authorization
- Domain errors are mapped at the API layer, not raised as HTTP exceptions inside the domain
- New repositories use `AbstractRepository<T>` with soft-delete support unless explicitly justified otherwise

## Testing Constraints

For each backend task involving logic, plan a sibling `*.spec.ts` task using Jest + `@swc/jest`. For repositories, follow the test pattern from `repository-implementation-and-testing-pattern` skill (factory-driven tests). For end-to-end behavior, add an `integration-tests` task in `packages/integration-tests`.

## Frontend Constraints (include only if frontend touched)

Read these skills before producing frontend tasks:

- `.claude/skills/working-with-pm-design-kit/SKILL.md`
- `.claude/commands/gateway-pattern-implementation-in-packmind-frontend.md`

For each frontend task ensure:
- UI is built from `@packmind/ui` PM-prefixed components, NOT raw Chakra primitives (unless wrapping a new slot component — then plan a slot-wrapping task referencing `.claude/commands/wrapping-chakra-ui-with-slot-components.md`)
- API calls go through a Gateway, not directly from components or hooks
- TanStack Query (or the project's equivalent) is used via the existing hook pattern from discovery
- Tests use React Testing Library at the component layer; integration scenarios go to e2e

## Migration Constraints (include only if migrations touched)

Read: `.claude/skills/how-to-write-typeorm-migrations-in-packmind/SKILL.md`

Each migration task must:
- Create both `up` and `down` methods
- Use the standard logger
- Land under `packages/migrations/src/migrations/{timestamp}-{name}.ts`

## OSS / Proprietary Constraints

`target_repo` for this spec: `{target_repo}`.

- If `target_repo == "oss"`, all tasks must be implementable in `../packmind` (the OSS sibling next to the proprietary repo). Verify no task references `packages/editions/` or paid-only paths.
- If `target_repo == "proprietary"`, mark each task with its repo. Never import from `@packmind/editions` outside files that already live in the editions package (see `.claude/rules/packmind/packmind-proprietary.md`).
- If `target_repo == "both"`, tag every task with `repo: oss | proprietary`. Place OSS tasks first (they unblock proprietary ones after auto-merge).

## Requirements

Generate a phased implementation plan that:
1. Maps each acceptance criterion to specific tasks (Coverage Matrix at end)
2. Groups tasks logically: domain entities/events → repositories/migrations → use cases → API routes → frontend gateway/queries → frontend components → tests
3. Uses reference patterns from discovery.md for every task (`file:line`)
4. Specifies target files (existing or new) for every task
5. Includes test tasks for every behavioral change
6. Groups tasks into parallel execution groups by file dependencies

## Task format

See `.claude/skills/feature-spec/references/spec-templates.md` for the canonical task block shape and section structure. The format must match exactly so `/feature-sprint`'s parse_implementation_plan.py can read it.

## Parallel grouping rules

After defining all tasks, append a "Parallel Groups" section.

- Tasks sharing the SAME target files MUST be in the same group
- Tasks where A writes a file B reads MUST be in the same group
- Backend domain/application tasks usually share `packages/{domain}/`, so they often go in one group
- Frontend tasks under `apps/frontend/` often share the gateway file and form a second group
- Migration tasks usually stand alone
- Name groups by dominant file area (e.g. `backend-{domain}`, `frontend-{domain}`, `migrations`)
- Maximize parallelism while respecting file conflicts

## Output

Write to: `tmp/feature-specs/{task_slug}/implementation-plan.md`

Use the section structure documented in `.claude/skills/feature-spec/references/spec-templates.md` (Implementation Plan section). Then return a summary: `{phase_count}` phases, `{task_count}` tasks, `{group_count}` parallel groups, coverage complete/incomplete.
```
