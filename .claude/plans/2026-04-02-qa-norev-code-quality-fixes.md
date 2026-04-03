# QA No-Review Code Quality Fixes — Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to execute this plan.

**Goal:** Fix 6 code findings and 2 coverage gaps from the QA review of `playbook submit --no-review`.
**Architecture:** All changes are within existing files — no new domains or packages. Touches `packages/playbook-change-applier` (type safety), `apps/cli` (UX messaging + test refactor), and `apps/cli-e2e-tests` (update flow coverage).
**Tech stack:** TypeScript `satisfies`, Jest mock patterns, cmd-ts CLI output, E2E test helpers.

---

## Chunk 1: Type Safety & Test Ordering (playbook-change-applier)

### Task 1: Replace unsafe `as ChangeProposal` cast with `satisfies`

**Files:**
- Modify: `packages/playbook-change-applier/src/ApplyPlaybookUseCase.ts`

**Acceptance criteria:**
- [ ] `buildChangeProposal` uses `satisfies ChangeProposal` instead of `as ChangeProposal`
- [ ] TypeScript compiles without errors

**Steps:**
- [ ] Run tests: `./node_modules/.bin/nx test playbook-change-applier` — confirm green baseline
- [ ] Replace `as ChangeProposal` with `satisfies ChangeProposal` at line 332
- [ ] Run typecheck: `./node_modules/.bin/nx typecheck playbook-change-applier` — confirm no errors. **Fallback:** If typecheck fails due to the generic `ChangeProposal<T>` intersection with the discriminated union, try `satisfies ChangeProposal<ChangeProposalType>`. If that also fails, keep the return type annotation as the safety mechanism and remove the `as` cast entirely (let TypeScript infer).
- [ ] Run tests: `./node_modules/.bin/nx test playbook-change-applier` — confirm still green
- [ ] Lint: `./node_modules/.bin/nx lint playbook-change-applier`
- [ ] Commit: `git commit -m "refactor(playbook-change-applier): replace unsafe as ChangeProposal with satisfies"`

```typescript
// Before (line 332):
  } as ChangeProposal;

// After:
  } satisfies ChangeProposal;
```

### Task 2: Add default case to `getApplierForType`

**Files:**
- Modify: `packages/playbook-change-applier/src/ApplyPlaybookUseCase.ts`

**Acceptance criteria:**
- [ ] `getApplierForType` switch has a `default` case that throws
- [ ] Existing tests pass unchanged

**Steps:**
- [ ] Add `default` case to the switch at lines 298-309
- [ ] Run tests: `./node_modules/.bin/nx test playbook-change-applier` — confirm green
- [ ] Lint: `./node_modules/.bin/nx lint playbook-change-applier`
- [ ] Commit: `git commit -m "refactor(playbook-change-applier): add exhaustive default to getApplierForType"`

```typescript
// Before (lines 298-309):
  private getApplierForType(
    itemType: 'standard' | 'command' | 'skill',
  ): IChangesProposalApplier<ApplierObjectVersions> {
    switch (itemType) {
      case 'standard':
        return new StandardChangesApplier(this.diffService, this.standardsPort);
      case 'command':
        return new CommandChangesApplier(this.diffService, this.recipesPort);
      case 'skill':
        return new SkillChangesApplier(this.diffService, this.skillsPort);
    }
  }

// After:
  private getApplierForType(
    itemType: 'standard' | 'command' | 'skill',
  ): IChangesProposalApplier<ApplierObjectVersions> {
    switch (itemType) {
      case 'standard':
        return new StandardChangesApplier(this.diffService, this.standardsPort);
      case 'command':
        return new CommandChangesApplier(this.diffService, this.recipesPort);
      case 'skill':
        return new SkillChangesApplier(this.diffService, this.skillsPort);
      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }
  }
```

### Task 3: Reorder `afterEach`/`beforeEach` in spec

**Files:**
- Modify: `packages/playbook-change-applier/src/ApplyPlaybookUseCase.spec.ts`

**Acceptance criteria:**
- [ ] `beforeEach` appears before `afterEach` in the top-level describe block
- [ ] All tests pass unchanged

**Steps:**
- [ ] Move the `afterEach` block (lines 76-78) to after the `beforeEach` block (after ~line 135)
- [ ] Run tests: `./node_modules/.bin/nx test playbook-change-applier` — confirm green
- [ ] Lint: `./node_modules/.bin/nx lint playbook-change-applier`
- [ ] Commit: `git commit -m "refactor(playbook-change-applier): reorder beforeEach/afterEach for conventional ordering"`

```typescript
// Before (lines 76-135):
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // ... mock setup ...
  });

// After:
  beforeEach(() => {
    // ... mock setup ...
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
```

---

## Chunk 2: CLI UX Improvements (submitHandler)

### Task 4: Type `collectParts` precisely

**Files:**
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.ts`

**Acceptance criteria:**
- [ ] `collectParts` parameter uses a type with `readonly unknown[]` per key, matching the `ApplyPlaybookResponse` structure
- [ ] Existing tests pass

**Steps:**
- [ ] Run tests: `./node_modules/.bin/nx test packmind-cli` — confirm green baseline
- [ ] Replace `unknown[]` typing in `collectParts` with a more precise shape
- [ ] Run typecheck: `./node_modules/.bin/nx typecheck packmind-cli`
- [ ] Run tests: `./node_modules/.bin/nx test packmind-cli` — confirm green
- [ ] Lint: `./node_modules/.bin/nx lint packmind-cli`
- [ ] Commit: `git commit -m "refactor(cli): type collectParts parameter precisely"`

```typescript
// Before (lines 872-881):
    const collectParts = (counts: {
      standards: unknown[];
      commands: unknown[];
      skills: unknown[];
    }): string[] =>

// After — use readonly unknown[] which the spec says is acceptable since only .length is accessed:
    const collectParts = (counts: {
      standards: readonly unknown[];
      commands: readonly unknown[];
      skills: readonly unknown[];
    }): string[] =>
```

This is the simplest fix that removes `unknown[]` (mutable) in favor of `readonly unknown[]`, which accepts both the `created` arrays (branded ID objects) and `updated` arrays (branded ID strings) without hand-rolling approximate shapes. Both `response.created` and `response.updated` satisfy this constraint.

### Task 5: Improve batchApply error message

**Files:**
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.ts`
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.spec.ts`

**Acceptance criteria:**
- [ ] `!response.success` branch shows `"Failed to apply changes: <message>"` + recovery guidance
- [ ] Existing error test updated to match new message format

**Steps:**
- [ ] Write failing tests — update the assertion in `'when batchApply returns success: false'` → `'logs the error message'` test (~line 3028) to expect the new format, and add a test for the recovery guidance:
  ```typescript
  it('logs the error message', async () => {
    expect(logErrorConsole).toHaveBeenCalledWith(
      'Failed to apply changes: Duplicate name',
    );
  });

  it('logs recovery guidance', async () => {
    expect(logInfoConsole).toHaveBeenCalledWith(
      'Your playbook has not been modified. Fix the issue and retry.',
    );
  });
  ```
- [ ] Run tests: `./node_modules/.bin/nx test packmind-cli --testFile=apps/cli/src/infra/commands/playbook/submitHandler.spec.ts` — confirm it fails
- [ ] Update `submitHandler.ts` lines 855-858:
  ```typescript
  if (!response.success) {
    logErrorConsole(`Failed to apply changes: ${response.error.message}`);
    logInfoConsole('Your playbook has not been modified. Fix the issue and retry.');
    exit(1);
    return;
  }
  ```
- [ ] Run tests — confirm green
- [ ] Lint: `./node_modules/.bin/nx lint packmind-cli`
- [ ] Commit: `git commit -m "fix(cli): improve batchApply error message with recovery guidance"`

### Task 6: Improve multi-space partial failure UX

**Files:**
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.ts`
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.spec.ts`

**Acceptance criteria:**
- [ ] Per-space success/failure reporting with space names
- [ ] On partial success, tells user to retry
- [ ] Falls back to space ID when `spaceName` is missing
- [ ] Unit tests cover: all succeed, all fail, partial (space1 ok, space2 fail)

**Steps:**
- [ ] Write failing tests — add new `describe` block for multi-space reporting:
  ```typescript
  describe('when submitting to multiple spaces', () => {
    describe('when one space fails', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ spaceId: 'space-1', spaceName: 'Frontend' }),
          makeEntry({
            spaceId: 'space-2',
            spaceName: 'Backend',
            filePath: '.packmind/standards/other.md',
            artifactName: 'Other Standard',
          }),
        ]);
        mockGateway.changeProposals.batchCreate
          .mockResolvedValueOnce({ created: 1, skipped: 0, errors: [] })
          .mockResolvedValueOnce({
            created: 0,
            skipped: 0,
            errors: [{ index: 0, message: 'Space quota exceeded' }],
          });
      });

      it('reports the failed space by name', async () => {
        // assert logErrorConsole called with "Failed to submit to space 'Backend'"
      });

      it('reports the succeeded space and retry guidance', async () => {
        // assert logWarningConsole called with "Submitted to: Frontend."
        // and "Run 'packmind playbook submit' again to retry failed spaces."
      });
    });
  });
  ```
- [ ] Run tests — confirm they fail
- [ ] Implement in `submitHandler.ts`:
  1. Before the `for` loop (~line 918), build `spaceNameById` map from `changes`:
     ```typescript
     const spaceNameById = new Map<string, string>();
     for (const change of changes) {
       if (change.spaceName && !spaceNameById.has(change.spaceId)) {
         spaceNameById.set(change.spaceId, change.spaceName);
       }
     }
     const displaySpace = (id: string) => spaceNameById.get(id) ?? id;
     ```
  2. **Keep** `totalCreated` and `totalSkipped` counters (they're needed for the success message). **Replace** `hasErrors` boolean with two new arrays:
     ```typescript
     let totalCreated = 0;
     let totalSkipped = 0;
     const succeededSpaces: string[] = [];
     const failedSpaces: Array<{ spaceId: string; errors: string[] }> = [];
     ```
  3. In the loop, on success (the `else` branch at line 994): add `succeededSpaces.push(spaceId)` alongside the existing `totalCreated`/`totalSkipped` increments
  4. On error (the non-removal/cleanup `else` branch at line 988-993): replace `hasErrors = true` + per-error logging with `failedSpaces.push({ spaceId, errors: response.errors.map(e => e.message) })`
  5. Replace the `if (hasErrors)` block (lines 1021-1031) with per-space reporting using `failedSpaces.length > 0`:
     ```typescript
     if (failedSpaces.length > 0) {
       for (const { spaceId, errors } of failedSpaces) {
         logErrorConsole(
           `Failed to submit to space '${displaySpace(spaceId)}': ${errors.join(', ')}`,
         );
       }
       if (succeededSpaces.length > 0) {
         logWarningConsole(
           `Submitted to: ${succeededSpaces.map(displaySpace).join(', ')}. ` +
             `Run 'packmind playbook submit' again to retry failed spaces.`,
         );
       }
       exit(1);
       return;
     }
     ```
  6. Leave lines 1033-1051 (success reporting) unchanged — `totalCreated` and `totalSkipped` still drive it.
- [ ] Run tests — confirm green
- [ ] Lint: `./node_modules/.bin/nx lint packmind-cli`
- [ ] Commit: `git commit -m "feat(cli): report per-space results for multi-space playbook submit"`

---

## Chunk 3: Test Refactor & E2E (submitHandler.spec + cli-e2e-tests)

### Task 7: Extract `jest.requireMock` references

**Files:**
- Modify: `apps/cli/src/infra/commands/playbook/submitHandler.spec.ts`

**Acceptance criteria:**
- [ ] Console logger mock references extracted once at describe level
- [ ] All existing tests pass with identical assertions

**Steps:**
- [ ] Place the extraction **after all variable declarations, `beforeEach`, and `buildDeps` helper** but **before the first nested `describe`** (around line 158). The mock is module-scoped (set up by `jest.mock()` at line 12), so the reference is stable across tests — `jest.clearAllMocks()` clears call history but doesn't replace the mock functions:
  ```typescript
  const {
    logConsole,
    logErrorConsole,
    logInfoConsole,
    logSuccessConsole,
    logWarningConsole,
  } = jest.requireMock('../../utils/consoleLogger') as {
    logConsole: jest.Mock;
    logErrorConsole: jest.Mock;
    logInfoConsole: jest.Mock;
    logSuccessConsole: jest.Mock;
    logWarningConsole: jest.Mock;
  };
  ```
- [ ] Remove all `jest.requireMock('../../utils/consoleLogger')` calls from individual test cases (~29 occurrences across lines 161-3106). Use search-and-replace to find all `const { log...Console } = jest.requireMock(` patterns.
- [ ] Run tests: `./node_modules/.bin/nx test packmind-cli --testFile=apps/cli/src/infra/commands/playbook/submitHandler.spec.ts` — confirm all green
- [ ] Lint: `./node_modules/.bin/nx lint packmind-cli`
- [ ] Commit: `git commit -m "refactor(cli): extract jest.requireMock console logger to describe level"`

### Task 8: Add E2E test for in-place update flow

**Files:**
- Modify: `apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts`

**Acceptance criteria:**
- [ ] New describe block tests the update flow: create → install → modify → add → submit --no-review → verify updated
- [ ] Test asserts exit code 0, "1 standard updated" in stdout, and server-side content change

**Prerequisite:** Add `readFile` to the imports from `'../helpers'` if not already present. Before implementing, review `apps/cli-e2e-tests/src/install.spec.ts` and `apps/cli-e2e-tests/src/helpers/gateways/PackageGateway.ts` to understand the full create-package-then-install pattern. Also review `StandardGateway.ts` for the `create` response shape (to get the standard ID).

**Steps:**
- [ ] Add new describe block after the existing `'when creating now artefacts'` block:
  ```typescript
  describe('when updating an existing artifact using playbook submit --no-review', () => {
    let playbookSubmitResult: RunCliResult;
    let packageSlug: string;

    beforeEach(async () => {
      // 1. Create a standard server-side via gateway and capture its ID
      const createResult = await context.gateway.standards.create({
        name: 'Updatable standard',
        description: 'Original description',
        spaceId: context.space.id,
        rules: [{ content: 'Original rule' }],
      });
      const standardId = createResult.id;

      // 2. Create a package containing the standard
      const packageResult = await context.gateway.packages.create({
        name: 'Test package',
        description: 'For update test',
        spaceId: context.space.id,
        standardIds: [standardId],
        recipeIds: [],
      });

      // 3. Install via CLI — creates lock file + local files
      packageSlug = packageResult.package.slug;
      await context.runCli(`install ${packageSlug}`);

      // 4. Modify the local standard file content
      updateFile(
        '.packmind/standards/updatable-standard.md',
        `# Updatable standard\n\nUpdated description\n\n* Updated rule`,
        context.testDir,
      );

      // 5. Stage and submit
      await context.runCli('playbook add .packmind/standards/updatable-standard.md');
      playbookSubmitResult = await context.runCli('playbook submit --no-review');
    });

    it('succeeds', () => {
      expect(playbookSubmitResult).toEqual({
        returnCode: 0,
        stderr: '',
        stdout: expect.stringMatching('1 standard updated'),
      });
    });

    it('updates the artifact on the server', async () => {
      // Re-install to get the updated content from the server
      const reinstallResult = await context.runCli(`install ${packageSlug}`);
      expect(reinstallResult.returnCode).toBe(0);

      // Read the re-installed file and verify it contains the updated content
      const content = readFile(
        '.packmind/standards/updatable-standard.md',
        context.testDir,
      );
      expect(content).toContain('Updated rule');
    });
  });
  ```
- [ ] Adapt the setup if `standards.create` or `packages.create` response shapes differ from what's shown — check the gateway implementation during implementation
- [ ] Verify the installed file path matches the `playbook add` path (the slug-based path may differ from `updatable-standard.md`)
- [ ] Run E2E tests: `./node_modules/.bin/nx test cli-e2e-tests --testFile=apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts` — confirm green
- [ ] Commit: `git commit -m "test(cli-e2e): add E2E test for in-place update via playbook submit --no-review"`
