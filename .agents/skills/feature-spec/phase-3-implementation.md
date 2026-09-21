# Phase 3: Implementation Plan

Generate the technical approach and detailed task breakdown, with Packmind-specific reference patterns and file targets.

Phase 3 is split into **four subtasks**, each with its own approval gate. Foundational decisions are validated before generating the full plan, so problems get caught early.

| Subtask | Purpose | Gate |
|---------|---------|------|
| 3A | Validate **domain data structures** (entities, value objects, events, repositories, schemas, migrations) | approval |
| 3B | Validate **ports, contracts, use cases, services, adapters, NestJS routes** | approval |
| 3C | Validate **frontend components** (page/container, gateway, query hooks, PM-UI usage, forms) | approval |
| 3D | Generate full **implementation plan** (task breakdown, grouping, coverage) | approval |

## Prerequisites

- Phase 2 completed
- If resuming a fresh session, read `tmp/feature-specs/{task_slug}/functional-spec.md` and `discovery.md`

## Steps

### 3.1 Present Technical Approach

Using functional spec + discovery, present a brief technical approach to the user:

```
## Technical Approach

### Target Repo
{target_repo} — implementation root: `{discovery_root}`. Tasks landing in this fork (proprietary) will be tagged; otherwise default to OSS.

### Stack
- API: NestJS (`apps/api`)
- Domain packages: hexagonal layout under `packages/{domain}/src/{domain,application,infra}`
- Types/ports/contracts: `packages/types/src/{domain}`
- Frontend: React + `@packmind/ui` (PM-prefixed Chakra wrappers) (`apps/frontend`)
- Tests: Jest + `@swc/jest`; integration tests in `packages/integration-tests`
- DB: TypeORM + PostgreSQL; migrations under `packages/migrations`

### Reference Patterns (from discovery)
- Reference domain: `{reference_domain.package}`
- Reference use case: `{reference_domain.application_files[0].file}:{line}`
- Reference route: `{reference_route.controller}:{line}` (`{reference_route.http}`)
- Reference frontend page: `{reference_frontend.page.file}:{line}`

### Architecture Decisions
- {derived_approach from pattern_validation}
- Authorization: {convention chosen, e.g. AbstractSpaceMemberUseCase}
- Error mapping: {convention}
- Cross-domain: {via injected port or via domain event}

### New Patterns Required
{If any:}
- {e.g., "New port `IFooPort` — no existing port covers this responsibility"}
- {e.g., "New domain event `FooDeletedEvent` — to notify deployments domain"}

{Else: "None — fully covered by existing patterns."}
```

If new patterns are identified, use `AskUserQuestion` for each decision (one question per decision):

```json
{
  "questions": [{
    "question": "{Describe the specific new pattern decision}",
    "header": "New pattern",
    "multiSelect": false,
    "options": [
      {"label": "{Option A}", "description": "{What this means concretely}"},
      {"label": "{Option B}", "description": "{What this means concretely}"}
    ]
  }]
}
```

If no new patterns are needed, proceed directly.

### 3.2 Append Technical Approach to discovery.md

Append the finalized technical approach to `tmp/feature-specs/{task_slug}/discovery.md` after the YAML frontmatter:

```markdown
## Technical Approach

### Target Repo
...

### Stack
...

### Reference Patterns
...

### Architecture Decisions
...
```

---

## Subtask 3A: Validate Domain Data Structures

### 3A.1 Extract Data Structure Changes

From functional spec + discovery, identify ALL data-structure impacts in the **domain** and **infra** layers:

**New entities** (`packages/{domain}/src/domain/entities/`) — domain objects that don't exist yet:
- Name, purpose, key fields with TS types
- Relationships to existing entities (1:1, 1:N, N:M)
- Whether it carries an ID type (`{Entity}Id` branded type in `packages/types`)

**Entity modifications** — changes to existing domain objects:
- New fields (name, type, nullable, default)
- Modified fields (what changes and why)
- Removed fields (what + migration impact)

**Value objects / branded ID types** (`packages/types/src/{domain}/`):
- Name, shape

**Domain events** (`packages/types/src/events/{EventName}.ts`):
- Event name, payload shape
- Which domain emits it, which listeners consume it
- Reference the `event.md` component guide

**Repository interfaces** (`packages/{domain}/src/domain/repositories/I{Entity}Repository.ts`):
- Methods needed (findById, findByX, etc.)
- Whether `AbstractRepository<T>` (soft-delete) is appropriate

**TypeORM schemas** (`packages/{domain}/src/infra/schemas/{Entity}Schema.ts`):
- Columns + types + indexes + foreign keys

**Migrations** (`packages/migrations/src/migrations/`):
- New tables, altered columns, new indexes
- Reference the `how-to-write-typeorm-migrations-in-packmind` skill
- Down-migration plan

**Domain errors** (`packages/{domain}/src/domain/errors/`):
- New error classes for invariant violations

Use `discovery.md` reference paths to ground every naming and structure decision.

### 3A.2 Present Data Structures for Validation

Render the **Subtask 3A** presentation template from `references/spec-templates.md`, substituting the items extracted in 3A.1. Do not paraphrase the section headings — they keep 3A → 3D consistent.

### 3A.3 Approval Gate — Data Structures

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Are the proposed domain data structures correct? (entities, events, repositories, schemas, migrations)",
    "header": "Subtask 3A",
    "multiSelect": false,
    "options": [
      {"label": "Approved", "description": "Data structures are correct, proceed to ports/use cases/routes"},
      {"label": "Needs changes", "description": "I'll specify what to adjust"}
    ]
  }]
}
```

If "Needs changes", incorporate feedback and re-present 3A.2.

If there are no data-structure changes for this task, state so briefly and skip the approval gate — proceed directly to Subtask 3B.

---

## Subtask 3B: Validate Ports, Contracts, Use Cases, Services, Adapters, Routes

### 3B.1 Extract Application + API Changes

From functional spec + discovery, identify ALL impacts in the **application** layer and **API** layer:

**New ports** (`packages/types/src/{domain}/ports/I{Domain}Port.ts`):
- Port name, methods exposed
- Which adapter implements it
- Justify: why a new port (vs. extending an existing one)

**New use case contracts** (`packages/types/src/{domain}/contracts/{UseCaseName}.ts`):
- Request shape, Response shape
- Which port method returns these

**New use cases** (`packages/{domain}/src/application/useCases/{name}/{name}.usecase.ts`):
- Name, purpose
- Which `Abstract*UseCase` base class (`AbstractMemberUseCase`, `AbstractSpaceMemberUseCase`, `AbstractAdminUseCase`)
- Authorization rules (who can call)
- Which services / repos it uses
- Which events it emits

**Modified use cases** — changes to existing use cases:
- What changes, backward-compatibility notes

**New services** (`packages/{domain}/src/application/services/{Name}Service.ts`):
- Name, methods, callers (use cases)

**New adapter methods** (`packages/{domain}/src/application/adapter/{Domain}Adapter.ts`):
- Which port methods are now implemented

**New listeners** (`packages/{domain}/src/application/listeners/{Domain}Listener.ts`):
- Which events listened to, what it does

**New / modified NestJS routes** (`apps/api/src/`):
- Method + path (e.g., `POST /api/standards/{id}/preview`)
- Request/response DTOs (referencing contracts from above)
- Controller file + method
- How it resolves the port: `HexaRegistry.getAdapter<IFooPort>('foo')`

**Removed routes**:
- Path + reason

Use `discovery.md` references for path conventions, base classes, and adapter patterns.

### 3B.2 Present for Validation

Render the **Subtask 3B** presentation template from `references/spec-templates.md`, substituting the items extracted in 3B.1.

### 3B.3 Approval Gate — Application + Routes

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Are the proposed ports, contracts, use cases, services, adapters, and routes correct?",
    "header": "Subtask 3B",
    "multiSelect": false,
    "options": [
      {"label": "Approved", "description": "Application + API layer is correct, proceed to frontend"},
      {"label": "Needs changes", "description": "I'll specify what to adjust"}
    ]
  }]
}
```

If "Needs changes", incorporate feedback and re-present 3B.2.

If nothing changes in this layer, state so and skip the gate — proceed to Subtask 3C.

---

## Subtask 3C: Validate Frontend Components

### 3C.1 Extract Frontend Changes

From functional spec + discovery, identify ALL frontend impacts in `apps/frontend/`:

**New page / route components** — top-level orchestrators:
- File path under `apps/frontend/src/`
- Route it mounts on (React Router or app router)
- Which gateway queries/mutations it owns
- Which container/domain components it renders

**New domain / container components** — feature-scoped UI:
- File path, props interface (TypeScript)
- Pure-display vs. stateful (owns queries?)
- Form components: validation lib + schema, submit callback shape
- List components: item shape, empty state, loading skeleton
- Detail components: data shown, actions

**Modified domain components**:
- File + line, what changes, props added/removed

**New gateways** (`apps/frontend/src/.../gateways/{Name}Gateway.ts`):
- Method signatures wrapping API calls
- Reference the existing gateway pattern (see `gateway-pattern-implementation-in-packmind-frontend` command)
- Type mapping (contract → frontend type)

**New query / mutation hooks**:
- Hook name, query key, return shape
- Cache invalidation rules

**`@packmind/ui` usage** (PM-prefixed Chakra wrappers):
- Which existing PM-* components are used (PMButton, PMDialog, PMField, etc.)
- Whether any new wrapper is needed (see `wrapping-chakra-ui-with-slot-components` command and `working-with-pm-design-kit` skill)

**Layout / navigation changes**:
- New nav links, sidebar items, page tabs

**Microcopy**:
- New user-facing strings — flag for `ux-microcopy` skill if there are non-trivial messages (errors, empty states, dialogs)

Use `discovery.md`'s reference frontend feature to ground naming and structure decisions.

### 3C.2 Present for Validation

Render the **Subtask 3C** presentation template from `references/spec-templates.md`, substituting the items extracted in 3C.1.

### 3C.3 Approval Gate — Frontend Components

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Are the proposed frontend components correct? (pages, containers, gateways, queries, PM-UI usage)",
    "header": "Subtask 3C",
    "multiSelect": false,
    "options": [
      {"label": "Approved", "description": "Frontend is correct, proceed to full implementation plan"},
      {"label": "Needs changes", "description": "I'll specify what to adjust"}
    ]
  }]
}
```

If "Needs changes", incorporate feedback and re-present 3C.2.

If no frontend changes, state so and skip — proceed to Subtask 3D.

---

## Subtask 3D: Generate Implementation Plan

### 3D.1 Skill Loading (conditional)

Load Packmind skills based on which layers the task touches:

**Backend (domain / application / infra) is touched:**
1. Read `.claude/skills/hexagonal-architecture/SKILL.md`
2. Read `.claude/skills/hexagonal-architecture/components/usecase.md`
3. Read `.claude/skills/hexagonal-architecture/components/repository.md`
4. Read `.claude/skills/repository-implementation-and-testing-pattern/SKILL.md` (if it exists)

**Migrations are touched:**
5. Read `.claude/skills/how-to-write-typeorm-migrations-in-packmind/SKILL.md`
6. Read `.claude/skills/create-or-update-model-and-typeorm-schemas/SKILL.md`

**Frontend is touched:**
7. Read `.claude/skills/working-with-pm-design-kit/SKILL.md`
8. Read `.claude/commands/gateway-pattern-implementation-in-packmind-frontend.md`
9. Read `.claude/commands/wrapping-chakra-ui-with-slot-components.md` (only if new PM wrappers needed)

**CLI tests are touched:**
10. Read `.claude/skills/cli-e2e-test-authoring/SKILL.md`

Skip a category entirely if no task in that layer.

### 3D.2 Launch Implementation Plan Subagent

Read the bundled prompt template at `.claude/skills/feature-spec/references/implementation-plan-prompt.md`. Substitute its placeholders (`{task_name}`, `{task_slug}`, `{target_repo}`, and the three `{APPROVED_3*_BLOCK}` blocks pasted verbatim from the prior approval gates). Include or omit the Backend / Frontend / Migration constraint sections based on which layers the prior subtasks produced work for — guidance is at the top of the reference file.

Invoke `Agent` with `subagent_type="general-purpose"` and the substituted prompt. Wait for the subagent to complete.

Wait for the subagent to complete.

### 3D.3 Validate Plan Output

Read `tmp/feature-specs/{task_slug}/implementation-plan.md` and verify:
- Every acceptance criterion is covered in the Coverage Matrix
- Every task has a reference pattern (`file:line`)
- Every task has target files and a `repo` tag
- Plan is consistent with 3A, 3B, 3C decisions (no extra entities, no missing routes)
- Parallel Groups section exists with at least 1 group
- All tasks belong to exactly one group; no file appears in multiple groups

If validation fails: tell the user what's missing and ask whether to refine manually or relaunch the subagent.

### 3D.4 Approval Gate — Implementation Plan

Display the summary:

```
**Subtask 3D complete.** Implementation plan generated.

**Phases:** {count}
**Total tasks:** {count}
**Parallel groups:** {group_count}
**Repos used:** {oss only | proprietary only | both, with count}

Review the plan in `tmp/feature-specs/{task_slug}/implementation-plan.md`

Questions to consider:
- Does each task follow the identified patterns?
- Are file references specific enough?
- Are inter-group dependencies clear?
- Are OSS-vs-proprietary tags correct?
```

Use `AskUserQuestion`:

```json
{
  "questions": [{
    "question": "Is the implementation plan approved? Proceed to finalize?",
    "header": "Subtask 3D",
    "multiSelect": false,
    "options": [
      {"label": "Yes, proceed", "description": "Approve plan and continue to Phase 4: Finalize"},
      {"label": "Need changes", "description": "I need to modify the implementation plan first"}
    ]
  }]
}
```

Do not continue until user confirms via AskUserQuestion response.

### 3.7 Phase Complete

The existence of `implementation-plan.md` marks Phase 3 as complete. No separate state update needed.

## Next Phase

After approval, proceed automatically to `phase-4-finalize.md`.
