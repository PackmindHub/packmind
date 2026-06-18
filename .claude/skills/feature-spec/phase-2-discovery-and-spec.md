# Phase 2: Discovery & Functional Spec

Discover how Packmind actually does this kind of thing, then draft requirements grounded in that reality.

## Purpose

Two goals in one phase:
1. Find **the closest existing implementation** in Packmind — which domain package, which use case, which frontend component — and trace its full hex stack
2. Draft **functional requirements** informed by that discovery, so acceptance criteria match what Packmind's architecture can actually support

## Prerequisites

- Phase 1 completed (source resolved, `target_repo` decided)
- `tmp/feature-specs/{task_slug}/{task_slug}.md` exists with `status: DRAFT`

## Steps

### 2.1 Load Source Context

Read `tmp/feature-specs/{task_slug}/{task_slug}.md`:
- YAML frontmatter: `task_name`, `source_type`, `target_repo`
- Body: `task_description`

Extract key terms from `task_description`:
- **Domain entities** mentioned (e.g., "standard", "recipe", "space", "deployment", "user")
- **Actions/verbs** (e.g., "create", "import", "deploy", "rename", "preview")
- **Cross-cutting concerns** (e.g., "event", "migration", "permission", "rate limit")

### 2.2 Pick the Discovery Root

Based on `target_repo`:
- `oss` → run discovery in `../packmind` (most patterns live there)
- `proprietary` → run discovery in `.` (this repo)
- `both` → discovery in `../packmind` first; if a needed reference doesn't exist there, also search `.`

Subagents should be told explicitly which root(s) to search.

### 2.3 Launch Research Subagents (PARALLEL)

Launch **TWO** subagents in parallel using the Task tool. Both should run concurrently in the same message.

#### Subagent A: Packmind Pattern Finder

Use `Agent` tool with `subagent_type="Explore"`, `description="Find Packmind reference patterns"`. Run "very thorough" search:

```
Find Packmind reference patterns for: {task_name}

Search root: {discovery_root absolute path}
Key terms: {extracted_terms}
Domain entities mentioned: {entities}
Task description: {task_description}

## What to find

Trace ACTUAL code paths for the closest similar feature in Packmind. Don't just list files — explain HOW the feature flows through the hex layers.

### 1. Reference domain package
Find the closest existing `packages/{domain}/` whose problem matches. Example domains: accounts, deployments, spaces, standards, recipes, skills, coding-agent, playbook-change-management.

For the chosen reference domain, document:
- **Domain layer** (`packages/{domain}/src/domain/`):
  - Entities used: file path + key fields
  - Repository interfaces: `IFooRepository` file path
  - Events: any domain events emitted
  - Errors: domain error classes
- **Application layer** (`packages/{domain}/src/application/`):
  - Closest use case: `useCases/{name}/{name}.usecase.ts` with the abstract base it extends (AbstractMemberUseCase, AbstractSpaceMemberUseCase, AbstractAdminUseCase)
  - Services involved
  - Adapter: `adapter/{Domain}Adapter.ts` and which ports it exposes
- **Infrastructure layer** (`packages/{domain}/src/infra/`):
  - Repository impl + TypeORM Schema
  - Migration pattern reference (under `packages/migrations/`)
- **Types package** (`packages/types/src/{domain}/`):
  - Port interface
  - Contract for the use case (request/response shapes)
- **Hexa facade** (`{Domain}Hexa.ts`) and `index.ts` exports

Capture every `file:line` reference.

### 2. Reference API route
Search `apps/api/src/` for the closest NestJS controller method. Document:
- Controller file + method name + decorators
- DTO file (if any) under `apps/api/src/` or types package
- How it resolves the use case (`HexaRegistry.getAdapter<IFooPort>(...)`)

### 3. Reference frontend feature
Search `apps/frontend/` for the closest existing component that does this kind of thing. Document:
- **Gateway** (`apps/frontend/src/.../gateways/{Name}Gateway.ts`) — how it wraps the API call
- **Query/mutation hook** (TanStack Query or local equivalent)
- **Page / container component** that orchestrates queries + UI
- **UI components** built from `@packmind/ui` (PM-prefixed wrappers around Chakra)
- Form/validation library, if any (Zod, react-hook-form, etc.)

### 4. Test patterns
For each layer touched, find the matching test file pattern (e.g. `*.usecase.spec.ts`, `*.repository.spec.ts`, `*.tsx` with React Testing Library). Note where integration tests live (`packages/integration-tests/`).

### 5. Conventions
Cross-reference 2-3 similar features and note:
- Naming conventions for use cases, ports, contracts
- Authorization base class typically used
- Error-mapping approach (domain errors → HTTP)
- How events propagate cross-domain
- Frontend data-flow shape (gateway → query hook → component)

### 6. Constraints
Note any:
- Files under `packages/editions/` (forbidden to import from elsewhere when on proprietary)
- Feature flags involved
- Existing migrations that overlap

## Output Format

Return JSON:
{
  "discovery_root": "absolute path searched",
  "reference_domain": {
    "package": "packages/standards",
    "domain": [{"file": "", "line": 0, "role": ""}],
    "application": [{"file": "", "line": 0, "role": ""}],
    "infra": [{"file": "", "line": 0, "role": ""}],
    "types": [{"file": "", "line": 0, "role": ""}],
    "hexa_facade": {"file": "", "line": 0}
  },
  "reference_route": {"controller": "", "method": "", "file": "", "line": 0, "uses_port": ""},
  "reference_frontend": {
    "gateway": {"file": "", "line": 0},
    "queries": [{"file": "", "line": 0}],
    "page": {"file": "", "line": 0},
    "ui_components": [{"name": "", "file": "", "line": 0}]
  },
  "test_patterns": {"usecase_spec": "", "repository_spec": "", "frontend_component_spec": "", "integration_tests_dir": ""},
  "conventions": {
    "naming": "",
    "authorization": "",
    "error_mapping": "",
    "events": "",
    "frontend_data_flow": ""
  },
  "constraints": ["..."]
}
```

#### Subagent B: Documentation Researcher

Use `Agent` tool with `subagent_type="Explore"`, `description="Search Packmind docs for context"`, "medium" thoroughness:

```
Search documentation for context on: {task_name}

Search roots: {discovery_root}, and also the proprietary repo at {proprietary_root} if different

## Where to look

1. `apps/doc/` — public Mintlify end-user docs
2. `AGENTS.md`, `CLAUDE.md`, root `README.md`
3. `.claude/specs/` — prior design specs in this repo
4. `.claude/plans/` — prior implementation plans in this repo
5. `.claude/rules/packmind/*.md` — coding standards (frontmatter `paths` shows which paths each governs)
6. `tmp/feature-specs/` — earlier feature specs (any directory matching the task keywords)
7. Package-level `*.md` files (e.g., `packages/standards/README.md`)

## Find

- Related specifications, RFCs, or design docs
- Coding standards whose `paths` glob will match the files this feature touches
- Planned work that might overlap or conflict
- Historical context or decisions

## Output Format

Return JSON:
{
  "related_docs": [{"path": "", "relevance": "high|medium|low", "summary": ""}],
  "applicable_standards": [{"path": ".claude/rules/packmind/foo.md", "paths_glob": "", "summary": ""}],
  "planned_work": [{"path": "", "description": "", "potential_overlap": ""}],
  "historical_context": [""]
}
```

Wait for BOTH subagents to complete before proceeding.

### 2.4 Synthesize & Present Discovery

Combine subagent results and present to the user (informational — no approval gate here):

```
## Discovery Summary

### Target repo
{target_repo} (discovery root: {discovery_root})

### Reference Domain Package: `packages/{name}/`
Full hex stack trace:

**Domain layer**
- `{file}:{line}` — {role}

**Application layer**
- `{file}:{line}` — {role}

**Infrastructure layer**
- `{file}:{line}` — {role}

**Types package** (`packages/types/src/{domain}/`)
- `{file}:{line}` — {role}

**Hexa facade**
- `{file}:{line}`

### Reference API Route
- `{controller_file}:{line}` — `{METHOD} {path}` → uses port `{port_name}`

### Reference Frontend Feature
- Gateway: `{file}:{line}`
- Queries: `{file}:{line}`
- Page: `{file}:{line}`
- UI components: {list of PM-* components used}

### Test Patterns
- Use case spec: `{file_pattern}`
- Repository spec: `{file_pattern}`
- Frontend component spec: `{file_pattern}`
- Integration tests: `{dir}`

### Conventions Found
- Naming: {conventions.naming}
- Authorization: {conventions.authorization}
- Error mapping: {conventions.error_mapping}
- Events: {conventions.events}
- Frontend data flow: {conventions.frontend_data_flow}

### Applicable Coding Standards
{For each from documentation researcher:}
- `{path}` (governs: `{paths_glob}`) — {summary}

### Related Documentation
{For each:}
- `{path}` ({relevance}) — {summary}

### Constraints
{constraints list, including OSS/proprietary boundary callouts if relevant}
```

### 2.5 Draft Acceptance Criteria

Using the discovery context, analyze `task_description` for:
- Existing acceptance criteria (checkboxes, numbered lists)
- User stories or personas mentioned
- Technical constraints or requirements
- Scope boundaries (what's included/excluded)

Validate patterns against the task:

1. **Relevance check** — Does the reference domain cover the layers this task needs?
2. **Consistency check** — Do similar features follow the same conventions?
3. **Gap check** — Does the task require something no existing feature does (e.g., a new port type, a new event)?

Then draft acceptance criteria and present everything for approval:

```
### Pattern Validation

**Reference template:** `packages/{name}` — {applicable | partially applicable | not applicable}
**Convention consistency:** {consistent across N features | divergences noted: ...}
**Gaps:** {none | list of things no existing feature covers}

**Derived approach:** Follow `packages/{name}` pattern across {layers}. {Gap handling, if any.}

## Draft Acceptance Criteria

Based on the source description and discovery analysis:

- [ ] {Criterion 1 — extracted from source}
- [ ] {Criterion 2 — extracted from source}
- [ ] {Criterion N — inferred from discovery patterns, e.g., "Soft delete supported following standard repository pattern"}

### Potential Gaps
{List anything the source doesn't cover but the reference feature handles, e.g., authorization, events, error mapping}

### Potential Over-scope
{List anything in the source that may be too broad or vague}
```

### 2.6 Approval Gate

Use the `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Do the discovered patterns and draft acceptance criteria look correct?",
    "header": "Phase 2",
    "multiSelect": false,
    "options": [
      {"label": "Yes, proceed", "description": "Patterns and criteria are accurate, continue to generate the full functional spec"},
      {"label": "Needs adjustment", "description": "I'll clarify what's wrong or missing"}
    ]
  }]
}
```

If the user needs adjustment, incorporate their feedback and re-present step 2.5.

### 2.7 Generate Functional Specification

Create `tmp/feature-specs/{task_slug}/functional-spec.md`:

```markdown
## Functional Specification

### Overview
{1-2 paragraphs: what the feature does and why}
{Reference the derived approach from pattern validation}

### Target Repo
{target_repo} — most changes land in {discovery_root}. Note any tasks that must live in the proprietary fork (e.g., editions, paid deployments).

### Business Requirements
1. {Requirement 1}
2. {Requirement 2}
3. {Requirement 3}

### User Stories
- As a {role}, I want to {action}, so that {benefit}
- As a {role}, I want to {action}, so that {benefit}

### Acceptance Criteria
- [ ] {Criterion 1 — specific, measurable}
- [ ] {Criterion 2 — specific, measurable}
- [ ] {Criterion 3 — specific, measurable}

### Constraints
- {Technical constraint, e.g., "Must follow AbstractSpaceMemberUseCase authorization pattern"}
- {Performance requirement}
- {Compatibility requirement}
- {OSS/proprietary boundary — e.g., "No imports from @packmind/editions in OSS tasks"}
{Include constraints from discovery if relevant}

### Out of Scope
- {Explicitly excluded item}

### Dependencies
{List known dependencies — other packages, ports, planned work that must precede this}
```

### 2.8 Save Discovery

Write `tmp/feature-specs/{task_slug}/discovery.md` with YAML frontmatter capturing everything the implementation plan subagent will need:

```markdown
---
target_repo: {oss | proprietary | both}
discovery_root: "{absolute path}"

reference_domain:
  package: "packages/{name}"
  domain_files:
    - file: "packages/{name}/src/domain/entities/{Entity}.ts"
      line: 1
      role: "Main entity"
  application_files:
    - file: "packages/{name}/src/application/useCases/{name}/{name}.usecase.ts"
      line: 1
      role: "Closest existing use case"
  infra_files:
    - file: "packages/{name}/src/infra/repositories/{Entity}Repository.ts"
      line: 1
      role: "Repository implementation"
  types_files:
    - file: "packages/types/src/{name}/ports/I{Name}Port.ts"
      line: 1
      role: "Port interface"
  hexa_facade:
    file: "packages/{name}/src/{Name}Hexa.ts"
    line: 1

reference_route:
  controller: "apps/api/src/controllers/{Name}Controller.ts"
  method: "create"
  line: 42
  http: "POST /api/{path}"
  uses_port: "I{Name}Port"

reference_frontend:
  gateway:
    file: "apps/frontend/src/.../{Name}Gateway.ts"
    line: 1
  queries:
    - file: "apps/frontend/src/.../use{Name}.ts"
      line: 1
  page:
    file: "apps/frontend/src/.../{Name}Page.tsx"
    line: 1
  ui_components:
    - name: "PMButton"
      file: "packages/ui/src/PMButton.tsx"

test_patterns:
  usecase_spec: "packages/{name}/src/application/useCases/{name}/{name}.usecase.spec.ts"
  repository_spec: "packages/{name}/src/infra/repositories/{Entity}Repository.spec.ts"
  frontend_component_spec: "apps/frontend/src/.../{Name}Page.spec.tsx"
  integration_tests_dir: "packages/integration-tests"

conventions:
  naming: "{from subagent}"
  authorization: "AbstractSpaceMemberUseCase | AbstractMemberUseCase | AbstractAdminUseCase"
  error_mapping: "{from subagent}"
  events: "{from subagent}"
  frontend_data_flow: "gateway → query hook → component, PM-prefixed UI from @packmind/ui"

applicable_standards:
  - path: ".claude/rules/packmind/packmind-proprietary.md"
    paths_glob: "**/*"
    summary: "Forbid imports from @packmind/editions in proprietary code"

constraints:
  - "{e.g., must use soft-delete-aware AbstractRepository}"

pattern_validation:
  reference_applicable: true
  convention_consistency: "consistent across N features"
  gaps: []
  derived_approach: "Follow packages/{name} pattern across {layers}"

related_documentation:
  - path: "{path}"
    relevance: "high"
    summary: "..."
---

## Discovery Summary

{Mirror the human-readable view from step 2.4}

## Pattern Validation

{Mirror the pattern-validation block from step 2.5}
```

## Next Phase

Proceed automatically to `phase-3-implementation.md`.
