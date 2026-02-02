# CLI List Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `list` subcommands to `standards`, `commands`, and `skills` CLI commands to display artifacts from the Packmind API.

**Architecture:** Each list command follows the existing CLI pattern: gateway method → use case → command handler. The gateway calls `GET /organizations/:orgId/spaces/:spaceId/{resource}` after resolving the global space.

**Tech Stack:** TypeScript, cmd-ts, Jest, chalk (via consoleLogger)

---

## Task 1: Add listStandards to Gateway Interface

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackmindGateway.ts`

**Step 1: Add type definitions to IPackmindGateway.ts**

Add after the `CreatePackageResult` type (around line 154):

```typescript
// List Standards types
export type ListedStandard = {
  slug: string;
  name: string;
  description: string;
};

export type ListStandardsResult = ListedStandard[];

// List Commands types
export type ListedCommand = {
  slug: string;
  name: string;
};

export type ListCommandsResult = ListedCommand[];

// List Skills types
export type ListedSkill = {
  slug: string;
  name: string;
  description: string;
};

export type ListSkillsResult = ListedSkill[];
```

**Step 2: Add methods to IPackmindGateway interface**

Add after `pushOnboardingBaseline` method (around line 203):

```typescript
  // List methods
  listStandards(): Promise<ListStandardsResult>;
  listCommands(): Promise<ListCommandsResult>;
  listSkills(): Promise<ListSkillsResult>;
```

**Step 3: Commit**

```bash
git add apps/cli/src/domain/repositories/IPackmindGateway.ts
git commit -m "$(cat <<'EOF'
feat(cli): add list methods to IPackmindGateway interface

Add type definitions and method signatures for listing
standards, commands, and skills.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Implement listStandards in PackmindGateway

**Files:**
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`

**Step 1: Add imports**

Add to the imports from IPackmindGateway (around line 21):

```typescript
  ListStandardsResult,
  ListCommandsResult,
  ListSkillsResult,
```

**Step 2: Implement listStandards method**

Add after `pushOnboardingBaseline` method (around line 934):

```typescript
  public listStandards = async (): Promise<ListStandardsResult> => {
    const space = await this.getGlobalSpace();
    const { organizationId } = this.httpClient.getAuthContext();

    const standards = await this.httpClient.request<
      Array<{ slug: string; name: string; description: string }>
    >(
      `/api/v0/organizations/${organizationId}/spaces/${space.id}/standards`,
    );

    return standards.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
    }));
  };

  public listCommands = async (): Promise<ListCommandsResult> => {
    const space = await this.getGlobalSpace();
    const { organizationId } = this.httpClient.getAuthContext();

    const recipes = await this.httpClient.request<
      Array<{ slug: string; name: string }>
    >(
      `/api/v0/organizations/${organizationId}/spaces/${space.id}/recipes`,
    );

    return recipes.map((r) => ({
      slug: r.slug,
      name: r.name,
    }));
  };

  public listSkills = async (): Promise<ListSkillsResult> => {
    const space = await this.getGlobalSpace();
    const { organizationId } = this.httpClient.getAuthContext();

    const skills = await this.httpClient.request<
      Array<{ slug: string; name: string; description: string }>
    >(
      `/api/v0/organizations/${organizationId}/spaces/${space.id}/skills`,
    );

    return skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
    }));
  };
```

**Step 3: Update mock gateway**

Modify `apps/cli/src/mocks/createMockGateways.ts`:

Add to `MockPackmindGatewayOverrides` type (around line 20):

```typescript
  listStandards?: jest.Mocked<IPackmindGateway>['listStandards'];
  listCommands?: jest.Mocked<IPackmindGateway>['listCommands'];
  listSkills?: jest.Mocked<IPackmindGateway>['listSkills'];
```

Add to the return object in `createMockPackmindGateway` (around line 42):

```typescript
    listStandards: jest.fn(),
    listCommands: jest.fn(),
    listSkills: jest.fn(),
```

**Step 4: Commit**

```bash
git add apps/cli/src/infra/repositories/PackmindGateway.ts apps/cli/src/mocks/createMockGateways.ts
git commit -m "$(cat <<'EOF'
feat(cli): implement list methods in PackmindGateway

Implement listStandards, listCommands, and listSkills
gateway methods that call the API.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create ListStandardsUseCase

**Files:**
- Create: `apps/cli/src/domain/useCases/IListStandardsUseCase.ts`
- Create: `apps/cli/src/application/useCases/ListStandardsUseCase.ts`

**Step 1: Create interface file**

Create `apps/cli/src/domain/useCases/IListStandardsUseCase.ts`:

```typescript
import { IPublicUseCase } from '@packmind/types';
import { ListedStandard } from '../repositories/IPackmindGateway';

export type IListStandardsCommand = Record<string, never>;

export type IListStandardsResult = ListedStandard[];

export type IListStandardsUseCase = IPublicUseCase<
  IListStandardsCommand,
  IListStandardsResult
>;
```

**Step 2: Create implementation file**

Create `apps/cli/src/application/useCases/ListStandardsUseCase.ts`:

```typescript
import {
  IListStandardsResult,
  IListStandardsUseCase,
} from '../../domain/useCases/IListStandardsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListStandardsUseCase implements IListStandardsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListStandardsResult> {
    return this.packmindGateway.listStandards();
  }
}
```

**Step 3: Commit**

```bash
git add apps/cli/src/domain/useCases/IListStandardsUseCase.ts apps/cli/src/application/useCases/ListStandardsUseCase.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListStandardsUseCase

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create ListCommandsUseCase

**Files:**
- Create: `apps/cli/src/domain/useCases/IListCommandsUseCase.ts`
- Create: `apps/cli/src/application/useCases/ListCommandsUseCase.ts`

**Step 1: Create interface file**

Create `apps/cli/src/domain/useCases/IListCommandsUseCase.ts`:

```typescript
import { IPublicUseCase } from '@packmind/types';
import { ListedCommand } from '../repositories/IPackmindGateway';

export type IListCommandsCommand = Record<string, never>;

export type IListCommandsResult = ListedCommand[];

export type IListCommandsUseCase = IPublicUseCase<
  IListCommandsCommand,
  IListCommandsResult
>;
```

**Step 2: Create implementation file**

Create `apps/cli/src/application/useCases/ListCommandsUseCase.ts`:

```typescript
import {
  IListCommandsResult,
  IListCommandsUseCase,
} from '../../domain/useCases/IListCommandsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListCommandsUseCase implements IListCommandsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListCommandsResult> {
    return this.packmindGateway.listCommands();
  }
}
```

**Step 3: Commit**

```bash
git add apps/cli/src/domain/useCases/IListCommandsUseCase.ts apps/cli/src/application/useCases/ListCommandsUseCase.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListCommandsUseCase

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create ListSkillsUseCase

**Files:**
- Create: `apps/cli/src/domain/useCases/IListSkillsUseCase.ts`
- Create: `apps/cli/src/application/useCases/ListSkillsUseCase.ts`

**Step 1: Create interface file**

Create `apps/cli/src/domain/useCases/IListSkillsUseCase.ts`:

```typescript
import { IPublicUseCase } from '@packmind/types';
import { ListedSkill } from '../repositories/IPackmindGateway';

export type IListSkillsCommand = Record<string, never>;

export type IListSkillsResult = ListedSkill[];

export type IListSkillsUseCase = IPublicUseCase<
  IListSkillsCommand,
  IListSkillsResult
>;
```

**Step 2: Create implementation file**

Create `apps/cli/src/application/useCases/ListSkillsUseCase.ts`:

```typescript
import {
  IListSkillsResult,
  IListSkillsUseCase,
} from '../../domain/useCases/IListSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class ListSkillsUseCase implements IListSkillsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(): Promise<IListSkillsResult> {
    return this.packmindGateway.listSkills();
  }
}
```

**Step 3: Commit**

```bash
git add apps/cli/src/domain/useCases/IListSkillsUseCase.ts apps/cli/src/application/useCases/ListSkillsUseCase.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListSkillsUseCase

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire UseCases in HexaFactory and Hexa

**Files:**
- Modify: `apps/cli/src/PackmindCliHexaFactory.ts`
- Modify: `apps/cli/src/PackmindCliHexa.ts`

**Step 1: Update PackmindCliHexaFactory.ts**

Add imports (around line 24):

```typescript
import { IListStandardsUseCase } from './domain/useCases/IListStandardsUseCase';
import { ListStandardsUseCase } from './application/useCases/ListStandardsUseCase';
import { IListCommandsUseCase } from './domain/useCases/IListCommandsUseCase';
import { ListCommandsUseCase } from './application/useCases/ListCommandsUseCase';
import { IListSkillsUseCase } from './domain/useCases/IListSkillsUseCase';
import { ListSkillsUseCase } from './application/useCases/ListSkillsUseCase';
```

Add to useCases type (around line 56):

```typescript
    listStandards: IListStandardsUseCase;
    listCommands: IListCommandsUseCase;
    listSkills: IListSkillsUseCase;
```

Add to useCases instantiation (around line 104):

```typescript
      listStandards: new ListStandardsUseCase(this.repositories.packmindGateway),
      listCommands: new ListCommandsUseCase(this.repositories.packmindGateway),
      listSkills: new ListSkillsUseCase(this.repositories.packmindGateway),
```

**Step 2: Update PackmindCliHexa.ts**

Add imports (around line 34):

```typescript
import {
  IListStandardsCommand,
  IListStandardsResult,
} from './domain/useCases/IListStandardsUseCase';
import {
  IListCommandsCommand,
  IListCommandsResult,
} from './domain/useCases/IListCommandsUseCase';
import {
  IListSkillsCommand,
  IListSkillsResult,
} from './domain/useCases/IListSkillsUseCase';
```

Add methods (around line 137, after `getPackageBySlug`):

```typescript
  public async listStandards(
    command: IListStandardsCommand,
  ): Promise<IListStandardsResult> {
    return this.hexa.useCases.listStandards.execute(command);
  }

  public async listCommands(
    command: IListCommandsCommand,
  ): Promise<IListCommandsResult> {
    return this.hexa.useCases.listCommands.execute(command);
  }

  public async listSkills(
    command: IListSkillsCommand,
  ): Promise<IListSkillsResult> {
    return this.hexa.useCases.listSkills.execute(command);
  }
```

**Step 3: Commit**

```bash
git add apps/cli/src/PackmindCliHexaFactory.ts apps/cli/src/PackmindCliHexa.ts
git commit -m "$(cat <<'EOF'
feat(cli): wire list use cases in HexaFactory and Hexa

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create ListStandardsCommand with Handler and Tests

**Files:**
- Create: `apps/cli/src/infra/commands/listStandardsHandler.ts`
- Create: `apps/cli/src/infra/commands/listStandardsHandler.spec.ts`
- Create: `apps/cli/src/infra/commands/ListStandardsCommand.ts`

**Step 1: Create handler**

Create `apps/cli/src/infra/commands/listStandardsHandler.ts`:

```typescript
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';

export type ListStandardsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listStandardsHandler(
  deps: ListStandardsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching standards...\n');
    const standards = await packmindCliHexa.listStandards({});

    if (standards.length === 0) {
      log('No standards found.');
      exit(0);
      return;
    }

    const sortedStandards = [...standards].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    log('Available standards:\n');
    sortedStandards.forEach((standard, index) => {
      log(`- 🔗 ${formatSlug(standard.slug)}`);
      log(`    ${formatLabel('Name:')} ${standard.name}`);
      if (standard.description) {
        const descriptionLines = standard.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const [firstLine, ...restLines] = descriptionLines;
        log(`    ${formatLabel('Description:')} ${firstLine}`);
        restLines.forEach((line) => {
          log(`                 ${line}`);
        });
      }
      if (index < sortedStandards.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list standards:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
```

**Step 2: Create tests**

Create `apps/cli/src/infra/commands/listStandardsHandler.spec.ts`:

```typescript
import { listStandardsHandler, ListStandardsHandlerDependencies } from './listStandardsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listStandardsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListStandardsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listStandards: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays standards sorted by slug', async () => {
    mockPackmindCliHexa.listStandards.mockResolvedValue([
      { slug: 'zebra-standard', name: 'Zebra Standard', description: 'Desc Z' },
      { slug: 'alpha-standard', name: 'Alpha Standard', description: 'Desc A' },
    ]);

    await listStandardsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available standards:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) => c.includes('alpha-standard'));
    const zebraIndex = logCalls.findIndex((c: string) => c.includes('zebra-standard'));
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no standards found', async () => {
    mockPackmindCliHexa.listStandards.mockResolvedValue([]);

    await listStandardsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No standards found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listStandards.mockRejectedValue(new Error('Network error'));

    await listStandardsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list standards:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
```

**Step 3: Run tests**

```bash
nx test cli --testPathPattern=listStandardsHandler
```

Expected: PASS

**Step 4: Create command**

Create `apps/cli/src/infra/commands/ListStandardsCommand.ts`:

```typescript
import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listStandardsHandler } from './listStandardsHandler';

export const listStandardsCommand = command({
  name: 'list',
  description: 'List available coding standards',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listStandardsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
```

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/listStandardsHandler.ts apps/cli/src/infra/commands/listStandardsHandler.spec.ts apps/cli/src/infra/commands/ListStandardsCommand.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListStandardsCommand with handler and tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create ListCommandsCommand with Handler and Tests

**Files:**
- Create: `apps/cli/src/infra/commands/listCommandsHandler.ts`
- Create: `apps/cli/src/infra/commands/listCommandsHandler.spec.ts`
- Create: `apps/cli/src/infra/commands/ListCommandsCommand.ts`

**Step 1: Create handler**

Create `apps/cli/src/infra/commands/listCommandsHandler.ts`:

```typescript
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';

export type ListCommandsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listCommandsHandler(
  deps: ListCommandsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching commands...\n');
    const commands = await packmindCliHexa.listCommands({});

    if (commands.length === 0) {
      log('No commands found.');
      exit(0);
      return;
    }

    const sortedCommands = [...commands].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    log('Available commands:\n');
    sortedCommands.forEach((cmd, index) => {
      log(`- 🔗 ${formatSlug(cmd.slug)}`);
      log(`    ${formatLabel('Name:')} ${cmd.name}`);
      if (index < sortedCommands.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list commands:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
```

**Step 2: Create tests**

Create `apps/cli/src/infra/commands/listCommandsHandler.spec.ts`:

```typescript
import { listCommandsHandler, ListCommandsHandlerDependencies } from './listCommandsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listCommandsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listCommands: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays commands sorted by slug', async () => {
    mockPackmindCliHexa.listCommands.mockResolvedValue([
      { slug: 'zebra-command', name: 'Zebra Command' },
      { slug: 'alpha-command', name: 'Alpha Command' },
    ]);

    await listCommandsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available commands:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) => c.includes('alpha-command'));
    const zebraIndex = logCalls.findIndex((c: string) => c.includes('zebra-command'));
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no commands found', async () => {
    mockPackmindCliHexa.listCommands.mockResolvedValue([]);

    await listCommandsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No commands found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listCommands.mockRejectedValue(new Error('Network error'));

    await listCommandsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list commands:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
```

**Step 3: Run tests**

```bash
nx test cli --testPathPattern=listCommandsHandler
```

Expected: PASS

**Step 4: Create command**

Create `apps/cli/src/infra/commands/ListCommandsCommand.ts`:

```typescript
import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listCommandsHandler } from './listCommandsHandler';

export const listCommandsCommand = command({
  name: 'list',
  description: 'List available commands',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listCommandsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
```

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/listCommandsHandler.ts apps/cli/src/infra/commands/listCommandsHandler.spec.ts apps/cli/src/infra/commands/ListCommandsCommand.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListCommandsCommand with handler and tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Create ListSkillsCommand with Handler and Tests

**Files:**
- Create: `apps/cli/src/infra/commands/listSkillsHandler.ts`
- Create: `apps/cli/src/infra/commands/listSkillsHandler.spec.ts`
- Create: `apps/cli/src/infra/commands/ListSkillsCommand.ts`

**Step 1: Create handler**

Create `apps/cli/src/infra/commands/listSkillsHandler.ts`:

```typescript
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';

export type ListSkillsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listSkillsHandler(
  deps: ListSkillsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching skills...\n');
    const skills = await packmindCliHexa.listSkills({});

    if (skills.length === 0) {
      log('No skills found.');
      exit(0);
      return;
    }

    const sortedSkills = [...skills].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    log('Available skills:\n');
    sortedSkills.forEach((skill, index) => {
      log(`- 🔗 ${formatSlug(skill.slug)}`);
      log(`    ${formatLabel('Name:')} ${skill.name}`);
      if (skill.description) {
        const descriptionLines = skill.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const [firstLine, ...restLines] = descriptionLines;
        log(`    ${formatLabel('Description:')} ${firstLine}`);
        restLines.forEach((line) => {
          log(`                 ${line}`);
        });
      }
      if (index < sortedSkills.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list skills:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
```

**Step 2: Create tests**

Create `apps/cli/src/infra/commands/listSkillsHandler.spec.ts`:

```typescript
import { listSkillsHandler, ListSkillsHandlerDependencies } from './listSkillsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

describe('listSkillsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListSkillsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listSkills: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays skills sorted by slug', async () => {
    mockPackmindCliHexa.listSkills.mockResolvedValue([
      { slug: 'zebra-skill', name: 'Zebra Skill', description: 'Desc Z' },
      { slug: 'alpha-skill', name: 'Alpha Skill', description: 'Desc A' },
    ]);

    await listSkillsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('Available skills:\n');
    const logCalls = mockLog.mock.calls.map((c) => c[0]);
    const alphaIndex = logCalls.findIndex((c: string) => c.includes('alpha-skill'));
    const zebraIndex = logCalls.findIndex((c: string) => c.includes('zebra-skill'));
    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays message when no skills found', async () => {
    mockPackmindCliHexa.listSkills.mockResolvedValue([]);

    await listSkillsHandler(deps);

    expect(mockLog).toHaveBeenCalledWith('No skills found.');
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('displays error on failure', async () => {
    mockPackmindCliHexa.listSkills.mockRejectedValue(new Error('Network error'));

    await listSkillsHandler(deps);

    expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list skills:');
    expect(mockError).toHaveBeenCalledWith('   Network error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
```

**Step 3: Run tests**

```bash
nx test cli --testPathPattern=listSkillsHandler
```

Expected: PASS

**Step 4: Create command**

Create `apps/cli/src/infra/commands/ListSkillsCommand.ts`:

```typescript
import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listSkillsHandler } from './listSkillsHandler';

export const listSkillsCommand = command({
  name: 'list',
  description: 'List available skills',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listSkillsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
```

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/listSkillsHandler.ts apps/cli/src/infra/commands/listSkillsHandler.spec.ts apps/cli/src/infra/commands/ListSkillsCommand.ts
git commit -m "$(cat <<'EOF'
feat(cli): add ListSkillsCommand with handler and tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Register List Commands in Routers

**Files:**
- Modify: `apps/cli/src/infra/commands/StandardsCommand.ts`
- Modify: `apps/cli/src/infra/commands/CommandsCommand.ts`
- Modify: `apps/cli/src/infra/commands/SkillsCommand.ts`

**Step 1: Update StandardsCommand.ts**

```typescript
import { subcommands } from 'cmd-ts';
import { createStandardCommand } from './CreateStandardCommand';
import { listStandardsCommand } from './ListStandardsCommand';

export const standardsCommand = subcommands({
  name: 'standards',
  description: 'Manage coding standards',
  cmds: {
    create: createStandardCommand,
    list: listStandardsCommand,
  },
});
```

**Step 2: Update CommandsCommand.ts**

```typescript
import { subcommands } from 'cmd-ts';
import { createCommandCommand } from './CreateCommandCommand';
import { listCommandsCommand } from './ListCommandsCommand';

export const commandsCommand = subcommands({
  name: 'commands',
  description: 'Manage commands',
  cmds: {
    create: createCommandCommand,
    list: listCommandsCommand,
  },
});
```

**Step 3: Update SkillsCommand.ts**

```typescript
import { subcommands } from 'cmd-ts';
import { addSkillCommand } from './skills/AddSkillCommand';
import { installDefaultSkillsCommand } from './skills/InstallDefaultSkillsCommand';
import { listSkillsCommand } from './ListSkillsCommand';

export const skillsCommand = subcommands({
  name: 'skills',
  description: 'Manage skills in your Packmind organization',
  cmds: {
    add: addSkillCommand,
    init: installDefaultSkillsCommand,
    list: listSkillsCommand,
  },
});
```

**Step 4: Run all CLI tests**

```bash
nx test cli
```

Expected: PASS

**Step 5: Run lint**

```bash
nx lint cli
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/cli/src/infra/commands/StandardsCommand.ts apps/cli/src/infra/commands/CommandsCommand.ts apps/cli/src/infra/commands/SkillsCommand.ts
git commit -m "$(cat <<'EOF'
feat(cli): register list commands in routers

Add list subcommand to standards, commands, and skills routers.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Manual Testing

**Step 1: Build the CLI**

```bash
npm run packmind-cli:build
```

**Step 2: Test each command**

```bash
node dist/apps/cli/main.cjs standards list
node dist/apps/cli/main.cjs commands list
node dist/apps/cli/main.cjs skills list
```

Expected: Each command displays the list of artifacts with the 🔗 icon format.

**Step 3: Test help output**

```bash
node dist/apps/cli/main.cjs standards --help
node dist/apps/cli/main.cjs commands --help
node dist/apps/cli/main.cjs skills --help
```

Expected: Each shows `list` as an available subcommand.
