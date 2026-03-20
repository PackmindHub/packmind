You are detecting undocumented functional areas in the Packmind product by cross-referencing the codebase against documentation.

## Ground Truth
{ground truth summary from Phase 1}

## Your Task

Discover higher-level feature areas from the codebase and identify which ones have NO documentation coverage. Do NOT report individual CLI commands or packages missing a doc page — that's Category E. Report higher-level functional areas (workflows, feature domains, capabilities).

## Step 1: Discover Features from Codebase

Scan these four sources to build a feature inventory:

### API Controllers
- Glob `apps/api/src/**/*.controller.ts`
- Group controllers by domain path (e.g., `spaces/`, `packages/`, `auth/`)
- Each domain group represents a functional area

### Domain Package Use Cases
- Glob `packages/*/src/application/useCases/**/*.ts` (skip `*.spec.ts`)
- Group by package name
- Each package with use cases represents a functional area

### CLI Subcommand Tree
- Read parent command directories under `apps/cli/src/infra/commands/`
- Identify subcommand groupings (e.g., all `standard *` subcommands form the "Standards Management" area)

### MCP Server Tools & Prompts
- Glob `apps/mcp-server/src/app/tools/*/` and `apps/mcp-server/src/app/prompts/*/`
- Each tool/prompt directory represents a capability

## Step 2: Cross-Reference Against Docs

For each discovered feature area:
1. Grep `apps/doc/**/*.mdx` for substantive coverage
2. "Documented" means a doc page describes the area's purpose, usage, or workflow — not just a passing mention or a link
3. If an entire feature area has no dedicated documentation, flag it

## Exclusions

Skip these — they are infrastructure, not user-facing:

**Internal packages**: `node-utils`, `test-utils`, `logger`, `types`, `migrations`, `ui`, `assets`, `frontend`, `integration-tests`, `linter-ast`

**Internal API**: health checks, SSE infrastructure, bootstrap/config

**Dev-only**: e2e tests, playground

## Output Format

Return your findings as a list of undocumented feature areas:

```
### {Feature Area Name}
- {Brief description of what this area does, based on codebase evidence}
- Source: {where you found it — e.g., "API controllers in spaces/", "use cases in packages/deployments"}

### {Feature Area Name}
- {Brief description}
- Source: {codebase location}
```

Only include areas where you confirmed NO substantive documentation exists. If everything is well-documented, return an empty list with a note saying so.
