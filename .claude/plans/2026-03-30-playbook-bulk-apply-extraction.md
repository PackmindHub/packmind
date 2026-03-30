# Playbook Bulk Apply Extraction — Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to execute this plan.

**Goal:** Extract `ApplyPlaybookUseCase` from `playbook-change-management` into a new `playbook-bulk-apply` edition module with its own port.
**Architecture:** New edition module at `packages/editions/src/oss/playbook-bulk-apply/` with dedicated `IPlaybookBulkApplyPort`. Types in `packages/types/src/playbookBulkApply/`. API wiring updated to use new port. Old code reverted/cleaned.
**Tech stack:** TypeScript, NestJS (injection tokens), hexagonal architecture, editions TSConfig aliasing

---

## Chunk 1: Types and Edition Module

### Task 1: Create `IPlaybookBulkApplyPort` types

**Files:**
- Create: `packages/types/src/playbookBulkApply/ports/IPlaybookBulkApplyPort.ts`
- Create: `packages/types/src/playbookBulkApply/ports/index.ts`
- Create: `packages/types/src/playbookBulkApply/contracts/IApplyPlaybookUseCase.ts`
- Create: `packages/types/src/playbookBulkApply/contracts/index.ts`
- Create: `packages/types/src/playbookBulkApply/index.ts`
- Modify: `packages/types/src/index.ts`

**Acceptance criteria:**
- [ ] `IPlaybookBulkApplyPort` interface exists with `applyPlaybook` method
- [ ] `IPlaybookBulkApplyPortName` constant exported
- [ ] `ApplyPlaybookCommand`, `ApplyPlaybookResponse`, `ApplyPlaybookProposalItem` types exported
- [ ] All types importable from `@packmind/types`
- [ ] `nx lint types` passes

**Steps:**
- [ ] Create port interface file with `IPlaybookBulkApplyPort` and `IPlaybookBulkApplyPortName`
- [ ] Copy contract types from `playbookChangeManagement/contracts/IApplyPlaybookUseCase.ts` to the new location (old file deleted later in Task 6) — update relative imports for cross-domain references (`../../playbookChangeManagement/ChangeProposalType`, etc.)
- [ ] Create barrel exports (`index.ts` files)
- [ ] Add `export * from './playbookBulkApply'` to `packages/types/src/index.ts`
- [ ] Lint: `./node_modules/.bin/nx lint types`
- [ ] Commit

```typescript
// packages/types/src/playbookBulkApply/ports/IPlaybookBulkApplyPort.ts
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
} from '../contracts/IApplyPlaybookUseCase';

export const IPlaybookBulkApplyPortName = 'IPlaybookBulkApplyPort';

export interface IPlaybookBulkApplyPort {
  applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse>;
}
```

```typescript
// packages/types/src/playbookBulkApply/contracts/IApplyPlaybookUseCase.ts
// Same as current file but with updated import paths:
import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { StandardId } from '../../standards';
import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { TargetId } from '../../deployments';
import { CreationChangeProposalTypes } from '../../playbookChangeManagement/ChangeProposalType';
import {
  NewSkillPayload,
  NewStandardPayload,
  NewCommandPayload,
} from '../../playbookChangeManagement/ChangeProposalPayload';
// ... rest of file unchanged
```

---

### Task 2: Create edition module with hexa, adapter, and use case

**Files:**
- Create: `packages/editions/src/oss/playbook-bulk-apply/index.ts`
- Create: `packages/editions/src/oss/playbook-bulk-apply/PlaybookBulkApplyHexa.ts`
- Create: `packages/editions/src/oss/playbook-bulk-apply/PlaybookBulkApplyAdapter.ts`
- Move: `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.ts` → `packages/editions/src/oss/playbook-bulk-apply/ApplyPlaybookUseCase.ts`
- Move: `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.spec.ts` → `packages/editions/src/oss/playbook-bulk-apply/ApplyPlaybookUseCase.spec.ts`
- Modify: `packages/editions/src/index.ts`

**Acceptance criteria:**
- [ ] `PlaybookBulkApplyHexa` extends `BaseHexa` and wires 5 ports
- [ ] `PlaybookBulkApplyAdapter` implements `IPlaybookBulkApplyPort`
- [ ] Use case tests pass: `./node_modules/.bin/nx test editions --testPathPattern=ApplyPlaybookUseCase`
- [ ] `nx lint editions` passes

**Steps:**
- [ ] Create `PlaybookBulkApplyAdapter.ts` implementing `IPlaybookBulkApplyPort`, with `initialize()` and `applyPlaybook()` delegating to use case
- [ ] Create `PlaybookBulkApplyHexa.ts` extending `BaseHexa`, retrieving 5 ports in `initialize()`
- [ ] Copy use case file (rename to PascalCase: `ApplyPlaybookUseCase.ts`; old file deleted in Task 6). Update imports: `ApplyPlaybookCommand`, `ApplyPlaybookResponse`, `ApplyPlaybookProposalItem` must come from the new `@packmind/types` barrel (which re-exports from `playbookBulkApply`). Verify all type imports resolve correctly.
- [ ] Copy spec file (rename to `ApplyPlaybookUseCase.spec.ts`; old file deleted in Task 6), update import path for use case
- [ ] Create `index.ts` barrel exporting `PlaybookBulkApplyHexa` and `PlaybookBulkApplyAdapter`
- [ ] Add `export * from './oss/playbook-bulk-apply'` to `packages/editions/src/index.ts`
- [ ] Run tests: `./node_modules/.bin/nx test editions --testPathPattern=ApplyPlaybookUseCase`
- [ ] Lint: `./node_modules/.bin/nx lint editions`
- [ ] Commit

```typescript
// packages/editions/src/oss/playbook-bulk-apply/PlaybookBulkApplyAdapter.ts
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IAccountsPort,
  IPlaybookBulkApplyPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { ApplyPlaybookUseCase } from './ApplyPlaybookUseCase';

export class PlaybookBulkApplyAdapter implements IPlaybookBulkApplyPort {
  private applyPlaybookUseCase: ApplyPlaybookUseCase | null = null;

  async initialize(ports: {
    accountsPort: IAccountsPort;
    skillsPort: ISkillsPort;
    standardsPort: IStandardsPort;
    recipesPort: IRecipesPort;
    spacesPort: ISpacesPort;
  }): Promise<void> {
    this.applyPlaybookUseCase = new ApplyPlaybookUseCase(
      ports.accountsPort,
      ports.skillsPort,
      ports.standardsPort,
      ports.recipesPort,
      ports.spacesPort,
    );
  }

  async applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse> {
    if (!this.applyPlaybookUseCase) {
      throw new Error('Adapter not initialized');
    }
    return this.applyPlaybookUseCase.execute(command);
  }
}
```

```typescript
// packages/editions/src/oss/playbook-bulk-apply/PlaybookBulkApplyHexa.ts
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IPlaybookBulkApplyPort,
  IPlaybookBulkApplyPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { PlaybookBulkApplyAdapter } from './PlaybookBulkApplyAdapter';

export class PlaybookBulkApplyHexa extends BaseHexa<
  BaseHexaOpts,
  IPlaybookBulkApplyPort
> {
  protected adapter: PlaybookBulkApplyAdapter;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
    this.adapter = new PlaybookBulkApplyAdapter();
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    const accountsPort =
      registry.getAdapter<IAccountsPort>(IAccountsPortName);
    const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
    const standardsPort =
      registry.getAdapter<IStandardsPort>(IStandardsPortName);
    const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
    const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

    await this.adapter.initialize({
      accountsPort,
      skillsPort,
      standardsPort,
      recipesPort,
      spacesPort,
    });
  }

  public getAdapter(): IPlaybookBulkApplyPort {
    return this.adapter;
  }

  public getPortName(): string {
    return IPlaybookBulkApplyPortName;
  }

  async destroy(): Promise<void> {
    // No cleanup needed
  }
}
```

---

### Task 3: Add TSConfig aliases for `@packmind/playbook-bulk-apply`

**Files:**
- Modify: `tsconfig.paths.oss.json`
- Modify: `tsconfig.paths.proprietary.json`
- Modify: `tsconfig.base.effective.json`

**Acceptance criteria:**
- [ ] `@packmind/playbook-bulk-apply` resolves to `packages/editions/src/index.ts` in OSS
- [ ] `@packmind/playbook-bulk-apply` resolves to `packages/editions/src/index.ts` in proprietary
- [ ] Run `node scripts/select-tsconfig.mjs` if it exists, or verify effective config is correct

**Steps:**
- [ ] Add `"@packmind/playbook-bulk-apply": ["packages/editions/src/index.ts"]` to `tsconfig.paths.oss.json`
- [ ] Add `"@packmind/playbook-bulk-apply": ["packages/editions/src/index.ts"]` to `tsconfig.paths.proprietary.json`
- [ ] Add `"@packmind/playbook-bulk-apply": ["packages/editions/src/index.ts"]` to `tsconfig.base.effective.json`
- [ ] Run `node scripts/select-tsconfig.mjs` if available
- [ ] Commit

---

## Chunk 2: API Wiring

### Task 4: Register `PlaybookBulkApplyHexa` in NestJS injection system

**Files:**
- Modify: `apps/api/src/app/shared/HexaRegistryModule.ts`
- Modify: `apps/api/src/app/shared/HexaInjection.ts`
- Modify: `apps/api/src/app/shared/PackmindApp.ts`
- Modify: `apps/api/src/app/shared/PackmindApp.spec.ts`
- Modify: `apps/api/src/app/app.module.ts`

**Acceptance criteria:**
- [ ] `PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN` defined and exported
- [ ] `InjectPlaybookBulkApplyAdapter` decorator exported
- [ ] `PlaybookBulkApplyHexa` in PackmindApp hexa list (after `PlaybookChangeManagementHexa`, before `CodingAgentHexa` — depends on accounts, skills, standards, recipes, spaces which are all registered earlier)
- [ ] `PlaybookBulkApplyHexa` in app.module.ts `HexaRegistryModule.register` hexas array (same position: after `PlaybookChangeManagementHexa`, before `CodingAgentHexa`)
- [ ] PackmindApp spec updated to include new hexa in order assertion

**Steps:**
- [ ] In `HexaRegistryModule.ts`: add import of `PlaybookBulkApplyHexa` from `@packmind/playbook-bulk-apply`, add `PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN`, add adapter provider factory, add to exports array
- [ ] In `HexaInjection.ts`: import new token, add `InjectPlaybookBulkApplyAdapter` decorator
- [ ] In `PackmindApp.ts`: import `PlaybookBulkApplyHexa`, add to hexas array after `PlaybookChangeManagementHexa` and before `CodingAgentHexa`
- [ ] In `PackmindApp.spec.ts`: import `PlaybookBulkApplyHexa`, add to expected hexa order in test assertion (after `PlaybookChangeManagementHexa`)
- [ ] In `app.module.ts`: import `PlaybookBulkApplyHexa`, add to hexas array in `HexaRegistryModule.register()` after `PlaybookChangeManagementHexa` and before `CodingAgentHexa`
- [ ] Lint: `./node_modules/.bin/nx lint api`
- [ ] Commit

```typescript
// HexaRegistryModule.ts additions
import { PlaybookBulkApplyHexa } from '@packmind/playbook-bulk-apply';
import { IPlaybookBulkApplyPort } from '@packmind/types';

export const PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN = 'PLAYBOOK_BULK_APPLY_ADAPTER';

// In createProviders(), add:
providers.push({
  provide: PLAYBOOK_BULK_APPLY_ADAPTER_TOKEN,
  useFactory: (registry: HexaRegistry): IPlaybookBulkApplyPort | null => {
    try {
      const playbookBulkApplyHexa = registry.get(PlaybookBulkApplyHexa);
      return playbookBulkApplyHexa.getAdapter();
    } catch {
      // PlaybookBulkApplyHexa not available
    }
    return null;
  },
  inject: [HEXA_REGISTRY_TOKEN],
});
```

---

### Task 5: Update PlaybookService to use new port

**Files:**
- Modify: `apps/api/src/app/organizations/playbook/playbook.service.ts`

**Acceptance criteria:**
- [ ] PlaybookService injects `IPlaybookBulkApplyPort` via `InjectPlaybookBulkApplyAdapter`
- [ ] `nx lint api` passes

**Steps:**
- [ ] Change import from `IPlaybookChangeManagementPort` to `IPlaybookBulkApplyPort`
- [ ] Change import from `InjectPlaybookChangeManagementAdapter` to `InjectPlaybookBulkApplyAdapter`
- [ ] Update type annotation on injected adapter
- [ ] Lint: `./node_modules/.bin/nx lint api`
- [ ] Commit

```typescript
// Updated playbook.service.ts
import { Injectable } from '@nestjs/common';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IPlaybookBulkApplyPort,
} from '@packmind/types';
import { InjectPlaybookBulkApplyAdapter } from '../../shared/HexaInjection';

@Injectable()
export class PlaybookService {
  constructor(
    @InjectPlaybookBulkApplyAdapter()
    private readonly adapter: IPlaybookBulkApplyPort,
  ) {}

  async applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse> {
    return this.adapter.applyPlaybook(command);
  }
}
```

---

## Chunk 3: Revert and Cleanup

### Task 6: Revert `playbook-change-management` in editions and types

**Files:**
- Modify: `packages/editions/src/oss/playbook-change-management/PlaybookChangeManagementAdapter.ts`
- Modify: `packages/editions/src/oss/playbook-change-management/PlaybookChangeManagementHexa.ts`
- Modify: `packages/types/src/playbookChangeManagement/ports/IPlaybookChangeManagementPort.ts`
- Modify: `packages/types/src/playbookChangeManagement/contracts/index.ts`
- Delete: `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.ts` (already moved)
- Delete: `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.spec.ts` (already moved)

**Acceptance criteria:**
- [ ] `PlaybookChangeManagementAdapter` has no `applyPlaybook` or `initialize` methods — pure stub
- [ ] `PlaybookChangeManagementHexa.initialize()` is a no-op
- [ ] `IPlaybookChangeManagementPort` has no `applyPlaybook` method
- [ ] Old use case files deleted from playbook-change-management
- [ ] `nx test editions` passes
- [ ] `nx lint editions` passes

**Steps:**
- [ ] Revert `PlaybookChangeManagementAdapter.ts`: remove `applyPlaybook`, `initialize`, use case import, all port imports. Keep only the stub methods.
- [ ] Revert `PlaybookChangeManagementHexa.ts`: `initialize()` becomes `async initialize(_registry: HexaRegistry): Promise<void> { /* No adapters needed for OSS edition */ }`. Remove all port imports except `IPlaybookChangeManagementPort` and `IPlaybookChangeManagementPortName`.
- [ ] Revert `IPlaybookChangeManagementPort.ts`: remove `applyPlaybook` method signature AND remove the import block for `ApplyPlaybookCommand`/`ApplyPlaybookResponse` from `'../contracts/IApplyPlaybookUseCase'` (lines 37-40 of current file)
- [ ] Revert `playbookChangeManagement/contracts/index.ts`: remove `export * from './IApplyPlaybookUseCase'`
- [ ] Delete the old contract file: `packages/types/src/playbookChangeManagement/contracts/IApplyPlaybookUseCase.ts`
- [ ] Delete `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.ts`
- [ ] Delete `packages/editions/src/oss/playbook-change-management/applyPlaybook.usecase.spec.ts`
- [ ] Test: `./node_modules/.bin/nx test editions`
- [ ] Lint: `./node_modules/.bin/nx lint editions`
- [ ] Lint: `./node_modules/.bin/nx lint types`
- [ ] Commit

---

### Task 7: Delete dead `packages/playbook-change-management/` directory

**Files:**
- Delete: `packages/playbook-change-management/` (entire directory — contains only `node_modules/`, no project.json or source files)

**Acceptance criteria:**
- [ ] Directory no longer exists
- [ ] No build/lint errors from its removal (all imports resolve via TSConfig alias to editions)

**Steps:**
- [ ] `rm -rf packages/playbook-change-management/`
- [ ] Verify no nx references break: `./node_modules/.bin/nx show projects | grep playbook`
- [ ] Commit

---

### Task 8: Final verification

**Files:**
- None (verification only)

**Acceptance criteria:**
- [ ] `./node_modules/.bin/nx lint types` passes
- [ ] `./node_modules/.bin/nx lint editions` passes
- [ ] `./node_modules/.bin/nx lint api` passes
- [ ] `./node_modules/.bin/nx test editions` passes
- [ ] `./node_modules/.bin/nx test api` passes
- [ ] `./node_modules/.bin/nx build editions` passes
- [ ] `./node_modules/.bin/nx build api` passes

**Steps:**
- [ ] Run all lint commands
- [ ] Run all test commands
- [ ] Run all build commands
- [ ] Fix any issues found
