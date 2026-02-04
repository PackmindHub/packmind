# `packmind packages add` Command - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement CLI command to add standards, commands, or skills to existing packages.

**Architecture:** The backend use case `AddArtefactsToPackageUsecase` already exists. We need to: (1) add skills support and `added`/`skipped` response, (2) expose it via controller endpoint, (3) implement CLI command.

**Tech Stack:** TypeScript, NestJS, cmd-ts, Jest

---

## Task 1: Update Types - Add Skills and Response Fields

**Files:**
- Modify: `packages/types/src/deployments/contracts/IAddArtefactsToPackageUseCase.ts`

**Step 1: Update the command and response types**

```typescript
import { IUseCase, PackmindCommand } from '../../UseCase';
import { Package, PackageId } from '../Package';
import { RecipeId } from '../../recipes';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';

export type AddArtefactsToPackageCommand = PackmindCommand & {
  packageId: PackageId;
  standardIds?: StandardId[];
  recipeIds?: RecipeId[];
  skillIds?: SkillId[];
};

export type AddArtefactsToPackageResponse = {
  package: Package;
  added: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  skipped: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
};

export type IAddArtefactsToPackageUseCase = IUseCase<
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse
>;
```

**Step 2: Run lint**

Run: `nx lint types`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/types/src/deployments/contracts/IAddArtefactsToPackageUseCase.ts
git commit -m "feat(types): add skillIds and added/skipped response to AddArtefactsToPackage"
```

---

## Task 2: Update Backend Use Case - Add Skills Support

**Files:**
- Modify: `packages/deployments/src/application/useCases/addArtefactsToPackage/addArtefactsToPackage.usecase.ts`
- Modify: `packages/deployments/src/application/useCases/addArtefactsToPackage/addArtefactsToPackage.usecase.spec.ts`

**Step 1: Write failing test for skills**

Add to the spec file a new describe block:

```typescript
describe('when adding skills to a package', () => {
  it('adds skills and returns added/skipped response', async () => {
    // Setup: package exists, skills exist in same space
    const existingPackage = createPackageFactory({ spaceId: space.id, skills: [] });
    mockPackageService.findById.mockResolvedValue(existingPackage);
    mockSkillsPort.getSkillById.mockResolvedValue(
      createSkillFactory({ id: 'skill-1', spaceId: space.id })
    );

    const result = await useCase.execute({
      userId: user.id,
      organizationId: org.id,
      packageId: existingPackage.id,
      skillIds: ['skill-1'],
    });

    expect(result.added.skills).toEqual(['skill-1']);
    expect(result.skipped.skills).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test deployments --testPathPattern=addArtefactsToPackage`
Expected: FAIL

**Step 3: Update the use case implementation**

Add `ISkillsPort` to constructor, handle `skillIds` similar to `recipeIds`/`standardIds`, and return `added`/`skipped` in response.

Key changes:
1. Add `ISkillsPort` to constructor dependencies
2. Extract `skillIds` from command (default to `[]`)
3. Get current skills from package: `const currentSkillIds = existingPackage.skills || [];`
4. Filter out existing: `const newSkillIds = skillIds.filter(id => !currentSkillIds.includes(id));`
5. Validate skills belong to space
6. Add skills via repository: `await packageRepository.addSkills(packageId, newSkillIds);`
7. Build response with `added`/`skipped` arrays

**Step 4: Run test to verify it passes**

Run: `nx test deployments --testPathPattern=addArtefactsToPackage`
Expected: PASS

**Step 5: Run lint**

Run: `nx lint deployments`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/deployments/src/application/useCases/addArtefactsToPackage/
git commit -m "feat(deployments): add skills support and added/skipped response"
```

---

## Task 3: Add Controller Endpoint

**Files:**
- Modify: `apps/api/src/app/organizations/spaces/packages/packages.controller.ts`
- Modify: `apps/api/src/app/organizations/deployments/deployments.service.ts`

**Step 1: Add method to DeploymentsService**

In `deployments.service.ts`, add:

```typescript
import { AddArtefactsToPackageCommand, AddArtefactsToPackageResponse } from '@packmind/types';

// ... in class
async addArtefactsToPackage(
  command: AddArtefactsToPackageCommand,
): Promise<AddArtefactsToPackageResponse> {
  return this.deploymentAdapter.addArtefactsToPackage(command);
}
```

**Step 2: Add controller endpoint**

In `packages.controller.ts`, add after the PATCH endpoint:

```typescript
/**
 * Add artifacts to an existing package
 * POST /organizations/:orgId/spaces/:spaceId/packages/:packageSlug/add-artifacts
 */
@Post(':packageSlug/add-artifacts')
async addArtefactsToPackage(
  @Param('orgId') organizationId: OrganizationId,
  @Param('spaceId') spaceId: SpaceId,
  @Param('packageSlug') packageSlug: string,
  @Req() request: AuthenticatedRequest,
  @Body()
  body: {
    standardIds?: StandardId[];
    commandIds?: RecipeId[];
    skillIds?: SkillId[];
  },
): Promise<AddArtefactsToPackageResponse> {
  const userId = request.user.userId;

  this.logger.info(
    'POST /organizations/:orgId/spaces/:spaceId/packages/:packageSlug/add-artifacts',
    { organizationId, spaceId, packageSlug },
  );

  // Resolve packageSlug to packageId
  const packages = await this.deploymentsService.listPackagesBySpace({
    userId,
    organizationId,
    spaceId,
  });
  const pkg = packages.packages.find((p) => p.slug === packageSlug);
  if (!pkg) {
    throw new Error(`Package with slug '${packageSlug}' not found`);
  }

  return this.deploymentsService.addArtefactsToPackage({
    userId,
    organizationId,
    packageId: pkg.id,
    standardIds: body.standardIds,
    recipeIds: body.commandIds, // CLI calls them "commands", API uses "recipes"
    skillIds: body.skillIds,
  });
}
```

**Step 3: Add imports**

Add to imports in controller:

```typescript
import { AddArtefactsToPackageResponse } from '@packmind/types';
```

**Step 4: Run lint**

Run: `nx lint api`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/app/organizations/spaces/packages/packages.controller.ts apps/api/src/app/organizations/deployments/deployments.service.ts
git commit -m "feat(api): add POST packages/:slug/add-artifacts endpoint"
```

---

## Task 4: Add CLI Gateway Types

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackagesGateway.ts`

**Step 1: Add types**

```typescript
export type AddArtefactsToPackageCommand = {
  packageSlug: string;
  spaceId: string;
  standardIds?: string[];
  commandIds?: string[];
  skillIds?: string[];
};

export type AddArtefactsToPackageResult = {
  added: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
  skipped: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
};
```

**Step 2: Add method to interface**

```typescript
addArtefacts(command: AddArtefactsToPackageCommand): Promise<AddArtefactsToPackageResult>;
```

**Step 3: Run lint**

Run: `nx lint cli`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/cli/src/domain/repositories/IPackagesGateway.ts
git commit -m "feat(cli): add AddArtefactsToPackage types to gateway"
```

---

## Task 5: Implement CLI Gateway Method

**Files:**
- Modify: `apps/cli/src/infra/repositories/PackagesGateway.ts`
- Create: `apps/cli/src/infra/repositories/PackagesGateway.spec.ts`

**Step 1: Write failing test**

Create `PackagesGateway.spec.ts`:

```typescript
import { PackagesGateway } from './PackagesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

describe('PackagesGateway', () => {
  describe('addArtefacts', () => {
    let gateway: PackagesGateway;
    let mockHttpClient: jest.Mocked<PackmindHttpClient>;

    beforeEach(() => {
      mockHttpClient = {
        getAuthContext: jest.fn().mockReturnValue({
          organizationId: 'org-123',
          host: 'https://api.packmind.com',
          jwt: 'mock-jwt',
        }),
        request: jest.fn(),
      } as unknown as jest.Mocked<PackmindHttpClient>;

      gateway = new PackagesGateway('mock-api-key', mockHttpClient);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when adding standards to a package', () => {
      it('calls POST with correct payload', async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: ['std-1'], commands: [], skills: [] },
          skipped: { standards: [], commands: [], skills: [] },
        });

        const result = await gateway.addArtefacts({
          packageSlug: 'my-package',
          spaceId: 'space-123',
          standardIds: ['std-1'],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          '/api/v0/organizations/org-123/spaces/space-123/packages/my-package/add-artifacts',
          {
            method: 'POST',
            body: { standardIds: ['std-1'] },
          },
        );
        expect(result.added.standards).toEqual(['std-1']);
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=PackagesGateway.spec.ts`
Expected: FAIL

**Step 3: Implement the gateway method**

Add to `PackagesGateway.ts`:

```typescript
public addArtefacts = async (
  command: AddArtefactsToPackageCommand,
): Promise<AddArtefactsToPackageResult> => {
  const { organizationId } = this.httpClient.getAuthContext();
  const { packageSlug, spaceId, standardIds, commandIds, skillIds } = command;

  const body: Record<string, string[] | undefined> = {};
  if (standardIds?.length) body.standardIds = standardIds;
  if (commandIds?.length) body.commandIds = commandIds;
  if (skillIds?.length) body.skillIds = skillIds;

  const response = await this.httpClient.request<{
    added: { standards: string[]; commands: string[]; skills: string[] };
    skipped: { standards: string[]; commands: string[]; skills: string[] };
  }>(
    `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages/${encodeURIComponent(packageSlug)}/add-artifacts`,
    {
      method: 'POST',
      body,
    },
  );

  return {
    added: response.added,
    skipped: response.skipped,
  };
};
```

Also add imports for types.

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=PackagesGateway.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/infra/repositories/PackagesGateway.ts apps/cli/src/infra/repositories/PackagesGateway.spec.ts
git commit -m "feat(cli): implement addArtefacts gateway method"
```

---

## Task 6: Create CLI Use Case

**Files:**
- Create: `apps/cli/src/domain/useCases/IAddToPackageUseCase.ts`
- Create: `apps/cli/src/application/useCases/AddToPackageUseCase.ts`
- Create: `apps/cli/src/application/useCases/AddToPackageUseCase.spec.ts`

**Step 1: Create interface**

Create `apps/cli/src/domain/useCases/IAddToPackageUseCase.ts`:

```typescript
export type ItemType = 'standard' | 'command' | 'skill';

export interface IAddToPackageCommand {
  packageSlug: string;
  itemType: ItemType;
  itemSlugs: string[];
}

export interface IAddToPackageResult {
  added: string[];
  skipped: string[];
}

export interface IAddToPackageUseCase {
  execute(command: IAddToPackageCommand): Promise<IAddToPackageResult>;
}
```

**Step 2: Write failing test**

Create `AddToPackageUseCase.spec.ts`:

```typescript
import { AddToPackageUseCase } from './AddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('AddToPackageUseCase', () => {
  let useCase: AddToPackageUseCase;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockGateway = {
      spaces: { getGlobal: jest.fn().mockResolvedValue({ id: 'space-123' }) },
      packages: { addArtefacts: jest.fn() },
      standards: { getBySlug: jest.fn() },
      commands: { getBySlug: jest.fn() },
      skills: { getBySlug: jest.fn() },
    } as unknown as jest.Mocked<IPackmindGateway>;

    useCase = new AddToPackageUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding standards', () => {
    it('resolves slugs to IDs and calls gateway', async () => {
      mockGateway.standards.getBySlug
        .mockResolvedValueOnce({ id: 'std-id-1', slug: 'std-1' })
        .mockResolvedValueOnce({ id: 'std-id-2', slug: 'std-2' });
      mockGateway.packages.addArtefacts.mockResolvedValue({
        added: { standards: ['std-1', 'std-2'], commands: [], skills: [] },
        skipped: { standards: [], commands: [], skills: [] },
      });

      const result = await useCase.execute({
        packageSlug: 'my-package',
        itemType: 'standard',
        itemSlugs: ['std-1', 'std-2'],
      });

      expect(mockGateway.packages.addArtefacts).toHaveBeenCalledWith({
        packageSlug: 'my-package',
        spaceId: 'space-123',
        standardIds: ['std-id-1', 'std-id-2'],
      });
      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `nx test cli --testPathPattern=AddToPackageUseCase.spec.ts`
Expected: FAIL

**Step 4: Implement use case**

Create `AddToPackageUseCase.ts`:

```typescript
import {
  IAddToPackageCommand,
  IAddToPackageResult,
  IAddToPackageUseCase,
  ItemType,
} from '../../domain/useCases/IAddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class AddToPackageUseCase implements IAddToPackageUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(command: IAddToPackageCommand): Promise<IAddToPackageResult> {
    const { packageSlug, itemType, itemSlugs } = command;

    // Get global space ID
    const space = await this.gateway.spaces.getGlobal();

    // Resolve slugs to IDs based on item type
    const ids = await this.resolveSlugsToIds(itemType, itemSlugs);

    // Build command based on item type
    const addCommand: Parameters<typeof this.gateway.packages.addArtefacts>[0] = {
      packageSlug,
      spaceId: space.id,
    };

    if (itemType === 'standard') {
      addCommand.standardIds = ids;
    } else if (itemType === 'command') {
      addCommand.commandIds = ids;
    } else if (itemType === 'skill') {
      addCommand.skillIds = ids;
    }

    const result = await this.gateway.packages.addArtefacts(addCommand);

    // Extract the relevant added/skipped arrays based on item type
    const typeKey = itemType === 'command' ? 'commands' : `${itemType}s`;
    return {
      added: result.added[typeKey as keyof typeof result.added],
      skipped: result.skipped[typeKey as keyof typeof result.skipped],
    };
  }

  private async resolveSlugsToIds(
    itemType: ItemType,
    slugs: string[],
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const slug of slugs) {
      let item: { id: string } | null = null;

      if (itemType === 'standard') {
        item = await this.gateway.standards.getBySlug(slug);
      } else if (itemType === 'command') {
        item = await this.gateway.commands.getBySlug(slug);
      } else if (itemType === 'skill') {
        item = await this.gateway.skills.getBySlug(slug);
      }

      if (!item) {
        throw new Error(`${itemType} '${slug}' not found`);
      }

      ids.push(item.id);
    }

    return ids;
  }
}
```

**Step 5: Run test to verify it passes**

Run: `nx test cli --testPathPattern=AddToPackageUseCase.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/cli/src/domain/useCases/IAddToPackageUseCase.ts apps/cli/src/application/useCases/AddToPackageUseCase.ts apps/cli/src/application/useCases/AddToPackageUseCase.spec.ts
git commit -m "feat(cli): implement AddToPackageUseCase"
```

---

## Task 7: Create CLI Command Handler

**Files:**
- Create: `apps/cli/src/infra/commands/addToPackageHandler.ts`
- Create: `apps/cli/src/infra/commands/addToPackageHandler.spec.ts`

**Step 1: Write failing test**

Create `addToPackageHandler.spec.ts`:

```typescript
import { addToPackageHandler } from './addToPackageHandler';
import { IAddToPackageUseCase } from '../../domain/useCases/IAddToPackageUseCase';

describe('addToPackageHandler', () => {
  let mockUseCase: jest.Mocked<IAddToPackageUseCase>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as jest.Mocked<IAddToPackageUseCase>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding standards successfully', () => {
    it('returns success with added items', async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1', 'std-2'],
        skipped: [],
      });

      const result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['std-1', 'std-2']);
    });
  });

  describe('when some items are skipped', () => {
    it('returns success with skipped items', async () => {
      mockUseCase.execute.mockResolvedValue({
        added: ['std-1'],
        skipped: ['std-2'],
      });

      const result = await addToPackageHandler(
        'my-package',
        'standard',
        ['std-1', 'std-2'],
        mockUseCase,
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toEqual(['std-2']);
    });
  });

  describe('when no items provided', () => {
    it('returns error', async () => {
      const result = await addToPackageHandler(
        'my-package',
        'standard',
        [],
        mockUseCase,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No items provided to add');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=addToPackageHandler.spec.ts`
Expected: FAIL

**Step 3: Implement handler**

Create `addToPackageHandler.ts`:

```typescript
import { IAddToPackageUseCase, ItemType } from '../../domain/useCases/IAddToPackageUseCase';
import { logConsole, logWarningConsole, logErrorConsole } from '../utils/consoleLogger';

export interface IAddToPackageHandlerResult {
  success: boolean;
  added?: string[];
  skipped?: string[];
  error?: string;
}

export async function addToPackageHandler(
  packageSlug: string,
  itemType: ItemType,
  itemSlugs: string[],
  useCase: IAddToPackageUseCase,
): Promise<IAddToPackageHandlerResult> {
  if (itemSlugs.length === 0) {
    return { success: false, error: 'No items provided to add' };
  }

  try {
    const result = await useCase.execute({ packageSlug, itemType, itemSlugs });

    for (const item of result.added) {
      logConsole(`✓ Added ${item} to ${packageSlug}`);
    }
    for (const item of result.skipped) {
      logWarningConsole(`⚠ ${item} already in ${packageSlug} (skipped)`);
    }

    return { success: true, added: result.added, skipped: result.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logErrorConsole(message);
    return { success: false, error: message };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=addToPackageHandler.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/addToPackageHandler.ts apps/cli/src/infra/commands/addToPackageHandler.spec.ts
git commit -m "feat(cli): implement addToPackageHandler"
```

---

## Task 8: Create CLI Command

**Files:**
- Create: `apps/cli/src/infra/commands/AddToPackageCommand.ts`
- Modify: `apps/cli/src/infra/commands/PackagesCommand.ts`

**Step 1: Create command**

Create `AddToPackageCommand.ts`:

```typescript
import { command, option, string, multioption, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AddToPackageUseCase } from '../../application/useCases/AddToPackageUseCase';
import { addToPackageHandler } from './addToPackageHandler';
import { logErrorConsole } from '../utils/consoleLogger';
import { ItemType } from '../../domain/useCases/IAddToPackageUseCase';

export const addToPackageCommand = command({
  name: 'add',
  description: 'Add standards, commands, or skills to a package',
  args: {
    to: option({
      long: 'to',
      description: 'Target package slug',
      type: string,
    }),
    standards: multioption({
      long: 'standard',
      description: 'Standard slug(s) to add',
      type: optional(string),
    }),
    commands: multioption({
      long: 'command',
      description: 'Command slug(s) to add',
      type: optional(string),
    }),
    skills: multioption({
      long: 'skill',
      description: 'Skill slug(s) to add',
      type: optional(string),
    }),
  },
  handler: async ({ to, standards, commands, skills }) => {
    const standardSlugs = standards.filter((s): s is string => s !== undefined);
    const commandSlugs = commands.filter((c): c is string => c !== undefined);
    const skillSlugs = skills.filter((s): s is string => s !== undefined);

    const itemTypes: { type: ItemType; slugs: string[] }[] = [
      { type: 'standard', slugs: standardSlugs },
      { type: 'command', slugs: commandSlugs },
      { type: 'skill', slugs: skillSlugs },
    ].filter((t) => t.slugs.length > 0);

    if (itemTypes.length === 0) {
      logErrorConsole('Error: At least one --standard, --command, or --skill is required');
      process.exit(1);
    }

    if (itemTypes.length > 1) {
      logErrorConsole('Error: Cannot mix item types. Use separate commands for different types.');
      process.exit(1);
    }

    const { type: itemType, slugs: itemSlugs } = itemTypes[0];

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const hexa = new PackmindCliHexa(packmindLogger);
    const gateway = hexa.getPackmindGateway();
    const useCase = new AddToPackageUseCase(gateway);

    const result = await addToPackageHandler(to, itemType, itemSlugs, useCase);

    if (!result.success) {
      process.exit(1);
    }
  },
});
```

**Step 2: Register command**

Update `PackagesCommand.ts`:

```typescript
import { subcommands } from 'cmd-ts';
import { createPackageCommand } from './CreatePackageCommand';
import { addToPackageCommand } from './AddToPackageCommand';

export const packagesCommand = subcommands({
  name: 'packages',
  description: 'Manage packages',
  cmds: {
    create: createPackageCommand,
    add: addToPackageCommand,
  },
});
```

**Step 3: Run lint**

Run: `nx lint cli`
Expected: PASS

**Step 4: Build CLI**

Run: `nx build cli`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/AddToPackageCommand.ts apps/cli/src/infra/commands/PackagesCommand.ts
git commit -m "feat(cli): add 'packages add' command"
```

---

## Task 9: Update Skill Documentation

**Files:**
- Modify: `.github/skills/packmind-create-package/SKILL.md`
- Modify: `.claude/skills/packmind-create-package/SKILL.md`

**Step 1: Add content to skill**

Add after "Next Steps" section:

```markdown
3. **CLI command**: Use `packmind packages add` to add items

## Adding Content to Packages

After creating a package, use the `packages add` command:

```bash
# Add standards
packmind-cli packages add --to <package-slug> --standard <standard-slug>

# Add multiple standards
packmind-cli packages add --to <package-slug> --standard std-1 --standard std-2

# Add commands
packmind-cli packages add --to <package-slug> --command <command-slug>

# Add skills
packmind-cli packages add --to <package-slug> --skill <skill-slug>
```

**Note:** Only one item type per command. Run separate commands for different types.

### Post-Add Workflow

After successfully adding items to a package:

1. Report the output to the user
2. Use AskUserQuestion to ask: "Would you like me to run `packmind install` to sync the changes?"
3. If yes, run `packmind-cli install`
```

**Step 2: Copy to both locations**

Apply same changes to `.claude/skills/packmind-create-package/SKILL.md`.

**Step 3: Commit**

```bash
git add .github/skills/packmind-create-package/SKILL.md .claude/skills/packmind-create-package/SKILL.md
git commit -m "docs(skills): add packages add command to skill"
```

---

## Task 10: Final Validation

**Step 1: Run all tests**

Run: `nx test deployments && nx test cli`
Expected: PASS

**Step 2: Run all lints**

Run: `nx lint types && nx lint deployments && nx lint api && nx lint cli`
Expected: PASS

**Step 3: Build**

Run: `nx build cli`
Expected: PASS

**Step 4: Verify help**

Run: `node dist/apps/cli/main.cjs packages add --help`
Expected: Shows --to, --standard, --command, --skill options

---

## Summary

| Task | Area | Description |
|------|------|-------------|
| 1 | Types | Add skillIds and added/skipped response |
| 2 | Backend | Update use case for skills support |
| 3 | API | Add POST packages/:slug/add-artifacts endpoint |
| 4 | CLI | Add gateway types |
| 5 | CLI | Implement gateway method |
| 6 | CLI | Implement use case |
| 7 | CLI | Implement command handler |
| 8 | CLI | Create CLI command |
| 9 | Docs | Update skill documentation |
| 10 | QA | Final validation |
