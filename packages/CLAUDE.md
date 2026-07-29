# Packages

This directory contains reusable domain and infrastructure packages shared across applications.

## Package Categories

### Core Infrastructure

- **types** - Shared TypeScript types and interfaces used across packages and apps
- **logger** - Logging utilities with console and structured output support
- **node-utils** - Node.js utility functions for file system, path manipulation, and common operations
- **test-utils** - Test factories, fixtures, and utilities for consistent test data creation
- **migrations** - TypeORM database migrations for schema evolution

### Domain Packages

- **accounts** - User account management, authentication, and user profiles
- **spaces** - Workspace management, space members, roles, and permissions
- **standards** - Coding standards creation, storage, and retrieval
- **commands** - Multi-step coding command definitions and execution (formerly "recipes")
- **skills** - AI agent skill definitions and management
- **editions** - Product edition management (OSS, Enterprise, etc.)
- **feature-flags** - Shared, browser-safe feature-flag registry and decision logic (consumed by both frontend and backend)
- **playbook-change-applier** - Applies proposed changes to playbook artifacts (standards, commands, skills)

### Integration & Deployment

- **git** - Git repository operations for standards and command deployment
- **deployments** - Deployment pipeline for distributing standards, commands, and skills to AI agents
- **coding-agent** - AI coding agent integration and rendering for multiple agent types (Claude Code, Cursor, etc.)

### Language Analysis

- **linter-ast** - Abstract syntax tree (AST) analysis and manipulation utilities
- **linter-execution** - Linting rule execution engine for coding standards
- **llm** - Large language model integration for AI-powered features

### Frontend

- **frontend** - Shared `data-testid` enums used by both `apps/frontend` components and `apps/e2e-tests` page objects (Nx project name: `frontend-lib`)
- **ui** - Reusable UI components with Chakra UI (PM-prefixed components)

### Supporting

- **assets** - Static assets, WASM files, and embedded resources
- **integration-tests** - Cross-package integration test suites (deployments, standards, tracked repositories, etc.) (Nx project name: `@packmind/integration-tests`)

## Environment Tags and Import Boundaries

Every `packages/*/project.json` declares an `env:*` tag, and `@nx/enforce-module-boundaries` in the
root `eslint.config.mjs` turns those tags into hard import rules:

| Tag | May depend on |
| --- | --- |
| `env:node` | anything |
| `env:shared` | `env:shared`, `env:node` |
| `env:browser` | `env:shared`, `env:browser` — **never** `env:node` |

- `env:shared`: `types`, `assets`, `editions`, `feature-flags`
- `env:browser`: `ui`, `frontend`
- `env:node`: everything else

A lint error about module boundaries usually means code belongs in a differently-tagged package, not
that the rule needs an exception.

## Package Layout

Domain packages (`accounts`, `spaces`, `standards`, `skills`, `commands`, `deployments`, `git`,
`coding-agent`, `llm`) follow a common shape. Only the first four lines are present in every one of
them; the rest exist where the package needs them, so check before assuming a directory is there:

```
src/<Name>Hexa.ts                       always — entry point, extends BaseHexa
src/application/adapter/<Name>Adapter.ts always
src/application/services/               always
src/index.ts                            always — public barrel; nothing is importable until exported here
src/application/useCases/<useCaseName>/ all but spaces (which drives everything through services)
src/domain/repositories|useCases|errors/ most
src/domain/entities/                    only accounts, standards, deployments
src/infra/schemas/                      persistence packages only — <name>Schemas.ts barrel of TypeORM EntitySchemas
src/infra/repositories/                 persistence packages only
src/application/jobs/ + src/domain/jobs/ only commands, deployments, git
test/                                   only the 7 packages listed below
```

`BaseHexa`, `BaseService` and `HexaRegistry` come from `@packmind/node-utils`
(`packages/node-utils/src/hexa/`).

Two of the packages above are **not** persistence domains and diverge most: `coding-agent` has no
`infra/schemas/`, no `test/` and stores nothing, and `llm` has schemas but no `test/`.

### Architecture rules live in `packages/.claude/rules/packmind/`

The behavioural conventions for this layout are Packmind standards, not documented here — consult
them rather than inferring from neighbouring code:

- **Use Case Architecture Patterns** — contract-per-file in `packages/types/src/<domain>/contracts/`,
  the `AbstractMemberUseCase` / `AbstractAdminUseCase` / `AbstractSpaceMemberUseCase` split
- **Port-Adapter Cross-Domain Integration** — how one domain may reach another
- **Scoped Repository Patterns** — `OrganizationScopedRepository` / `SpaceScopedRepository`
- **Domain Events**
- **Back-end repositories SQL queries using TypeORM**
- **Back-end TypeScript Clean Code Practices**

## Cross-Package Conventions

### Entity factories: the `/test` subpath

Packages that own persisted entities ship their factories in `packages/<pkg>/test/` (an `index.ts`
plus one `<entity>Factory.ts` per entity), imported as `@packmind/<pkg>/test` — for example
`import { standardFactory } from '@packmind/standards/test'`.

**Exactly seven packages have this subpath**: `accounts`, `commands`, `deployments`, `git`, `skills`,
`spaces`, `standards`. There is no `@packmind/coding-agent/test` or `@packmind/llm/test` — don't
import one. (`packages/node-utils/test/` exists but holds shared test suites, not factories, and is
not exposed as a subpath.)

Only `commands`, `deployments`, `skills`, `spaces` (and the legacy `recipes`) have an explicit
`"@packmind/<pkg>/test"` entry in `tsconfig.base.json`; `accounts`, `git` and `standards` resolve
through the workspace package instead. If a new `/test` subpath fails to resolve under Jest, add the
alias — `jest.config.ts` maps modules from those `paths`.

- Spec files import factories from there; production code must not.
- **Entity** factories belong to the owning package's `test/` folder; **generic** test helpers
  (datasource, logger stub, mock instances) belong to `@packmind/test-utils`.

### Branded IDs

Entity identifiers are never bare strings. Each one is declared in `@packmind/types` as a branded
type plus a creator, following `packages/types/src/skills/SkillId.ts`:

```ts
import { Branded, brandedIdFactory } from '../brandedTypes';

export type SkillId = Branded<'SkillId'>;
export const createSkillId = brandedIdFactory<SkillId>();
```

The `Branded` / `brandedIdFactory` helpers live in `packages/types/src/brandedTypes.ts`.

## Working with Packages

### Common Nx Commands

- Build a package: `./node_modules/.bin/nx build <package-name>`
- Test a package: `./node_modules/.bin/nx test <package-name>`
- Lint a package: `./node_modules/.bin/nx lint <package-name>`

> Two Nx project names differ from their directory name: `packages/frontend` is `frontend-lib` (plain
> `frontend` is the **app**) and `packages/integration-tests` is `@packmind/integration-tests`.
>
> Most targets are **inferred** by Nx plugins rather than declared: `@nx/jest/plugin` derives `test`
> from a package's `jest.config.ts` and `@nx/eslint/plugin` derives `lint` (see `plugins` in
> `nx.json`). So a `project.json` that lists only `build` still has a `test` target — check with
> `./node_modules/.bin/nx show project <package-name>` instead of reading `project.json`.

**Example packages**: `types`, `logger`, `accounts`, `standards`, `ui`, `node-utils`, `test-utils`
