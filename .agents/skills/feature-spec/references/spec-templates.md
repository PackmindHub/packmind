# Spec Presentation & Plan Templates

Reusable markdown skeletons for Phase 3 (Subtasks 3A/3B/3C) and Phase 3D
(implementation plan + task format). Keeps `phase-3-implementation.md` lean
and procedural; this file holds the bulky presentation structure.

The templates are fill-in-the-blank — substitute the `{placeholder}` tokens
from `discovery.md` + the prior subtask's approved decisions. Always preserve
the exact section ordering: `/feature-sprint` parses the resulting
`implementation-plan.md` and the order matters for it.

## Subtask 3A: Domain Data Structures (presentation template)

```
## Subtask 3A: Domain Data Structures

### Target Repo
{target_repo} — these changes live in {oss | proprietary}.

### New Entities
{For each:}
- **`{EntityName}`** — {purpose}
  - File: `packages/{domain}/src/domain/entities/{EntityName}.ts`
  - Fields:
    - `id: {EntityName}Id` (branded type in `packages/types/src/{domain}/`)
    - `{field}: {type}` {constraints}
  - Relationships: {description}
  - **Reference**: `{discovery.reference_domain.domain_files[*].file}:{line}` — follows pattern

### Entity Modifications
{For each:}
- **`{EntityName}`** (`{existing_file}:{line}`)
  - Add: `{field}: {type}` — {reason}
  - Modify: `{field}: {old}` → `{new}` — {reason + migration impact}
  - Remove: `{field}` — {reason + migration note}

### New Value Objects / Branded IDs
{For each:}
- **`{Name}`** (`packages/types/src/{domain}/{Name}.ts`)

### New Domain Events
{For each:}
- **`{EventName}`** (`packages/types/src/events/{EventName}.ts`)
  - Payload: `{shape}`
  - Emitted by: `{Domain}` (use case `{name}`)
  - Listened by: `{ListenerDomain}` — `application/listeners/{Name}Listener.ts`

### New Repository Interfaces
{For each:}
- **`I{Entity}Repository`** (`packages/{domain}/src/domain/repositories/`)
  - Methods: `{methods}`
  - Extends `AbstractRepository<{Entity}>`: yes/no

### TypeORM Schemas
{For each:}
- **`{Entity}Schema`** (`packages/{domain}/src/infra/schemas/`)
  - Table: `{table_name}`
  - Columns: {list}
  - Indexes: {list}
  - FKs: {list}

### Migrations
{For each:}
- **`{TimestampMigrationName}`** under `packages/migrations/src/migrations/`
  - Up: {description}
  - Down: {description}
  - Reference pattern: `{existing_migration_file}`

### New Domain Errors
{For each:}
- **`{ErrorClass}`** — thrown when {invariant}

{If no data-structure changes: "No domain data-structure changes — this task only touches application/UI behavior."}
```

## Subtask 3B: Ports, Contracts, Use Cases, Routes (presentation template)

```
## Subtask 3B: Ports, Contracts, Use Cases, Routes

### Target Repo
{target_repo}

### New Ports
{For each:}
- **`I{Name}Port`** (`packages/types/src/{domain}/ports/`)
  - Methods: `{signatures}`
  - Implemented by: `{Domain}Adapter`
  - Why new: {justification}

### New Contracts
{For each:}
- **`{UseCaseName}`** (`packages/types/src/{domain}/contracts/`)
  - Request: `{shape}`
  - Response: `{shape}`

### New Use Cases
{For each:}
- **`{name}.usecase.ts`** (`packages/{domain}/src/application/useCases/{name}/`) — {purpose}
  - Base class: `AbstractSpaceMemberUseCase` (etc.)
  - Authorization: {who can call}
  - Uses repos: {list}
  - Uses services: {list}
  - Emits events: {list, referencing 3A}
  - **Reference**: `{discovery.reference_domain.application_files[*].file}:{line}`

### Modified Use Cases
{For each:}
- **`{file}:{line}`** — {change description}

### New Services
{For each:}
- **`{Name}Service`** (`packages/{domain}/src/application/services/`)
  - Methods: {signatures}
  - Used by: {use cases}

### New Adapter Methods
{For each:}
- **`{Domain}Adapter.{method}()`** (`packages/{domain}/src/application/adapter/`)
  - Implements port: `I{Name}Port.{method}`

### New Listeners
{For each:}
- **`{Domain}Listener.handle{Event}()`** — reacts to `{EventName}`

### New API Routes
{For each:}
- **`{METHOD} {path}`** — {purpose}
  - Controller: `apps/api/src/controllers/{Name}Controller.ts` (new or extends existing)
  - Request DTO: `{shape or file}`
  - Response DTO: `{shape or file}`
  - Resolves port: `IFooPort.{method}` via `HexaRegistry`
  - **Reference**: `{discovery.reference_route.controller}:{line}`

### Modified API Routes
{For each:}
- **`{METHOD} {path}`** (`{file}:{line}`)
  - Change: {description}
  - Backward compatible: yes/no + detail

### Removed Routes
{For each:}
- **`{METHOD} {path}`** — {reason + deprecation plan}

{If no application/API changes: "No application or API changes — this task only modifies data or UI."}
```

## Subtask 3C: Frontend Components (presentation template)

```
## Subtask 3C: Frontend Components

### Target Repo
{target_repo}

### New Page / Route Components
{For each:}
- **`{ComponentName}`** (`apps/frontend/src/.../{ComponentName}.tsx`) — {purpose}
  - Route: `{path}`
  - Queries/mutations owned: {list}
  - Renders: {list of child components}
  - **Reference**: `{discovery.reference_frontend.page.file}:{line}`

### New Domain / Container Components
{For each:}
- **`{ComponentName}`** (`apps/frontend/src/.../{ComponentName}.tsx`) — {purpose}
  - Props: `{prop}: {type}`
  - Behavior: pure display | form (validation: {schema}) | stateful with queries
  - **Reference**: `{similar_component_file}:{line}`

### Modified Domain Components
{For each:}
- **`{ComponentName}`** (`{file}:{line}`) — {change}

### New Gateways
{For each:}
- **`{Name}Gateway`** (`apps/frontend/src/.../gateways/{Name}Gateway.ts`)
  - Methods: `{signatures}` wrapping `{contract from 3B}`
  - **Reference**: `{discovery.reference_frontend.gateway.file}:{line}`

### New Query / Mutation Hooks
{For each:}
- **`use{Name}`** (`apps/frontend/src/.../{name}.ts`)
  - Query key: `{key}`
  - Returns: `{shape}`
  - Invalidates: `{keys}`

### `@packmind/ui` Usage
- Reused PM components: {list}
- New PM wrapper components needed: {list or "none"}
- **If new wrappers**: see `wrapping-chakra-ui-with-slot-components` command before implementing

### Layout / Navigation
{For each change:}
- **`{file}`** — {description}

### Microcopy
- {Flag any non-trivial user-facing strings that should be reviewed with the `ux-microcopy` skill}

{If no frontend changes: "No frontend changes — this task only touches backend/data."}
```

## 3D: Task & Implementation Plan Format

The implementation-plan.md generated by 3D must use this exact shape so that
`/feature-sprint`'s `parse_implementation_plan.py` can read it.

### Task block

```
- [ ] **{PHASE}.{TASK}: {short description}**
  - Repo: `oss | proprietary`
  - Layer: `domain | application | infra | api | frontend | tests | migrations`
  - Files: `{paths}`
  - Reference: `{file}:{line}` — {pattern_role}
  - Notes: {short implementation notes}
```

Phases are numbered (1, 2, 3...). Tasks within a phase use decimals (1.1,
1.2, 2.1). Indentation is exactly two spaces for the metadata lines — the
parser depends on it.

### Plan-level structure

```
# Implementation Plan: {task_name}

## Phase 1: {short label}
- [ ] **1.1: ...**
  - Repo, Layer, Files, Reference, Notes
- [ ] **1.2: ...**
  ...

## Phase 2: ...

## Coverage Matrix

| Acceptance Criterion | Task IDs |
|----------------------|----------|
| {criterion} | 1.1, 2.3 |

## Parallel Groups

| group_id | group_name | task_ids | target_files | rationale |
|----------|-----------|----------|--------------|-----------|
| A | backend-standards | 1.1, 1.2, 1.3 | packages/standards/... | shared domain package |
| B | frontend-standards | 2.1, 2.2 | apps/frontend/src/standards/... | shared gateway + page |
| C | tests | 3.1, 3.2 | varies | after A and B |

## Dependency Notes
- Group C blocked by Groups A and B
- ...
```
