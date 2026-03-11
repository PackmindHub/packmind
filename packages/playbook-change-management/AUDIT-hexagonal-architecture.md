# Hexagonal Architecture Audit Report: `playbook-change-management`

**Date**: 2026-03-11
**Author**: Senior Developer (onboarding audit)
**Scope**: Use cases, adapters, ports, repositories, and application patterns

---

## Context

This audit examines `packages/playbook-change-management/` against the team's hexagonal architecture standards (see `.packmind/standards/use-case-architecture-patterns.md`) and compares it with reference implementations in `accounts`, `standards`, and `spaces` packages. The goal is to detect drifts, inconsistencies, structural pattern divergences, and coupling issues.

---

## 1. STRUCTURAL INCONSISTENCIES (Folder Naming)

### 1.1 `adapters/` (plural) vs `adapter/` (singular) — DRIFT

| Package | Folder path |
|---|---|
| accounts | `src/application/adapter/` (singular) |
| standards | `src/application/adapter/` (singular) |
| **playbook-change-management** | **`src/application/adapters/`** (plural) |

**Verdict**: Naming drift. All other packages use `adapter/` (singular). This package uses `adapters/` (plural) despite containing a single adapter file + barrel. This breaks `grep`/`glob` consistency across the monorepo.

**Recommendation**: Rename `adapters/` to `adapter/` via `git mv`.

### 1.2 Missing domain layer richness — DESIGN CONCERN

The `domain/` folder contains only:
- `repositories/` (2 interfaces)
- `errors/` (6 error classes)

There are **no domain entities, value objects, or domain services** in the domain layer. The core `ChangeProposal` entity lives in `@packmind/types`, not in the domain folder. While this follows the shared-types pattern used across the monorepo, it means the domain layer is essentially hollow — just repository interfaces and error classes.

**Verdict**: Acceptable if aligned with the team's convention of keeping entities in `@packmind/types`. But worth noting that `domain/` is thinner than other packages (e.g., `accounts` has domain services).

---

## 2. USE CASE PATTERN VIOLATIONS

### 2.1 Loose function in `useCases/` — `findPendingById.ts` — VIOLATION

**File**: `src/application/useCases/findPendingById.ts`

This is a **standalone exported function** sitting directly in the `useCases/` folder — not a class, not in its own subfolder, and not following the use case pattern.

```typescript
export async function findPendingById(
  service: ChangeProposalService,
  changeProposalId: ChangeProposalId,
): Promise<ChangeProposal<ChangeProposalType>> { ... }
```

**Standard violation**: Per `use-case-architecture-patterns.md`, use cases must be classes extending `AbstractMemberUseCase`/`AbstractAdminUseCase` or implementing `IPublicUseCase`. This function is neither — it's a utility helper masquerading as a use case.

**Recommendation**: Move to `application/services/` (it's a service-level helper) or inline it into the use cases that call it.

### 2.2 `IChangesProposalApplier` interface lives inside a use case folder — STRUCTURAL DRIFT

**File**: `src/application/useCases/applyChangeProposals/IChangesProposalApplier.ts`

Port/strategy interfaces should not be co-located inside a specific use case folder. Other strategy interfaces (e.g., `IChangeProposalValidator`) correctly live in `application/validators/`. This interface should follow the same pattern.

Similarly, `ICreateChangeProposalApplier` lives inside `src/application/useCases/applyCreationChangeProposals/`.

**Recommendation**: Extract these interfaces to a dedicated `application/appliers/` folder for consistency with `application/validators/`.

### 2.3 Applier concrete classes co-located with use cases — COUPLING

Files like `StandardChangesApplier.ts`, `CommandChangesApplier.ts`, `SkillChangesApplier.ts` live inside `useCases/applyChangeProposals/`. These are **strategy implementations**, not use cases. Co-locating them creates tight structural coupling and makes the use case folder bloated (11 files in `applyChangeProposals/`, 8 files in `applyCreationChangeProposals/`).

**Recommendation**: Move applier implementations to `application/appliers/` alongside their interfaces.

### 2.4 Use case contracts: inconsistent naming convention — DRIFT

In `packages/types/src/playbookChangeManagement/contracts/`:

| Contract file | Pattern |
|---|---|
| `ICreateChangeProposalUseCase.ts` | `I{Name}UseCase` |
| `IApplyChangeProposals.ts` | `I{Name}` (no UseCase suffix) |
| `IListChangeProposalsByArtefact.ts` | `I{Name}` (no UseCase suffix) |
| `IListChangeProposalsBySpace.ts` | `I{Name}` (no UseCase suffix) |
| `IBatchCreateChangeProposalsUseCase.ts` | `I{Name}UseCase` |
| `ICheckChangeProposalsUseCase.ts` | `I{Name}UseCase` |
| `IApplyCreationChangeProposalsUseCase.ts` | `I{Name}UseCase` |
| `IApplyCommandChangeProposalUseCase.ts` | `I{Name}UseCase` (legacy?) |
| `IRejectCommandChangeProposalUseCase.ts` | `I{Name}UseCase` (legacy?) |
| `IListCommandChangeProposalsUseCase.ts` | `I{Name}UseCase` (legacy?) |

**Verdict**: Mixed naming — some contracts have `UseCase` suffix, some don't. The standard says "Export exactly three type definitions: `{Name}Command`, `{Name}Response`, and `I{Name}UseCase`". Files like `IApplyChangeProposals.ts` and `IListChangeProposalsByArtefact.ts` violate this rule.

Also, legacy contracts (`IApplyCommandChangeProposalUseCase`, `IRejectCommandChangeProposalUseCase`, `IListCommandChangeProposalsUseCase`) appear to be dead code from a previous iteration.

---

## 3. PORT AND ADAPTER INCONSISTENCIES

### 3.1 `BatchCreateChangeProposalsUseCase` receives `this` (the adapter itself) — SELF-REFERENTIAL COUPLING

**File**: `PlaybookChangeManagementAdapter.ts`

```typescript
this._batchCreateChangeProposals = new BatchCreateChangeProposalsUseCase(
  accountsPort,
  this,  // <-- the adapter passes itself as IPlaybookChangeManagementPort
  deploymentPort,
);
```

The `BatchCreateChangeProposalsUseCase` receives the adapter as `IPlaybookChangeManagementPort` to call `createChangeProposal()`. This creates a **circular dependency** within the same hexagon: a use case calls back into its own adapter/port to invoke another use case.

**Standard violation**: "Reuse existing use cases through port/adapter interfaces instead of instantiating them directly within use cases" — but this rule was intended for **cross-domain** reuse. Within the same domain, a use case calling another use case through the port creates an unnecessary roundtrip through the adapter layer.

**Recommendation**: Inject `CreateChangeProposalUseCase` directly, or extract the shared logic into a service.

### 3.2 `validateSpaceOwnership` and `validateArtefactInSpace` — FREE FUNCTIONS calling ports — PATTERN INCONSISTENCY

**Files**:
- `src/application/services/validateSpaceOwnership.ts`
- `src/application/services/validateArtefactInSpace.ts`

These are **standalone functions** (not class methods) that accept ports as parameters. They live in the `services/` folder but are not part of any service class. This creates inconsistency:
- `ChangeProposalService` — proper class-based service
- `ConflictDetectionService` — proper class-based service
- `DiffService` — re-export from `@packmind/types`
- `validateSpaceOwnership` — loose function
- `validateArtefactInSpace` — loose function

**Recommendation**: Either encapsulate these in a `ValidationService` class or move them to a `utils/` folder to differentiate them from class-based services.

### 3.3 `validateArtefactInSpace` — brute-force type resolution via sequential port calls — DESIGN SMELL

```typescript
const standard = await standardsPort.getStandard(artefactId as StandardId);
if (standard) { ... return; }
const recipe = await recipesPort.getRecipeByIdInternal(artefactId as RecipeId);
if (recipe) { ... return; }
const skill = await skillsPort.getSkill(artefactId as SkillId);
if (skill) { ... return; }
```

This function casts the same `artefactId` to three different types and tries each port sequentially. This is a **type-safety bypass** (`as` casts) and creates **unnecessary coupling** to three external ports for a simple validation. It also means 1-3 database round trips per call.

---

## 4. DOMAIN ERROR DUPLICATION

### 4.1 `ChangeProposalConflictError` exists in two places — DRY VIOLATION

- `src/domain/errors/ChangeProposalConflictError.ts` (local domain error)
- `@packmind/types` at `playbookChangeManagement/applier/ChangeProposalConflictError.ts`

This creates import confusion. Also, `SpaceNotFoundError` and `SpaceOwnershipMismatchError` are generic space-related errors that might belong in a shared location rather than being redefined per-domain.

---

## 5. LISTENER PATTERN GAPS

### 5.1 Missing `RecipeDeletedEvent` handler — FUNCTIONAL BUG

**File**: `src/application/listeners/ChangeManagementListener.ts`

The listener handles:
- `StandardDeletedEvent` → cancels pending proposals
- `SkillDeletedEvent` → cancels pending proposals
- **`RecipeDeletedEvent`** → **NOT HANDLED**

The `RecipeDeletedEvent` exists and is emitted from `packages/recipes/`. However, the `ChangeManagementListener` does not subscribe to it. This means when a recipe/command is deleted, **pending change proposals for that recipe are NOT cancelled**, leading to orphaned proposals.

**Recommendation**: Add `RecipeDeletedEvent` handler following the same pattern as the other two.

### 5.2 Listener receives `ChangeProposalService` but generic is `PackmindListener<TAdapter>` — SEMANTIC DRIFT

`PackmindListener<TAdapter>` is designed to receive an **adapter** (port implementation). But `ChangeManagementListener` receives a `ChangeProposalService` — which is a domain service, not an adapter. The generic parameter name `TAdapter` is misleading here.

---

## 6. RE-EXPORT PATTERN — INCONSISTENT LAYERING

### 6.1 `DiffService` and `isExpectedChangeProposalType` are pure re-exports from `@packmind/types`

**Files**:
- `src/application/services/DiffService.ts` → `export { DiffService } from '@packmind/types';`
- `src/application/utils/isExpectedChangeProposalType.ts` → `export { isExpectedChangeProposalType } from '@packmind/types';`

These files exist **only** to re-export from `@packmind/types`. This creates phantom files that look like local implementations but aren't. Other consumers in the same package import from these re-export files, creating an indirection layer with no value.

**Verdict**: Either import directly from `@packmind/types` everywhere, or document why the re-export exists.

---

## 7. COUPLING ANALYSIS

### 7.1 High external port dependency count — 6 ports

The adapter's `initialize()` method requires **6 external ports**: `IAccountsPort`, `ISpacesPort`, `IStandardsPort`, `IRecipesPort`, `ISkillsPort`, `IDeploymentPort` — plus `PackmindEventEmitterService`.

This is the highest port count of any package audited. It signals this package is an **orchestration layer** rather than a pure domain — which may warrant architectural discussion about whether this belongs in a dedicated orchestration/application-services layer.

### 7.2 `ApplyChangeProposalsUseCase` receives 8 constructor parameters

```typescript
constructor(
  accountsPort, spacesPort, standardsPort, recipesPort, skillsPort,
  deploymentPort, changeProposalService, eventEmitterService
)
```

This is the heaviest constructor in the package and suggests this use case has too many responsibilities.

**Recommendation**: Consider splitting into smaller use cases or extracting some logic into dedicated services.

---

## 8. SUMMARY TABLE

| # | Finding | Severity | Category |
|---|---|---|---|
| 1.1 | `adapters/` vs `adapter/` folder naming | Low | Structural consistency |
| 2.1 | `findPendingById` loose function in useCases/ | Medium | Standard violation |
| 2.2 | Strategy interfaces inside use case folders | Medium | Structural drift |
| 2.3 | Applier implementations inside use case folders | Medium | Coupling |
| 2.4 | Inconsistent contract file naming | Low | Naming convention |
| 3.1 | Adapter passes `this` to use case (circular) | **High** | Coupling violation |
| 3.2 | Loose validation functions in services/ | Low | Pattern inconsistency |
| 3.3 | Brute-force type resolution with `as` casts | Medium | Type safety |
| 4.1 | Duplicate `ChangeProposalConflictError` | Medium | DRY violation |
| 5.1 | Missing `RecipeDeletedEvent` handler | **High** | Functional bug |
| 5.2 | Listener typed with service instead of adapter | Low | Semantic drift |
| 6.1 | Phantom re-export files | Low | Unnecessary indirection |
| 7.1 | 6 external port dependencies | Info | Coupling awareness |
| 7.2 | 8-parameter constructor | Medium | Complexity |

### Priority Fixes

1. **P0 — Bug**: Add `RecipeDeletedEvent` handler to `ChangeManagementListener`
2. **P1 — Architecture**: Extract applier interfaces and implementations from use case folders into `application/appliers/`
3. **P1 — Architecture**: Refactor `BatchCreateChangeProposalsUseCase` to avoid self-referential adapter coupling
4. **P2 — Consistency**: Rename `adapters/` to `adapter/`
5. **P2 — Consistency**: Move `findPendingById` to services or inline it
6. **P2 — Cleanup**: Resolve `ChangeProposalConflictError` duplication
7. **P3 — Housekeeping**: Normalize contract naming, clean up re-exports, remove legacy contracts
