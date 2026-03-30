# Playbook Bulk Apply — Extraction Design Spec

**Goal:** Extract the `ApplyPlaybookUseCase` from `packages/editions/src/oss/playbook-change-management/` into its own edition module `packages/editions/src/oss/playbook-bulk-apply/` with a dedicated port, adapter, and hexa facade.

**Scope:**
- In: New edition module, new port/types, move use case + tests, rewire API, clean up dead `packages/playbook-change-management/` directory
- Out: No changes to the `hardDelete` methods on recipes/skills/standards/AbstractRepository (those stay as-is), no changes to the change proposal flow

## Architecture

Following the existing convention for edition-dependent domains (e.g., `playbook-change-management`, `linter`, `amplitude`), **all code lives inside the editions package** with a TSConfig alias making it importable as `@packmind/playbook-bulk-apply`.

There is **no standalone `packages/playbook-bulk-apply/` directory**. This matches how `@packmind/playbook-change-management` currently works — the alias resolves to `packages/editions/src/index.ts`.

### Directory structure inside editions

```
packages/editions/src/oss/playbook-bulk-apply/
├── index.ts                           # Barrel: exports Hexa, Adapter
├── PlaybookBulkApplyHexa.ts           # Facade
├── PlaybookBulkApplyAdapter.ts        # Implements IPlaybookBulkApplyPort
├── ApplyPlaybookUseCase.ts            # Moved from playbook-change-management
└── ApplyPlaybookUseCase.spec.ts       # Moved from playbook-change-management
```

Since this domain has **no entities, no repositories, and no schemas** (it orchestrates other domains), there is no `domain/`, `infra/`, or `test/` sub-structure.

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
    └── IPlaybookBulkApplyPort.ts   # New port with single method
```

**Cross-domain type dependency:** `IApplyPlaybookUseCase.ts` imports types from `playbookChangeManagement` (`CreationChangeProposalTypes`, `NewSkillPayload`, `NewStandardPayload`, `NewCommandPayload`). These imports will use `../playbookChangeManagement/...` relative paths since both live under `packages/types/src/`. This is acceptable — the bulk apply domain depends on change proposal type definitions.

**Import path changes:** Moving the contract file means updating relative imports (`../../UseCase` → same, `../ChangeProposalType` → `../../playbookChangeManagement/ChangeProposalType`, etc.).

Port definition:

```typescript
export const IPlaybookBulkApplyPortName = 'IPlaybookBulkApplyPort';

export interface IPlaybookBulkApplyPort {
  applyPlaybook(command: ApplyPlaybookCommand): Promise<ApplyPlaybookResponse>;
}
```

The `IPlaybookChangeManagementPort` reverts to its pre-change state — loses the `applyPlaybook` method.

## Use Cases / Services

Single use case: `ApplyPlaybookUseCase` — moved as-is from `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.ts`. No service layer needed since this use case is a pure orchestrator with no atomic business logic to extract.

The adapter is thin — single method delegating to the use case.

## Hexa Facade

`PlaybookBulkApplyHexa` extends `BaseHexa<BaseHexaOpts, IPlaybookBulkApplyPort>`:
- **Constructor**: Creates adapter (no repos/services to wire)
- **Initialize**: Retrieves 5 ports from registry (accounts, skills, standards, recipes, spaces), passes to adapter
- **getAdapter()**: Returns `IPlaybookBulkApplyPort`

## Edition Wiring

TSConfig alias `@packmind/playbook-bulk-apply` is added to:
- `tsconfig.paths.oss.json` — `["packages/editions/src/index.ts"]`
- `tsconfig.paths.proprietary.json` — `["packages/editions/src/index.ts"]`
- `tsconfig.base.effective.json` — `["packages/editions/src/index.ts"]`

The editions barrel exports are updated:
- `packages/editions/src/index.ts` — adds `export * from './oss/playbook-bulk-apply'`
- `packages/editions/src/oss/playbook-bulk-apply/index.ts` — exports `PlaybookBulkApplyHexa`, `PlaybookBulkApplyAdapter`

## API Surface

### PlaybookService
`apps/api/src/app/organizations/playbook/playbook.service.ts` changes to inject `IPlaybookBulkApplyPort` instead of `IPlaybookChangeManagementPort`.

### HexaRegistryModule
`apps/api/src/app/shared/HexaRegistryModule.ts`:
- New token: `PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN = 'PLAYBOOK_BULK_APPLY_ADAPTER'`
- New adapter provider factory using `PlaybookBulkApplyHexa`
- Added to `exports` array

### HexaInjection
`apps/api/src/app/shared/HexaInjection.ts`:
- New decorator: `InjectPlaybookBulkApplyAdapter`
- Import new token

### PackmindApp
`apps/api/src/app/shared/PackmindApp.ts`:
- Import `PlaybookBulkApplyHexa` from `@packmind/playbook-bulk-apply`
- Add to hexa registration array (after all domain hexas it depends on: accounts, skills, standards, recipes, spaces)

### app.module.ts
`apps/api/src/app/app.module.ts`:
- Import `PlaybookBulkApplyHexa` from `@packmind/playbook-bulk-apply`
- Add to `HexaRegistryModule.register({ hexas: [...] })`

## Changes to Existing Code

### Reverts to `playbook-change-management` in editions
- `PlaybookChangeManagementAdapter.ts` — remove `applyPlaybook` method, remove `initialize()` method, remove `ApplyPlaybookUseCase` import, remove port imports (IAccountsPort, IRecipesPort, etc.). Adapter becomes a pure stub where all methods throw "not implemented".
- `PlaybookChangeManagementHexa.ts` — revert `initialize()` to no-op (remove port retrievals from registry). Constructor stays the same.

### Reverts to types
- `IPlaybookChangeManagementPort` — remove `applyPlaybook` method and its import
- `playbookChangeManagement/contracts/index.ts` — remove `IApplyPlaybookUseCase` re-export

### Cleanup
- Delete `packages/playbook-change-management/` directory. This is a dead Nx project (has `project.json`) that resolves entirely via TSConfig alias to editions. De-registration steps:
  - Remove the directory
  - Remove entries from `tsconfig.base.effective.json` if pointing to this directory (they point to editions, so likely no change needed)
  - Verify no `nx.json` or workspace references break

## Testing Approach

- Unit tests for `ApplyPlaybookUseCase` — moved as-is from editions (comprehensive: success paths, failure + rollback, space validation, rollback failure tolerance)
- No integration tests needed — the use case mocks all ports
- Build verification across all affected projects:
  - `nx test editions` — use case tests
  - `nx lint editions` — lint the new module
  - `nx build editions` — build verification
  - `nx test api` — API wiring tests
  - `nx lint api` — API lint
  - `nx build api` — API build

## Out of Scope

- Changes to `hardDeleteById` on `AbstractRepository` or `hardDelete*` methods on domain ports — these are general-purpose additions
- Any change to the change proposal flow
- Proprietary edition changes
- Integration tests (TestApp.ts references to playbook-change-management — these import the hexa which still exists, just without applyPlaybook)
