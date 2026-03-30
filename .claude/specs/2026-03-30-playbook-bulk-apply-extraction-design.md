# Playbook Bulk Apply — Extraction Design Spec

**Goal:** Extract the `ApplyPlaybookUseCase` from `packages/editions/src/oss/playbook-change-management/` into a new standalone hexagonal package `packages/playbook-bulk-apply/` with its own port, adapter, and hexa facade.

**Scope:**
- In: New package creation, new port/types, move use case + tests, rewire API, clean up editions and dead `packages/playbook-change-management/` directory
- Out: No changes to the `hardDelete` methods on recipes/skills/standards/AbstractRepository (those stay as-is), no changes to the change proposal flow

## Architecture

The new `packages/playbook-bulk-apply/` package follows the same hexagonal conventions as `packages/recipes/`, `packages/skills/`, etc.

Since this domain has **no entities, no repositories, and no schemas** (it orchestrates other domains), the structure is simplified:

```
packages/playbook-bulk-apply/
├── src/
│   ├── index.ts                           # Public exports
│   ├── PlaybookBulkApplyHexa.ts           # Facade
│   └── application/
│       ├── adapter/
│       │   └── PlaybookBulkApplyAdapter.ts  # Implements IPlaybookBulkApplyPort
│       └── useCases/
│           └── applyPlaybook/
│               ├── ApplyPlaybookUseCase.ts
│               └── ApplyPlaybookUseCase.spec.ts
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
└── jest.config.ts
```

No `domain/`, `infra/`, or `test/` directories — there are no entities or repositories to define.

## Data Model

No new entities or schema changes. The use case orchestrates existing domain ports (skills, standards, recipes, spaces) and uses their existing entities.

## Types / Contracts

New files in `packages/types/src/playbookBulkApply/`:

```
packages/types/src/playbookBulkApply/
├── index.ts
├── contracts/
│   ├── index.ts
│   └── IApplyPlaybookUseCase.ts    # Moved from playbookChangeManagement/contracts/
└── ports/
    ├── index.ts
    └── IPlaybookBulkApplyPort.ts   # New port with single method: applyPlaybook()
```

The `IApplyPlaybookUseCase.ts` contract (command, response, types) moves from `packages/types/src/playbookChangeManagement/contracts/` to the new location.

The `IPlaybookChangeManagementPort` loses the `applyPlaybook` method — it goes back to its pre-change state.

Port definition:

```typescript
export const IPlaybookBulkApplyPortName = 'IPlaybookBulkApplyPort';

export interface IPlaybookBulkApplyPort {
  applyPlaybook(command: ApplyPlaybookCommand): Promise<ApplyPlaybookResponse>;
}
```

## Use Cases / Services

Single use case: `ApplyPlaybookUseCase` — moved as-is from `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.ts`. No service layer needed since this use case is a pure orchestrator with no atomic business logic to extract.

The adapter is thin — single method delegating to the use case.

## Hexa Facade

`PlaybookBulkApplyHexa` extends `BaseHexa<BaseHexaOpts, IPlaybookBulkApplyPort>`:
- **Constructor**: Creates adapter (no repos/services to wire)
- **Initialize**: Retrieves 5 ports from registry (accounts, skills, standards, recipes, spaces), passes to adapter
- **getAdapter()**: Returns `IPlaybookBulkApplyPort`

## Edition Wiring

The `@packmind/playbook-bulk-apply` path alias is added to:
- `tsconfig.paths.oss.json` — pointing to `packages/editions/src/index.ts` (same pattern as other edition-dependent packages)
- `tsconfig.paths.proprietary.json` — pointing to `packages/editions/src/index.ts`
- `tsconfig.base.effective.json` — same

The editions barrel (`packages/editions/src/index.ts` and `packages/editions/src/oss/index.ts`) re-exports from the new internal module.

A new directory `packages/editions/src/oss/playbook-bulk-apply/` contains the edition-specific `PlaybookBulkApplyHexa` and `PlaybookBulkApplyAdapter` that import the use case from the actual package.

**Wait — correction:** Looking at how other packages work (e.g., `@packmind/playbook-change-management` resolves to `packages/editions/src/index.ts` in OSS), the pattern is:

1. The "real" package at `packages/playbook-bulk-apply/` contains the use case + spec
2. The hexa + adapter live in `packages/editions/src/oss/playbook-bulk-apply/`
3. The TSConfig alias `@packmind/playbook-bulk-apply` points to `packages/editions/src/index.ts` in OSS mode

This means we do NOT create `PlaybookBulkApplyHexa.ts` or `PlaybookBulkApplyAdapter.ts` inside `packages/playbook-bulk-apply/`. They stay in editions. The package only holds the use case.

**Actually — second correction:** Looking more carefully at the existing pattern:

- `packages/playbook-change-management/` is a dead directory. The entire hexa+adapter+use case lives in `packages/editions/src/oss/playbook-change-management/`. The `@packmind/playbook-change-management` import resolves to `packages/editions/src/index.ts`.

So the convention is: **edition-dependent domains live entirely inside editions**, with a TSConfig alias making them importable as `@packmind/<name>`.

For `playbook-bulk-apply`, the cleanest approach matching existing conventions:

1. **All code** (hexa, adapter, use case, spec) goes in `packages/editions/src/oss/playbook-bulk-apply/`
2. **TSConfig alias** `@packmind/playbook-bulk-apply` → `packages/editions/src/index.ts`
3. **No standalone package** at `packages/playbook-bulk-apply/` (matching how playbook-change-management actually works)
4. **Types/contracts** go in `packages/types/src/playbookBulkApply/`

## API Surface

The `PlaybookService` in `apps/api/src/app/organizations/playbook/playbook.service.ts` changes to inject `IPlaybookBulkApplyPort` instead of `IPlaybookChangeManagementPort`.

New injection token `PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN` + `InjectPlaybookBulkApplyAdapter` decorator in `HexaRegistryModule`.

The `PlaybookBulkApplyHexa` is registered in:
- `HexaRegistryModule.register()` hexas array (app.module.ts)
- `PackmindApp.ts` initialization

## Changes to Existing Code

### Reverts to `playbook-change-management` in editions:
- `PlaybookChangeManagementAdapter.ts` — remove `applyPlaybook` method, remove `initialize()`, remove `ApplyPlaybookUseCase` import
- `PlaybookChangeManagementHexa.ts` — revert initialize to no-op (OSS stub)

### Reverts to types:
- `IPlaybookChangeManagementPort` — remove `applyPlaybook` method
- `playbookChangeManagement/contracts/index.ts` — remove `IApplyPlaybookUseCase` re-export

### Cleanup:
- Delete `packages/playbook-change-management/` directory (dead)

## Testing Approach

- Unit tests for `ApplyPlaybookUseCase` — moved as-is from editions (already comprehensive with 591 lines covering all scenarios)
- No integration tests needed — the use case mocks all ports
- Build verification: `nx build editions`, `nx lint editions`, `nx test editions`

## Out of Scope

- Changes to `hardDeleteById` on `AbstractRepository` or `hardDelete*` methods on domain ports — these are general-purpose additions
- Any change to the change proposal flow
- Proprietary edition changes
