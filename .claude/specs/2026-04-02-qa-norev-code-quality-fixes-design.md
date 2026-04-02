# QA No-Review Code Quality Fixes — Design Spec

**Goal:** Fix 6 code findings and 2 coverage gaps from the QA review of `playbook submit --no-review`.
**Scope:** Code quality improvements, CLI UX messaging, and E2E test coverage. Removal support and DTO decorators are explicitly out of scope.

## Architecture

No new domains, packages, or layers. All changes are within existing files:
- `packages/playbook-change-applier/src/ApplyPlaybookUseCase.ts` — type safety fixes
- `packages/playbook-change-applier/src/ApplyPlaybookUseCase.spec.ts` — test ordering fix
- `apps/cli/src/infra/commands/playbook/submitHandler.ts` — UX messaging improvements
- `apps/cli/src/infra/commands/playbook/submitHandler.spec.ts` — mock extraction
- `apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts` — E2E update flow

## Changes

### Finding 3: Remove unsafe `as ChangeProposal` cast
**File:** `packages/playbook-change-applier/src/ApplyPlaybookUseCase.ts:332`
**Change:** Replace `} as ChangeProposal` with `} satisfies ChangeProposal` to get compile-time validation without bypassing type checking.

### Finding 4: Add default case to `getApplierForType`
**File:** `packages/playbook-change-applier/src/ApplyPlaybookUseCase.ts:298-309`
**Change:** Add `default: throw new Error(\`Unsupported item type: \${itemType}\`)` to the switch statement. TypeScript enforces exhaustiveness via the return type, but the explicit default protects against runtime surprises if the union widens.

### Finding 5: Type `collectParts` precisely
**File:** `apps/cli/src/infra/commands/playbook/submitHandler.ts:872-881`
**Change:** Replace `unknown[]` with the actual response shapes. The `created` bucket contains `Array<{ id: string; slug: string }>` and the `updated` bucket contains `string[]`. Type the parameter to reflect this.

### Finding 7: Reorder `afterEach`/`beforeEach`
**File:** `packages/playbook-change-applier/src/ApplyPlaybookUseCase.spec.ts:76-80`
**Change:** Move `afterEach` block to appear after `beforeEach`. Functional no-op, but follows conventional test structure.

### Finding 2 (adapted): Improve batchApply error message
**File:** `apps/cli/src/infra/commands/playbook/submitHandler.ts:855-858`
**Change:** Replace raw error passthrough with user-friendly messaging:
- `"Failed to apply changes: <error.message>"`
- `"Your playbook has not been modified. Fix the issue and retry."`

### Finding 6: Extract `jest.requireMock` references
**File:** `apps/cli/src/infra/commands/playbook/submitHandler.spec.ts`
**Change:** Extract `jest.requireMock('../../utils/consoleLogger')` destructuring to `describe`-level constants instead of repeating inside individual test cases.

### Gap 12: Improve multi-space partial failure UX
**File:** `apps/cli/src/infra/commands/playbook/submitHandler.ts:918-1030`
**Change:**
- Build a `spaceNameById` map from `PlaybookChangeEntry.spaceName` before the loop
- Track `succeededSpaces` and `failedSpaces` arrays per space
- Report per-space results: `"Failed to submit to space 'Frontend': <errors>"`
- On partial success: `"Submitted to: Frontend. Run 'packmind playbook submit' again to retry failed spaces."`
- Fall back to space ID if `spaceName` is missing (legacy entries)

### Gap 13: E2E test for in-place updates
**File:** `apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts`
**Change:** Add a new `describe('when updating an existing artifact')` block:
1. Create a standard server-side via gateway
2. Install it locally (creates lock file + local files)
3. Modify the local standard file
4. `playbook add <path>`
5. `playbook submit --no-review`
6. Assert exit code 0 and stdout matches "1 standard updated"
7. Assert server-side standard reflects updated content

## Testing Approach

- **Finding 3, 4:** Existing tests cover behavior; changes are compile-time only. Run `nx test playbook-change-applier` to confirm no regression.
- **Finding 5, 7:** No behavior change. Run `nx test playbook-change-applier` and `nx test packmind-cli`.
- **Finding 2 (adapted):** Update existing `submitHandler.spec.ts` tests for the `--no-review` error path to assert new message format.
- **Finding 6:** Refactor only — existing assertions remain identical, just mock extraction changes.
- **Gap 12:** Add unit tests for the per-space reporting in `submitHandler.spec.ts`.
- **Gap 13:** New E2E test — requires running against a live API instance.

## Out of Scope

- Removal type support in `ApplyPlaybookUseCase` (UNSUPPORTED_TYPES unchanged)
- class-validator decorators on `ApplyPlaybookBody` DTO
- True cross-space transactionality for the `batchCreate` path
- `removed` counts in success message (depends on removal support)
