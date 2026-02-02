# `packmind-cli packages create` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a CLI command to create Packmind packages via the API.

**Architecture:** Following existing CLI patterns - PackagesCommand router with CreatePackageCommand subcommand. Handler calls gateway method, gateway makes HTTP request to API.

**Tech Stack:** cmd-ts for CLI, PackmindHttpClient for API calls, consoleLogger for output.

---

## Task 1: Add createPackage to Gateway Interface

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackmindGateway.ts`

**Step 1: Add types for createPackage**

Add after line 254 (after `CreateCommandResult`):

```typescript
// Create package types
export type CreatePackageCommand = {
  name: string;
  description?: string;
};

export type CreatePackageResult = {
  id: string;
  name: string;
  slug: string;
};
```

**Step 2: Add method signature to interface**

Add to `IPackmindGateway` interface (after `createCommand` at line 295):

```typescript
  // Atomic gateway for package creation
  createPackage(
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult>;
```

**Step 3: Commit**

```bash
git add apps/cli/src/domain/repositories/IPackmindGateway.ts
git commit -m "feat(cli): add createPackage types to gateway interface"
```

---

## Task 2: Implement createPackage in Gateway

**Files:**
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`

**Step 1: Add import for new types**

Update the imports from `IPackmindGateway` (around line 1-28) to include:

```typescript
import {
  // ... existing imports ...
  CreatePackageCommand,
  CreatePackageResult,
} from '../../domain/repositories/IPackmindGateway';
```

**Step 2: Add createPackage method**

Add after the `createCommand` method (after line 1299):

```typescript
  public createPackage = async (
    spaceId: string,
    data: CreatePackageCommand,
  ): Promise<CreatePackageResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreatePackageResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages`,
      { method: 'POST', body: data },
    );
  };
```

**Step 3: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/cli/src/infra/repositories/PackmindGateway.ts
git commit -m "feat(cli): implement createPackage gateway method"
```

---

## Task 3: Create CreatePackageUseCase Interface

**Files:**
- Create: `apps/cli/src/domain/useCases/ICreatePackageUseCase.ts`

**Step 1: Create the interface file**

```typescript
export interface ICreatePackageInput {
  name: string;
  description?: string;
}

export interface ICreatePackageResult {
  packageId: string;
  name: string;
  slug: string;
}

export interface ICreatePackageUseCase {
  execute(input: ICreatePackageInput): Promise<ICreatePackageResult>;
}
```

**Step 2: Commit**

```bash
git add apps/cli/src/domain/useCases/ICreatePackageUseCase.ts
git commit -m "feat(cli): add ICreatePackageUseCase interface"
```

---

## Task 4: Implement CreatePackageUseCase

**Files:**
- Create: `apps/cli/src/application/useCases/CreatePackageUseCase.ts`

**Step 1: Create the use case implementation**

```typescript
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreatePackageInput,
  ICreatePackageResult,
  ICreatePackageUseCase,
} from '../../domain/useCases/ICreatePackageUseCase';

export class CreatePackageUseCase implements ICreatePackageUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(input: ICreatePackageInput): Promise<ICreatePackageResult> {
    const space = await this.gateway.getGlobalSpace();
    const result = await this.gateway.createPackage(space.id, {
      name: input.name,
      description: input.description,
    });

    return {
      packageId: result.id,
      name: result.name,
      slug: result.slug,
    };
  }
}
```

**Step 2: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/application/useCases/CreatePackageUseCase.ts
git commit -m "feat(cli): implement CreatePackageUseCase"
```

---

## Task 5: Create createPackageHandler with Tests (TDD)

**Files:**
- Create: `apps/cli/src/infra/commands/createPackageHandler.ts`
- Create: `apps/cli/src/infra/commands/createPackageHandler.spec.ts`

**Step 1: Write the failing test**

Create `apps/cli/src/infra/commands/createPackageHandler.spec.ts`:

```typescript
import { createPackageHandler } from './createPackageHandler';
import { ICreatePackageUseCase } from '../../domain/useCases/ICreatePackageUseCase';

describe('createPackageHandler', () => {
  let mockUseCase: jest.Mocked<ICreatePackageUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    };
  });

  describe('when creating a package with name only', () => {
    beforeEach(() => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-123',
        name: 'FrontEnd',
        slug: 'frontend',
      });
    });

    it('returns success with package details', async () => {
      const result = await createPackageHandler('FrontEnd', undefined, mockUseCase);

      expect(result.success).toBe(true);
      expect(result.slug).toBe('frontend');
      expect(result.name).toBe('FrontEnd');
    });

    it('calls use case with correct input', async () => {
      await createPackageHandler('FrontEnd', undefined, mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'FrontEnd',
        description: undefined,
      });
    });
  });

  describe('when creating a package with name and description', () => {
    beforeEach(() => {
      mockUseCase.execute.mockResolvedValue({
        packageId: 'pkg-456',
        name: 'BackEnd',
        slug: 'backend',
      });
    });

    it('passes description to use case', async () => {
      await createPackageHandler('BackEnd', 'Backend standards', mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        name: 'BackEnd',
        description: 'Backend standards',
      });
    });
  });

  describe('when use case throws an error', () => {
    beforeEach(() => {
      mockUseCase.execute.mockRejectedValue(new Error('Network error'));
    });

    it('returns failure with error message', async () => {
      const result = await createPackageHandler('FrontEnd', undefined, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('when name is empty', () => {
    it('returns validation error', async () => {
      const result = await createPackageHandler('', undefined, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Package name is required');
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when name is whitespace only', () => {
    it('returns validation error', async () => {
      const result = await createPackageHandler('   ', undefined, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Package name is required');
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test packmind-cli --testPathPattern=createPackageHandler.spec.ts`
Expected: FAIL with "Cannot find module './createPackageHandler'"

**Step 3: Write minimal implementation**

Create `apps/cli/src/infra/commands/createPackageHandler.ts`:

```typescript
import { ICreatePackageUseCase } from '../../domain/useCases/ICreatePackageUseCase';

export interface ICreatePackageHandlerResult {
  success: boolean;
  slug?: string;
  name?: string;
  packageId?: string;
  error?: string;
}

export async function createPackageHandler(
  name: string,
  description: string | undefined,
  useCase: ICreatePackageUseCase,
): Promise<ICreatePackageHandlerResult> {
  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Package name is required' };
  }

  try {
    const result = await useCase.execute({
      name: trimmedName,
      description,
    });

    return {
      success: true,
      slug: result.slug,
      name: result.name,
      packageId: result.packageId,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test packmind-cli --testPathPattern=createPackageHandler.spec.ts`
Expected: PASS (all tests green)

**Step 5: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/cli/src/infra/commands/createPackageHandler.ts apps/cli/src/infra/commands/createPackageHandler.spec.ts
git commit -m "feat(cli): add createPackageHandler with tests"
```

---

## Task 6: Create CreatePackageCommand

**Files:**
- Create: `apps/cli/src/infra/commands/CreatePackageCommand.ts`

**Step 1: Create the command file**

```typescript
import { command, positional, string, option, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { createPackageHandler } from './createPackageHandler';
import { logSuccessConsole, logErrorConsole, logConsole } from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { CreatePackageUseCase } from '../../application/useCases/CreatePackageUseCase';

export const createPackageCommand = command({
  name: 'create',
  description: 'Create a new package',
  args: {
    name: positional({
      displayName: 'name',
      description: 'Name of the package to create',
      type: string,
    }),
    description: option({
      long: 'description',
      short: 'd',
      description: 'Description of the package (optional)',
      type: optional(string),
    }),
  },
  handler: async ({ name, description }) => {
    try {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      const hexa = new PackmindCliHexa(packmindLogger);
      const gateway = hexa.getPackmindGateway();
      const useCase = new CreatePackageUseCase(gateway);

      const result = await createPackageHandler(name, description, useCase);

      if (result.success) {
        logConsole(`Created: ${result.slug}`);
        logConsole(`You can see it at: ${hexa.getWebAppUrl()}/packages/${result.slug}`);
        logConsole(`You can install it with: packmind-cli packages install ${result.slug}`);
        process.exit(0);
      } else {
        logErrorConsole(`Failed to create package: ${result.error}`);
        process.exit(1);
      }
    } catch (e) {
      logErrorConsole(
        `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
      process.exit(1);
    }
  },
});
```

**Step 2: Run lint**

Run: `nx lint packmind-cli`
Expected: May fail if `getWebAppUrl()` doesn't exist - we'll handle this in next step

**Step 3: Commit (if lint passes) or proceed to Task 7**

---

## Task 7: Add getWebAppUrl to PackmindCliHexa

**Files:**
- Modify: `apps/cli/src/PackmindCliHexa.ts`

**Step 1: Check if getWebAppUrl exists**

Read the file to check if this method exists. If not, add it:

```typescript
public getWebAppUrl(): string {
  // Get host from credentials and derive web app URL
  const apiKey = this.factory.getApiKey();
  if (!apiKey) {
    return 'https://app.packmind.com';
  }

  try {
    const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
    const host = decoded.host || 'https://api.packmind.com';
    // Convert API URL to app URL (api.packmind.com -> app.packmind.com)
    return host.replace('api.', 'app.').replace('/api', '');
  } catch {
    return 'https://app.packmind.com';
  }
}
```

**Note:** If a simpler approach is already available (e.g., environment variable or config), use that instead.

**Step 2: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/PackmindCliHexa.ts
git commit -m "feat(cli): add getWebAppUrl helper method"
```

---

## Task 8: Create PackagesCommand Router

**Files:**
- Create: `apps/cli/src/infra/commands/PackagesCommand.ts`

**Step 1: Create the subcommand router**

```typescript
import { subcommands } from 'cmd-ts';
import { createPackageCommand } from './CreatePackageCommand';

export const packagesCommand = subcommands({
  name: 'packages',
  description: 'Manage packages',
  cmds: {
    create: createPackageCommand,
  },
});
```

**Step 2: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/infra/commands/PackagesCommand.ts
git commit -m "feat(cli): add PackagesCommand router"
```

---

## Task 9: Register packages Command in main.ts

**Files:**
- Modify: `apps/cli/src/main.ts`

**Step 1: Add import**

Add after line 16 (after commandsCommand import):

```typescript
import { packagesCommand } from './infra/commands/PackagesCommand';
```

**Step 2: Register the command**

Add to the `cmds` object (after line 101, after `commands: commandsCommand`):

```typescript
    packages: packagesCommand,
```

**Step 3: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 4: Build and verify help**

Run: `npm run packmind-cli:build && node dist/apps/cli/main.cjs packages --help`
Expected: Shows "packages" command with "create" subcommand

**Step 5: Commit**

```bash
git add apps/cli/src/main.ts
git commit -m "feat(cli): register packages command in main"
```

---

## Task 10: Run Full Test Suite

**Step 1: Run all CLI tests**

Run: `nx test packmind-cli`
Expected: PASS (all tests green)

**Step 2: Run lint**

Run: `nx lint packmind-cli`
Expected: PASS

**Step 3: Build**

Run: `npm run packmind-cli:build`
Expected: PASS

---

## Task 11: Manual Integration Test

**Step 1: Test the command help**

Run: `node dist/apps/cli/main.cjs packages create --help`

Expected output:
```
Create a new package

ARGUMENTS:
  <name> - Name of the package to create

OPTIONS:
  -d, --description - Description of the package (optional)
```

**Step 2: Test with a real package (if logged in)**

Run: `node dist/apps/cli/main.cjs packages create TestPackage --description="Test package"`

Expected output (if API exists):
```
Created: testpackage
You can see it at: https://app.packmind.com/packages/testpackage
You can install it with: packmind-cli packages install testpackage
```

Or error message if API endpoint doesn't exist yet.

---

## Summary

Files created:
- `apps/cli/src/domain/useCases/ICreatePackageUseCase.ts`
- `apps/cli/src/application/useCases/CreatePackageUseCase.ts`
- `apps/cli/src/infra/commands/createPackageHandler.ts`
- `apps/cli/src/infra/commands/createPackageHandler.spec.ts`
- `apps/cli/src/infra/commands/CreatePackageCommand.ts`
- `apps/cli/src/infra/commands/PackagesCommand.ts`

Files modified:
- `apps/cli/src/domain/repositories/IPackmindGateway.ts`
- `apps/cli/src/infra/repositories/PackmindGateway.ts`
- `apps/cli/src/PackmindCliHexa.ts` (if needed)
- `apps/cli/src/main.ts`
