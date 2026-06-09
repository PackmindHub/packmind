# architecture-tests

Executable enforcement of Packmind's hexagonal (ports & adapters) architecture,
powered by [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS).

Each test is a rule about which layer may import which. Rules are expressed as
import-dependency constraints over the real TypeScript source graph (aliases
resolved via `tsconfig`), so a failure points at the exact offending file with a
clickable path.

## Why a separate command

These tests are **not** part of `nx run-many -t test` / `npm run test:staged`.
They scan the whole monorepo's dependency graph (slower) and they intentionally
surface pre-existing violations as failures. Keeping them on a dedicated target
avoids breaking the main suite while still giving the team a runnable
architecture report.

```bash
npm run test:arch
# = PACKMIND_EDITION=oss nx run architecture-tests:arch
```

The `arch` target first runs `scripts/build-arch-tsconfig.mjs`, which generates a
self-contained `tsconfig.arch.json` (git-ignored) from the edition-aware
`tsconfig.base.effective.json`. ArchUnitTS reads tsconfig with
`ts.readConfigFile` (which does not follow `extends`), so it needs an inlined,
include-bearing config — that is what the generator produces.

## The workflow being enforced

```
NestJS controller → NestJS service → domain Adapter → UseCase
  → application Service → repository interface (port) → repository implementation (infra)
```

Dependencies only ever point downward/inward. The rules below assert the
forbidden shortcuts and back-edges.

## Rules

Rules live in `src/*.arch.spec.ts`. Layer selection globs are centralised in
`src/architecture.ts` (tolerant of folder-naming variants such as
`useCases`/`usecases` and `adapter`/`adapters`).

### Core workflow layering — `src/layering.arch.spec.ts`

| Rule                                            | Guards                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `infra/repositories` ↛ `application/**`         | Persistence must not depend upward on use cases/adapters/services.                                                |
| `application/useCases` ↛ `infra/repositories`   | Use cases reach data via services/ports, never concrete repositories. (`standard-use-case-architecture-patterns`) |
| `application/adapter(s)` ↛ `infra/repositories` | "Never directly call Repositories in Adapter classes." (`standard-use-case-architecture-patterns`)                |
| `application/services` ↛ `infra/repositories`   | Services depend on repository **interfaces** (`domain/repositories`), not implementations.                        |
| `apps/api` controllers ↛ `infra/repositories`   | The API layer goes through ports, never straight to persistence. (`standard-nestjs-module-hierarchy`)             |

### Domain purity — `src/domain-purity.arch.spec.ts`

| Rule                           | Guards                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `domain/**` ↛ `application/**` | The innermost ring must not know about the layer that depends on it. |
| `domain/**` ↛ `infra/**`       | Domain stays free of infrastructure.                                 |

### Cross-domain isolation — `src/cross-domain.arch.spec.ts`

| Rule                                                                          | Guards                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/<domain>/src` ↛ `packages/<other-domain>/src` (one rule per domain) | Domains collaborate only through `@packmind/types` ports wired by the HexaRegistry — never by importing each other's source. Complements the Nx `env:*` tag boundaries. (`standard-port-adapter-cross-domain-integration`) |

Domains considered: `accounts`, `spaces`, `standards`, `recipes`, `skills`,
`git`, `deployments`, `coding-agent` (see `DOMAIN_PACKAGES` in
`src/architecture.ts`).

## Known violations (tech debt)

As of introduction, **8 of 15 rules pass** and **7 fail**. Failures are real and
left visible on purpose. Each is either fixed by refactoring the offending import
or accepted as tracked debt.

**Core layering**

- `infra/repositories ↛ application` — `coding-agent` `PackmindDeployer` imports
  `CommandsIndexService` and `StandardsIndexService`.
- `useCases ↛ infra/repositories` — three `git` use cases import
  `GithubTokenResolverFactory` (`addGitProvider`, `updateGitProvider`,
  `shared/validateProviderCredentials`).
- `adapter ↛ infra/repositories` — `git` `GitAdapter` → `GithubTokenResolverFactory`;
  `llm` `LlmAdapter` → `AIProviderRepository`.
- `services ↛ infra/repositories` — `recipes` `RecipeService` and
  `RecipeVersionService` import their concrete repositories directly.

**Domain purity**

- `domain ↛ application` — `domain/jobs/*DelayedJobs` interfaces import concrete
  `application/jobs/*DelayedJob` classes in `deployments`, `git`, `recipes` (×2)
  and `standards`.
- `domain ↛ infra` — `coding-agent` `ICodingAgentDeployer` imports
  `DefaultSkillsDeployer`.

**Cross-domain**

- `deployments` imports `coding-agent`, `recipes`, `skills`, `spaces` and
  `standards` directly (use cases / `DefaultSkillsMetadataEnricher` →
  `coding-agent`; `PackageRepository` → the four others). The other seven domains
  are cleanly isolated.

Standards referenced above live under
`packages/.claude/rules/packmind/` and `apps/api/.claude/rules/packmind/`.
