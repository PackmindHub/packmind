---
name: 'cli-e2e-test-authoring'
description: 'Guide for adding new end-to-end tests for the Packmind CLI. This skill should be used when creating new test specs in the `apps/cli-e2e-tests/` directory that exercise CLI commands against a real binary and API.'
---

# CLI E2E Test Authoring

## Overview

Add end-to-end tests that exercise the Packmind CLI binary (`dist/apps/cli/main.cjs`) in realistic conditions. Tests run the actual CLI as a child process and, when authentication is needed, interact with a running API via HTTP gateways.

## Test File Location

All spec files live in `apps/cli-e2e-tests/src/` and follow the naming convention `<command>.spec.ts`.

## Choosing a Test Wrapper

Two wrappers are available depending on whether the command requires authentication.

### Unauthenticated commands — `describeWithTempSpace`

Provides an isolated temporary directory. No API required.

```typescript
import { describeWithTempSpace, runCli } from './helpers';

describeWithTempSpace('my-command without auth', (getContext) => {
  let result: Awaited<ReturnType<typeof runCli>>;

  beforeEach(async () => {
    const { testDir } = await getContext();
    result = await runCli('my-command', { cwd: testDir });
  });

  it('exits with code 1', () => {
    expect(result.returnCode).toBe(1);
  });

  it('shows an error message', () => {
    expect(result.stdout).toContain('No credentials found');
  });
});
```

### Authenticated commands — `describeWithUserSignedUp`

Extends `describeWithTempSpace` by creating a real user account, signing in, and generating an API key. Requires a running API at `http://localhost:4200`.

```typescript
import { describeWithUserSignedUp, runCli } from './helpers';

describeWithUserSignedUp('my-command with auth', (getContext) => {
  let result: Awaited<ReturnType<typeof runCli>>;

  beforeEach(async () => {
    const { apiKey, testDir } = await getContext();
    result = await runCli('my-command', { apiKey, cwd: testDir });
  });

  it('succeeds', () => {
    expect(result.returnCode).toBe(0);
  });

  it('displays expected output', () => {
    expect(result.stdout).toContain('Expected text');
  });
});
```

The context object from `describeWithUserSignedUp` provides:

| Field          | Description                                      |
|----------------|--------------------------------------------------|
| `testDir`      | Isolated temporary directory                     |
| `apiKey`       | Valid API key for the created user                |
| `user`         | User object (email, etc.)                        |
| `organization` | Organization the user belongs to                 |
| `spaceId`      | Global space ID for the organization             |
| `gateway`      | Authenticated gateway to call the API directly   |

## Setting Up Test Preconditions

### Git repository

Commands that interact with git (e.g. `diff`, `install`) require a git repo. Call `setupGitRepo` in `beforeEach`:

```typescript
import { setupGitRepo } from './helpers';

beforeEach(async () => {
  const { testDir } = await getContext();
  await setupGitRepo(testDir);
});
```

### Creating API resources

Use `gateway` from the context to seed data before running the CLI:

```typescript
beforeEach(async () => {
  const { gateway, spaceId, testDir } = await getContext();
  await setupGitRepo(testDir);
  await gateway.commands.create({ spaceId, /* ... */ });
  await gateway.packages.create({ spaceId, /* ... */ });
});
```

### File manipulation

Use file helpers to create or modify files in the test directory:

```typescript
import { readFile, updateFile, fileExists } from './helpers';

const content = readFile('path/to/file.md', testDir);
updateFile('path/to/file.md', 'new content', testDir);
const exists = fileExists('path/to/file.md', testDir);
```

## Assertion Patterns

Split assertions into individual `it` blocks. Store the CLI result in a block-scoped `let` variable populated by `beforeEach`:

```typescript
let result: Awaited<ReturnType<typeof runCli>>;

beforeEach(async () => {
  result = await runCli('some-command', { apiKey, cwd: testDir });
});

it('succeeds', () => {
  expect(result.returnCode).toBe(0);
});

it('displays the summary', () => {
  expect(result.stdout).toContain('1 change submitted');
});
```

## Nesting Describes for Multi-Step Scenarios

For commands that require chained operations (e.g. install then modify then diff), nest `describe` blocks. Each level adds its own `beforeEach` that builds on the parent context:

```typescript
describeWithUserSignedUp('diff command', (getContext) => {
  beforeEach(async () => {
    // setup: git repo + seed data + install
  });

  describe('when a change is submitted', () => {
    beforeEach(async () => {
      // modify file + run diff --submit
    });

    it('succeeds', () => { /* ... */ });

    describe('when running diff again', () => {
      beforeEach(async () => {
        // run diff without --submit
      });

      it('excludes the already-submitted change', () => { /* ... */ });
    });
  });
});
```

## Adding a New Gateway

When the CLI command under test requires seeding a new type of API resource:

1. Add the interface method to `helpers/IPackmindGateway.ts`. All exposed methods must be typed with `Gateway<IXxxUseCase>` or `PublicGateway<IXxxUseCase>` (imported from `@packmind/types`)
2. Create `helpers/gateways/NewResourceGateway.ts` implementing the interface
3. Add a lazy getter to `helpers/gateways/PackmindGateway.ts` (reset on `initializeWithApiKey`)
4. Re-export from `helpers/index.ts`