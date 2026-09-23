# context.md Schema

Loaded by `phase-4-finalize.md` step 4.1. Defines the structured artifact
that `/feature-sprint` consumes to set up parallel execution.

## Extraction process (in order)

1. Read `discovery.md` YAML frontmatter → `target_repo`, `discovery_root`,
   `reference_domain.*`, `reference_route.*`, `reference_frontend.*`,
   `applicable_standards`.
2. Read `{task_slug}.md` YAML frontmatter → `task_id`, `task_name`,
   `source_type`, `source_url`.
3. Parse `functional-spec.md` body → scope (`in_scope`, `out_of_scope`,
   `constraints`). These need light prose-to-list conversion; keep items
   short and verbatim where possible.
4. Parse `implementation-plan.md` "Parallel Groups" table → populate
   `parallel_groups[]`. Each row maps to one entry; `task_ids` is the
   comma-split task IDs column.
5. Set `version: "1.1"` if `parallel_groups[]` is non-empty, else `"1.0"`.

## Template

Write to `tmp/feature-specs/{task_slug}/context.md`:

```markdown
---
version: "1.0"  # bump to "1.1" if parallel_groups non-empty
task_slug: "{task_slug}"
task_id: "{from main spec frontmatter}"
task_name: "{task_name}"

source:
  type: "{source_type from main spec}"
  url: "{source_url from main spec}"

target_repo: "{oss | proprietary | both}"
discovery_root: "{absolute path from discovery.md}"
proprietary_root: "{absolute path of the proprietary repo — i.e. `realpath .` when running this skill from the proprietary repo root}"
oss_root: "{absolute path of the OSS sibling — i.e. `realpath ../packmind`}"

stack:
  api: "NestJS (apps/api)"
  domain_packages: "packages/{domain}/src/{domain,application,infra}"
  types: "packages/types"
  frontend: "React + @packmind/ui (apps/frontend)"
  tests: "Jest + @swc/jest"
  integration_tests: "packages/integration-tests"
  db: "TypeORM + PostgreSQL"
  migrations: "packages/migrations"

reference:
  domain_package: "{from discovery.reference_domain.package}"
  usecase_file: "{from discovery}"
  api_controller: "{from discovery}"
  frontend_page: "{from discovery}"

discovery_summary:
  patterns: "{1-2 sentence summary of the derived approach}"
  applicable_standards:
    - path: ".claude/rules/packmind/packmind-proprietary.md"
      summary: "Forbid imports from @packmind/editions"

scope_definition:
  in_scope:
    - "{extracted from functional-spec.md}"
  out_of_scope:
    - "{extracted from functional-spec.md}"
  constraints:
    - "{extracted from functional-spec.md}"

quality_gates:
  # Nx targets to run for the projects this feature touches.
  # /feature-sprint will resolve which projects need each target.
  lint: true
  test: true
  build: true
  extra: []

parallel_groups:  # Populate from implementation-plan.md "Parallel Groups" section
  - group_id: "A"
    group_name: "backend-{domain}"
    task_ids: ["1.1", "1.2", "1.3"]
    target_files: ["packages/{domain}/..."]
    repo: "oss"
    blocked_by: []
  - group_id: "B"
    group_name: "frontend-{domain}"
    task_ids: ["2.1", "2.2"]
    target_files: ["apps/frontend/..."]
    repo: "oss"
    blocked_by: []
  - group_id: "C"
    group_name: "tests"
    task_ids: ["3.1", "3.2"]
    target_files: ["packages/integration-tests/..."]
    repo: "oss"
    blocked_by: ["A", "B"]
---

## Implementation Context

**Task:** {task_name}
**Slug:** {task_slug}
**Target repo:** {target_repo}

### Discovery summary
- Reference domain: `{reference.domain_package}`
- Reference use case: `{reference.usecase_file}`
- Reference API: `{reference.api_controller}`
- Reference frontend: `{reference.frontend_page}`

### Scope
**In scope:**
- {items}

**Out of scope:**
- {items}

**Constraints:**
- {items}

### Quality gates
- Lint: nx lint on affected projects
- Test: nx test on affected projects
- Build: nx build on affected projects

### Parallel groups
| Group | Name | Tasks | Repo | Blocked by |
|-------|------|-------|------|------------|
| A | {name} | 1.1, 1.2, 1.3 | oss | — |
| B | {name} | 2.1, 2.2 | oss | — |
| C | {name} | 3.1, 3.2 | oss | A, B |
```

## Notes

- `parallel_groups[*].repo` is independent of the top-level `target_repo`:
  one feature can have OSS and proprietary groups in `both` mode.
- `blocked_by` may be empty `[]`. Don't omit the key.
- If a group has no obvious file area (e.g., cross-cutting tests), name it
  by purpose (`tests`, `wiring`) rather than by file path.
