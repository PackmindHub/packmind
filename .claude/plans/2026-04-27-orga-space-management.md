# Organization Spaces Management Page Implementation Plan

> **For agentic execution:** Use `qlb:architect-executor` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `/org/{orgSlug}/settings/spaces` to a new dedicated, paginated, org-admin-only listing endpoint with aggregated admins/member-count/artifact-count; remove bulk-delete UI; add a delete confirmation flow.

**Architecture:** New backend use case `ListOrganizationSpacesForManagementUseCase` (extends `AbstractAdminUseCase`) in `packages/spaces-management`, exposed via `SpacesManagementController` at `GET /organizations/:orgId/spaces-management/listing?page=N`. Aggregations come via four new port methods (`ISpacesPort.findOrgPagePaginated`, `ISpacesPort` admin/member queries, and `countBySpaceIds` on `IStandardsPort`/`IRecipesPort`/`ISkillsPort`), executed in parallel via `Promise.all`. Frontend swaps in a new TanStack query for the management page only; existing `useGetSpacesQuery` (sidebar/pickers) is untouched.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, React Router v7, TanStack Query v5, Chakra UI v3, Jest, Playwright.

**Source Spec:** `.claude/specs/2026-04-27-orga-space-management-design.md`
**EM Spec:** `specs/orga-space-management.md`
**Docs consulted:**
- `apps/CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/frontend/CLAUDE.md`, `packages/CLAUDE.md`
- `apps/frontend/.claude/rules/packmind/standard-frontend-data-flow.md`
- `packages/.claude/rules/packmind/standard-use-case-architecture-patterns.md`
- `packages/.claude/rules/packmind/standard-port-adapter-cross-domain-integration.md`
- `.claude/rules/packmind/standard-back-end-typescript-clean-code-practices.md`
- `.claude/rules/packmind/standard-typescript-good-practices.md`
- `.claude/rules/packmind/standard-compliance-logging-personal-information.md`

**User Stories / Acceptance Criteria** (from EM spec, authoritative):
- Rule 1: Eligible users can access the spaces management page from the organization settings.
- Rule 2: The page displays organization spaces in a paginated table sourced from a dedicated listing endpoint (page size 8; default org-wide first then `createdAt` ASC; columns Name/Admins/Members/Artifacts/Created with the exact rendering rules in the spec).
- Rule 3 (E2E): Eligible users can create a new space from the management page and remain on the page (dialog closes, query invalidated, new space appears).
- Rule 4 (E2E): A space can be deleted from a row action with a confirmation modal (`Delete space '{name}'? This action is irreversible.`); default org-wide space hides Delete.
- Rule 5: View action navigates to `/org/{orgSlug}/spaces/{spaceSlug}`.

---

## Backend

### Task 1: Define use case contract types in `@packmind/types`

**Files:**
- Create: `packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts`
- Modify: `packages/types/src/spaces-management/contracts/index.ts` (add export line)

- [ ] **Step 1: Write the failing test**

This file is a pure type-export module — there is no behavior to unit-test. The "failing" signal is type-checking and the downstream tasks. Create a tiny smoke test asserting the exports compile.

Create: `packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.spec.ts`

```typescript
import {
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
  IListOrganizationSpacesForManagementUseCase,
  SpaceManagementListItem,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
} from './IListOrganizationSpacesForManagementUseCase';

describe('IListOrganizationSpacesForManagementUseCase contract', () => {
  it('exports a Command type, Response type, and IUseCase interface', () => {
    type _Cmd = ListOrganizationSpacesForManagementCommand;
    type _Resp = ListOrganizationSpacesForManagementResponse;
    type _UC = IListOrganizationSpacesForManagementUseCase;
    type _Item = SpaceManagementListItem;
    expect(ORGA_SPACE_MANAGEMENT_PAGE_SIZE).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test types --testFile=IListOrganizationSpacesForManagementUseCase.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create the contract file:

```typescript
// packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts
import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../../spaces/Space';
import { UserId } from '../../accounts/User';

export const ORGA_SPACE_MANAGEMENT_PAGE_SIZE = 8;

export type SpaceManagementListItemAdmin = {
  id: UserId;
  displayName: string;
};

export type SpaceManagementListItem = Space & {
  admins: SpaceManagementListItemAdmin[];
  membersCount: number;
  artifactsCount: number;
};

export type ListOrganizationSpacesForManagementCommand = PackmindCommand & {
  page: number;
};

export type ListOrganizationSpacesForManagementResponse = {
  items: SpaceManagementListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type IListOrganizationSpacesForManagementUseCase = IUseCase<
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse
>;
```

If `UserId` is not exported from `../../accounts/User`, locate the actual export path (grep `export.*UserId` under `packages/types/src/`) and use it.

If the project's `User` entity exposes a different "display name" field (e.g. `name`, `username`, `email`-fallback, or a computed concatenation), the contract still uses `displayName: string` as the presentation field — Task 5 (admins query) will resolve which User column maps onto `displayName`.

Then add the export to the barrel:

```typescript
// packages/types/src/spaces-management/contracts/index.ts (add line)
export * from './IListOrganizationSpacesForManagementUseCase';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test types --testFile=IListOrganizationSpacesForManagementUseCase.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint and typecheck**

Run: `./node_modules/.bin/nx lint types` and `./node_modules/.bin/nx typecheck types` (if a typecheck target exists; otherwise rely on lint + downstream builds).
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.ts \
        packages/types/src/spaces-management/contracts/IListOrganizationSpacesForManagementUseCase.spec.ts \
        packages/types/src/spaces-management/contracts/index.ts
git commit -m ":sparkles: feat(types): add ListOrganizationSpacesForManagement use case contract"
```

---

### Task 2: Add `InvalidPageError`

**Files:**
- Create: `packages/spaces-management/src/domain/errors/InvalidPageError.ts`
- Create: `packages/spaces-management/src/domain/errors/InvalidPageError.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/spaces-management/src/domain/errors/InvalidPageError.spec.ts
import { InvalidPageError } from './InvalidPageError';

describe('InvalidPageError', () => {
  it('is an Error subclass with the right name and message', () => {
    const err = new InvalidPageError(0);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidPageError');
    expect(err.message).toContain('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test spaces-management --testFile=InvalidPageError.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Mirror the pattern of `CannotDeleteDefaultSpaceError`:

```typescript
// packages/spaces-management/src/domain/errors/InvalidPageError.ts
export class InvalidPageError extends Error {
  constructor(page: unknown) {
    super(`Invalid page value: ${String(page)}. Page must be a positive integer.`);
    this.name = 'InvalidPageError';
  }
}
```

Do not use `Object.setPrototypeOf` (per `standard-typescript-good-practices`).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test spaces-management --testFile=InvalidPageError.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/domain/errors/InvalidPageError.ts \
        packages/spaces-management/src/domain/errors/InvalidPageError.spec.ts
git commit -m ":sparkles: feat(spaces-management): add InvalidPageError for paginated listing"
```

---

### Task 3: Verify (and add if missing) `space_id` indexes

**Files:**
- Inspect (read-only): all migration files under `packages/migrations/src/migrations/` (or wherever migrations live).
- Conditionally create: a new migration file following `standard-typeorm-migrations` if any of the four indexes is missing.

- [ ] **Step 1: Locate migrations directory and grep for existing `space_id` index creations**

Run:
```bash
find packages -path '*/migrations/*' -name '*.ts' -not -path '*/node_modules/*' | head -5
```

Then for each of the four target tables (`user_space_memberships`, `standards`, `recipes`, `skills`), grep for an `IDX` or `INDEX` on `space_id`:
```bash
grep -rn "space_id" packages/migrations/src/migrations/ | grep -i "index\|idx"
```

- [ ] **Step 2: Inventory which indexes already exist**

For each table, confirm:
- `user_space_memberships(space_id)` indexed?
- `standards(space_id)` indexed?
- `recipes(space_id)` indexed?
- `skills(space_id)` indexed?

If a table uses a composite index that already covers `space_id` as the leading column, count it as covered.

- [ ] **Step 3: If any are missing, write a TypeORM migration**

Follow `standard-typeorm-migrations` (use `PackmindLogger`, shared column helpers if relevant, and a working `down()` method that drops only the indexes this migration created). Migration naming: `<timestamp>-AddSpaceIdIndexesForManagementListing.ts`.

Use the existing migration file as a template: `find packages/migrations/src/migrations -type f -name "*.ts" | sort | tail -1` and copy its skeleton.

The migration's `up()` adds the missing indexes; `down()` drops only those it added. Use `IF NOT EXISTS` / `IF EXISTS` in the SQL or check `queryRunner.hasIndex()` to make the migration safe under partial prior state.

- [ ] **Step 4: If a migration was added, run it locally and verify**

Run the migration runner the project uses (e.g. `npm run migrate` or `./node_modules/.bin/nx run api:migrate`). Expected: applied without errors.

If no migration was needed, skip this step.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint migrations` (or whichever Nx project owns migrations).
Expected: no errors.

- [ ] **Step 6: Commit**

If a migration was added:
```bash
git add packages/migrations/src/migrations/<new-file>.ts
git commit -m ":wrench: chore(migrations): add space_id indexes for management listing aggregations"
```

If no migration was needed, write a one-line note in the task report and skip the commit.

---

### Task 4: Add `findOrgPagePaginated` to `ISpacesPort` + `SpaceRepository`

**Files:**
- Modify: `packages/types/src/spaces/ports/ISpacesPort.ts` (add method signature)
- Modify: `packages/spaces/src/infra/repositories/SpaceRepository.ts` (add implementation)
- Modify: `packages/spaces/src/application/adapters/SpacesAdapter.ts` (delegate to repository)
- Test: `packages/spaces/src/infra/repositories/SpaceRepository.spec.ts` (add cases)

- [ ] **Step 1: Write the failing test**

Append to `SpaceRepository.spec.ts` (follow `repository-implementation-and-testing-pattern` — real DB via `test-utils` factories, no mocks):

```typescript
describe('findOrgPagePaginated', () => {
  it('returns the page of spaces ordered by isDefaultSpace DESC then createdAt ASC, plus totalCount', async () => {
    const org = await createOrganizationFactory(); // existing factory
    const defaultSpace = await createSpaceFactory({ organizationId: org.id, isDefaultSpace: true });
    const oldest = await createSpaceFactory({ organizationId: org.id, createdAt: new Date('2025-01-01') });
    const middle = await createSpaceFactory({ organizationId: org.id, createdAt: new Date('2025-02-01') });
    const newest = await createSpaceFactory({ organizationId: org.id, createdAt: new Date('2025-03-01') });

    const result = await repo.findOrgPagePaginated(org.id, 1, 8);

    expect(result.totalCount).toBe(4);
    expect(result.items.map((s) => s.id)).toEqual([defaultSpace.id, oldest.id, middle.id, newest.id]);
  });

  it('respects pagination offsets', async () => {
    const org = await createOrganizationFactory();
    for (let i = 0; i < 10; i++) {
      await createSpaceFactory({ organizationId: org.id });
    }
    const page1 = await repo.findOrgPagePaginated(org.id, 1, 4);
    const page2 = await repo.findOrgPagePaginated(org.id, 2, 4);
    expect(page1.items.length).toBe(4);
    expect(page2.items.length).toBe(4);
    expect(new Set([...page1.items, ...page2.items].map((s) => s.id)).size).toBe(8);
    expect(page1.totalCount).toBe(10);
    expect(page2.totalCount).toBe(10);
  });

  it('returns empty items but accurate totalCount when page is past last', async () => {
    const org = await createOrganizationFactory();
    await createSpaceFactory({ organizationId: org.id });
    const result = await repo.findOrgPagePaginated(org.id, 99, 8);
    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(1);
  });
});
```

If the existing factory names differ (e.g. `spaceFactory()`), use whatever name is already imported in the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test spaces --testFile=SpaceRepository.spec.ts`
Expected: FAIL — `repo.findOrgPagePaginated is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `SpaceRepository.ts`:

```typescript
async findOrgPagePaginated(
  organizationId: OrganizationId,
  page: number,
  pageSize: number,
): Promise<{ items: Space[]; totalCount: number }> {
  const skip = (page - 1) * pageSize;
  const [items, totalCount] = await this.repository.findAndCount({
    where: { organizationId, deletedAt: IsNull() }, // mirror existing soft-delete handling
    order: { isDefaultSpace: 'DESC', createdAt: 'ASC' },
    skip,
    take: pageSize,
  });
  return { items: items.map((row) => this.toDomain(row)), totalCount };
}
```

If `this.toDomain` is named differently (e.g. `mapToEntity`), use the same conversion helper used by other methods in this file. If soft-delete is handled via a different mechanism (TypeORM `@DeleteDateColumn` + `softDelete`), drop the explicit `deletedAt: IsNull()` because it's automatic.

Add the matching method signature to `ISpacesPort`:

```typescript
// packages/types/src/spaces/ports/ISpacesPort.ts (add inside the interface)
findOrgPagePaginated(
  organizationId: OrganizationId,
  page: number,
  pageSize: number,
): Promise<{ items: Space[]; totalCount: number }>;
```

Implement it in `SpacesAdapter` by delegating to the spaces service or repository:

```typescript
// packages/spaces/src/application/adapters/SpacesAdapter.ts
async findOrgPagePaginated(
  organizationId: OrganizationId,
  page: number,
  pageSize: number,
) {
  return this.spaceRepository.findOrgPagePaginated(organizationId, page, pageSize);
}
```

If `SpacesAdapter` accesses repos via a service, route through that service (mirror how `listSpacesByOrganization` is wired today).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test spaces --testFile=SpaceRepository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/spaces/ports/ISpacesPort.ts \
        packages/spaces/src/infra/repositories/SpaceRepository.ts \
        packages/spaces/src/infra/repositories/SpaceRepository.spec.ts \
        packages/spaces/src/application/adapters/SpacesAdapter.ts
git commit -m ":sparkles: feat(spaces): add findOrgPagePaginated for management listing"
```

---

### Task 5: Add `findAdminsForSpaceIds` and `countByRoleForSpaceIds` to `ISpacesPort` + `UserSpaceMembershipRepository`

**Files:**
- Modify: `packages/types/src/spaces/ports/ISpacesPort.ts`
- Modify: `packages/spaces/src/infra/repositories/UserSpaceMembershipRepository.ts`
- Modify: `packages/spaces/src/application/adapters/SpacesAdapter.ts`
- Test: `packages/spaces/src/infra/repositories/UserSpaceMembershipRepository.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `UserSpaceMembershipRepository.spec.ts`:

```typescript
describe('findAdminsForSpaceIds', () => {
  it('returns admins (role=admin) joined with User per space, with id and displayName', async () => {
    const org = await createOrganizationFactory();
    const spaceA = await createSpaceFactory({ organizationId: org.id });
    const spaceB = await createSpaceFactory({ organizationId: org.id });
    const adminA = await createUserFactory({ organizationId: org.id });
    const adminB1 = await createUserFactory({ organizationId: org.id });
    const adminB2 = await createUserFactory({ organizationId: org.id });
    const memberB = await createUserFactory({ organizationId: org.id });

    await createUserSpaceMembershipFactory({ userId: adminA.id, spaceId: spaceA.id, role: 'admin' });
    await createUserSpaceMembershipFactory({ userId: adminB1.id, spaceId: spaceB.id, role: 'admin' });
    await createUserSpaceMembershipFactory({ userId: adminB2.id, spaceId: spaceB.id, role: 'admin' });
    await createUserSpaceMembershipFactory({ userId: memberB.id, spaceId: spaceB.id, role: 'member' });

    const rows = await repo.findAdminsForSpaceIds([spaceA.id, spaceB.id]);

    const bySpace = new Map<string, Array<{ id: string; displayName: string }>>();
    rows.forEach((r) => {
      const list = bySpace.get(r.spaceId) ?? [];
      list.push(r.user);
      bySpace.set(r.spaceId, list);
    });

    expect(bySpace.get(spaceA.id)).toHaveLength(1);
    expect(bySpace.get(spaceB.id)).toHaveLength(2);
    expect(rows.every((r) => typeof r.user.displayName === 'string')).toBe(true);
  });

  it('returns empty array when given empty input', async () => {
    expect(await repo.findAdminsForSpaceIds([])).toEqual([]);
  });
});

describe('countByRoleForSpaceIds', () => {
  it('returns a Map of spaceId -> count for the given role; missing spaces are absent', async () => {
    const org = await createOrganizationFactory();
    const spaceA = await createSpaceFactory({ organizationId: org.id });
    const spaceB = await createSpaceFactory({ organizationId: org.id });
    const u1 = await createUserFactory({ organizationId: org.id });
    const u2 = await createUserFactory({ organizationId: org.id });

    await createUserSpaceMembershipFactory({ userId: u1.id, spaceId: spaceA.id, role: 'member' });
    await createUserSpaceMembershipFactory({ userId: u2.id, spaceId: spaceA.id, role: 'member' });
    await createUserSpaceMembershipFactory({ userId: u1.id, spaceId: spaceB.id, role: 'admin' });

    const counts = await repo.countByRoleForSpaceIds([spaceA.id, spaceB.id], 'member');
    expect(counts.get(spaceA.id)).toBe(2);
    expect(counts.has(spaceB.id)).toBe(false);
  });

  it('returns empty Map for empty input', async () => {
    const counts = await repo.countByRoleForSpaceIds([], 'member');
    expect(counts.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces --testFile=UserSpaceMembershipRepository.spec.ts`
Expected: FAIL — methods missing.

- [ ] **Step 3: Write minimal implementation**

In `UserSpaceMembershipRepository.ts`:

```typescript
async findAdminsForSpaceIds(
  spaceIds: SpaceId[],
): Promise<Array<{ spaceId: SpaceId; user: { id: UserId; displayName: string } }>> {
  if (spaceIds.length === 0) return [];
  const rows = await this.repository
    .createQueryBuilder('m')
    .innerJoin('users', 'u', 'u.id = m.user_id')
    .select(['m.space_id AS "spaceId"', 'u.id AS "userId"', /* displayName column */ ])
    .where('m.space_id IN (:...spaceIds)', { spaceIds })
    .andWhere('m.role = :role', { role: 'admin' })
    // honor soft-delete if present:
    .andWhere('m.deleted_at IS NULL')
    .getRawMany();

  return rows.map((r) => ({
    spaceId: r.spaceId as SpaceId,
    user: { id: r.userId as UserId, displayName: deriveDisplayName(r) },
  }));
}

async countByRoleForSpaceIds(
  spaceIds: SpaceId[],
  role: 'admin' | 'member',
): Promise<Map<SpaceId, number>> {
  if (spaceIds.length === 0) return new Map();
  const rows = await this.repository
    .createQueryBuilder('m')
    .select('m.space_id', 'spaceId')
    .addSelect('COUNT(*)', 'count')
    .where('m.space_id IN (:...spaceIds)', { spaceIds })
    .andWhere('m.role = :role', { role })
    .andWhere('m.deleted_at IS NULL')
    .groupBy('m.space_id')
    .getRawMany();
  return new Map(rows.map((r) => [r.spaceId as SpaceId, Number(r.count)]));
}
```

`deriveDisplayName(r)` is a small local helper that returns the existing User entity's display field (look at `users` schema columns — likely `name`, `username`, or first+last). Pick the column actually used elsewhere in the codebase for the same concept (search `displayName` and `name` references on the user entity to confirm). If the project uses `email` as the only stable identifier, use the part before `@` to avoid leaking PII per `standard-compliance-logging-personal-information` (note: this method's output is NOT logged, but principle of minimal exposure still applies).

Add to `ISpacesPort`:

```typescript
findAdminsForSpaceIds(spaceIds: SpaceId[]): Promise<Array<{ spaceId: SpaceId; user: { id: UserId; displayName: string } }>>;
countByRoleForSpaceIds(spaceIds: SpaceId[], role: 'admin' | 'member'): Promise<Map<SpaceId, number>>;
```

Wire both through `SpacesAdapter` (delegating to the membership repository).

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces --testFile=UserSpaceMembershipRepository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/spaces/ports/ISpacesPort.ts \
        packages/spaces/src/infra/repositories/UserSpaceMembershipRepository.ts \
        packages/spaces/src/infra/repositories/UserSpaceMembershipRepository.spec.ts \
        packages/spaces/src/application/adapters/SpacesAdapter.ts
git commit -m ":sparkles: feat(spaces): add admin and role-count aggregations for management listing"
```

---

### Task 6: Add `countBySpaceIds` to `IStandardsPort` + `StandardRepository`

**Files:**
- Modify: `packages/types/src/standards/ports/IStandardsPort.ts`
- Modify: `packages/standards/src/infra/repositories/StandardRepository.ts`
- Modify: `packages/standards/src/application/adapters/StandardsAdapter.ts` (or equivalent)
- Test: `packages/standards/src/infra/repositories/StandardRepository.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe('countBySpaceIds', () => {
  it('returns a Map of spaceId -> count, omitting spaces with zero standards', async () => {
    const org = await createOrganizationFactory();
    const spaceA = await createSpaceFactory({ organizationId: org.id });
    const spaceB = await createSpaceFactory({ organizationId: org.id });
    const spaceC = await createSpaceFactory({ organizationId: org.id });
    await createStandardFactory({ spaceId: spaceA.id });
    await createStandardFactory({ spaceId: spaceA.id });
    await createStandardFactory({ spaceId: spaceB.id });

    const counts = await repo.countBySpaceIds([spaceA.id, spaceB.id, spaceC.id]);

    expect(counts.get(spaceA.id)).toBe(2);
    expect(counts.get(spaceB.id)).toBe(1);
    expect(counts.has(spaceC.id)).toBe(false);
  });

  it('returns empty Map for empty input', async () => {
    expect((await repo.countBySpaceIds([])).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test standards --testFile=StandardRepository.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/standards/src/infra/repositories/StandardRepository.ts
async countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
  if (spaceIds.length === 0) return new Map();
  const rows = await this.repository
    .createQueryBuilder('s')
    .select('s.space_id', 'spaceId')
    .addSelect('COUNT(*)', 'count')
    .where('s.space_id IN (:...spaceIds)', { spaceIds })
    .andWhere('s.deleted_at IS NULL') // honor soft-delete if applicable
    .groupBy('s.space_id')
    .getRawMany();
  return new Map(rows.map((r) => [r.spaceId as SpaceId, Number(r.count)]));
}
```

If the standards entity uses TypeORM's automatic soft-delete (via `@DeleteDateColumn`), the `deleted_at IS NULL` filter is unnecessary because TypeORM applies it automatically. Match the convention used by other methods in this repo.

Add the port method:

```typescript
// packages/types/src/standards/ports/IStandardsPort.ts (inside the interface)
countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;
```

Wire it through `StandardsAdapter` (or whatever the adapter file is named — find it under `packages/standards/src/application/adapters/`).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test standards --testFile=StandardRepository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint standards && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/standards/ports/IStandardsPort.ts \
        packages/standards/src/infra/repositories/StandardRepository.ts \
        packages/standards/src/infra/repositories/StandardRepository.spec.ts \
        packages/standards/src/application/adapters/<adapter-file>.ts
git commit -m ":sparkles: feat(standards): add countBySpaceIds for management listing aggregation"
```

---

### Task 7: Add `countBySpaceIds` to `IRecipesPort` + `RecipeRepository`

**Files:**
- Modify: `packages/types/src/recipes/ports/IRecipesPort.ts`
- Modify: `packages/recipes/src/infra/repositories/RecipeRepository.ts`
- Modify: `packages/recipes/src/application/adapters/<adapter-file>.ts`
- Test: `packages/recipes/src/infra/repositories/RecipeRepository.spec.ts`

- [ ] **Step 1: Write the failing test**

Mirror Task 6's test, but with `createRecipeFactory` and the recipes repo. Same shape, same assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test recipes --testFile=RecipeRepository.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Same shape as Task 6, swapping the entity name in the query builder:

```typescript
async countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
  if (spaceIds.length === 0) return new Map();
  const rows = await this.repository
    .createQueryBuilder('r')
    .select('r.space_id', 'spaceId')
    .addSelect('COUNT(*)', 'count')
    .where('r.space_id IN (:...spaceIds)', { spaceIds })
    .andWhere('r.deleted_at IS NULL')
    .groupBy('r.space_id')
    .getRawMany();
  return new Map(rows.map((r) => [r.spaceId as SpaceId, Number(r.count)]));
}
```

Add the port method to `IRecipesPort` and wire through the recipes adapter.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test recipes --testFile=RecipeRepository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint recipes && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/recipes/ports/IRecipesPort.ts \
        packages/recipes/src/infra/repositories/RecipeRepository.ts \
        packages/recipes/src/infra/repositories/RecipeRepository.spec.ts \
        packages/recipes/src/application/adapters/<adapter-file>.ts
git commit -m ":sparkles: feat(recipes): add countBySpaceIds for management listing aggregation"
```

---

### Task 8: Add `countBySpaceIds` to `ISkillsPort` + `SkillRepository`

**Files:**
- Modify: `packages/types/src/skills/ports/ISkillsPort.ts`
- Modify: `packages/skills/src/infra/repositories/SkillRepository.ts`
- Modify: `packages/skills/src/application/adapters/<adapter-file>.ts`
- Test: `packages/skills/src/infra/repositories/SkillRepository.spec.ts`

- [ ] **Step 1: Write the failing test**

Mirror Task 6, with `createSkillFactory` and the skills repo.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test skills --testFile=SkillRepository.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Same as Task 7, with skills entity. Add port method to `ISkillsPort` and wire through the skills adapter.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test skills --testFile=SkillRepository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint skills && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/skills/ports/ISkillsPort.ts \
        packages/skills/src/infra/repositories/SkillRepository.ts \
        packages/skills/src/infra/repositories/SkillRepository.spec.ts \
        packages/skills/src/application/adapters/<adapter-file>.ts
git commit -m ":sparkles: feat(skills): add countBySpaceIds for management listing aggregation"
```

---

### Task 9: Implement `ListOrganizationSpacesForManagementUseCase`

**Files:**
- Create: `packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.ts`
- Create: `packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.spec.ts
import {
  ListOrganizationSpacesForManagementCommand,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
  Space,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { ListOrganizationSpacesForManagementUseCase } from './ListOrganizationSpacesForManagementUseCase';
import { InvalidPageError } from '../../domain/errors/InvalidPageError';
// import { OrganizationAdminRequiredError } from '@packmind/node-utils';

const orgId = createOrganizationId('org-1');
const userId = createUserId('user-1');

function makeSpace(over: Partial<Space> = {}): Space {
  return {
    id: createSpaceId('s' + Math.random()),
    name: 'Space',
    slug: 'space',
    organizationId: orgId,
    isDefaultSpace: false,
    type: 'open',
    createdAt: new Date('2025-01-01'),
    ...over,
  } as Space;
}

describe('ListOrganizationSpacesForManagementUseCase', () => {
  let accountsPort: any; // jest mock conforming to IAccountsPort
  let spacesPort: any;
  let standardsPort: any;
  let recipesPort: any;
  let skillsPort: any;
  let useCase: ListOrganizationSpacesForManagementUseCase;

  beforeEach(() => {
    // Build a member context that says role='admin' so AbstractAdminUseCase passes.
    accountsPort = mockAccountsPortWithAdminMembership({ userId, organizationId: orgId });
    spacesPort = {
      findOrgPagePaginated: jest.fn(),
      findAdminsForSpaceIds: jest.fn().mockResolvedValue([]),
      countByRoleForSpaceIds: jest.fn().mockResolvedValue(new Map()),
    };
    standardsPort = { countBySpaceIds: jest.fn().mockResolvedValue(new Map()) };
    recipesPort = { countBySpaceIds: jest.fn().mockResolvedValue(new Map()) };
    skillsPort = { countBySpaceIds: jest.fn().mockResolvedValue(new Map()) };

    useCase = new ListOrganizationSpacesForManagementUseCase(
      accountsPort, spacesPort, standardsPort, recipesPort, skillsPort,
    );
  });

  it('throws InvalidPageError when page < 1', async () => {
    await expect(
      useCase.execute({ userId, organizationId: orgId, page: 0 }),
    ).rejects.toThrow(InvalidPageError);
  });

  it('throws InvalidPageError when page is not an integer', async () => {
    await expect(
      useCase.execute({ userId, organizationId: orgId, page: 1.5 }),
    ).rejects.toThrow(InvalidPageError);
  });

  it('rejects non-admin callers via AbstractAdminUseCase', async () => {
    accountsPort = mockAccountsPortWithMemberMembership({ userId, organizationId: orgId });
    useCase = new ListOrganizationSpacesForManagementUseCase(
      accountsPort, spacesPort, standardsPort, recipesPort, skillsPort,
    );
    spacesPort.findOrgPagePaginated.mockResolvedValue({ items: [], totalCount: 0 });

    await expect(
      useCase.execute({ userId, organizationId: orgId, page: 1 }),
    ).rejects.toThrow(/admin/i);
  });

  it('returns empty items but real totalCount when page is past last', async () => {
    spacesPort.findOrgPagePaginated.mockResolvedValue({ items: [], totalCount: 32 });
    const result = await useCase.execute({ userId, organizationId: orgId, page: 99 });
    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(32);
    expect(result.page).toBe(99);
    expect(result.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
  });

  it('stitches admins, member counts, and artifact counts per space; defaults missing entries to 0', async () => {
    const s1 = makeSpace({ id: createSpaceId('s1'), isDefaultSpace: true });
    const s2 = makeSpace({ id: createSpaceId('s2') });
    spacesPort.findOrgPagePaginated.mockResolvedValue({ items: [s1, s2], totalCount: 2 });
    spacesPort.findAdminsForSpaceIds.mockResolvedValue([
      { spaceId: s1.id, user: { id: createUserId('u1'), displayName: 'Alice' } },
      { spaceId: s2.id, user: { id: createUserId('u2'), displayName: 'Bob' } },
      { spaceId: s2.id, user: { id: createUserId('u3'), displayName: 'Carol' } },
    ]);
    spacesPort.countByRoleForSpaceIds.mockResolvedValue(new Map([[s2.id, 7]])); // s1 missing
    standardsPort.countBySpaceIds.mockResolvedValue(new Map([[s1.id, 4]]));
    recipesPort.countBySpaceIds.mockResolvedValue(new Map([[s2.id, 3]]));
    skillsPort.countBySpaceIds.mockResolvedValue(new Map());

    const result = await useCase.execute({ userId, organizationId: orgId, page: 1 });

    expect(result.items[0].id).toBe(s1.id);
    expect(result.items[0].admins.map((a) => a.displayName)).toEqual(['Alice']);
    expect(result.items[0].membersCount).toBe(0);
    expect(result.items[0].artifactsCount).toBe(4); // 4+0+0
    expect(result.items[1].id).toBe(s2.id);
    expect(result.items[1].admins.map((a) => a.displayName).sort()).toEqual(['Bob', 'Carol']);
    expect(result.items[1].membersCount).toBe(7);
    expect(result.items[1].artifactsCount).toBe(3); // 0+3+0
  });

  it('passes spaceIds as the queried set to all aggregation ports', async () => {
    const s1 = makeSpace({ id: createSpaceId('s1') });
    spacesPort.findOrgPagePaginated.mockResolvedValue({ items: [s1], totalCount: 1 });

    await useCase.execute({ userId, organizationId: orgId, page: 1 });

    expect(spacesPort.findAdminsForSpaceIds).toHaveBeenCalledWith([s1.id]);
    expect(spacesPort.countByRoleForSpaceIds).toHaveBeenCalledWith([s1.id], 'member');
    expect(standardsPort.countBySpaceIds).toHaveBeenCalledWith([s1.id]);
    expect(recipesPort.countBySpaceIds).toHaveBeenCalledWith([s1.id]);
    expect(skillsPort.countBySpaceIds).toHaveBeenCalledWith([s1.id]);
  });
});
```

The helpers `mockAccountsPortWithAdminMembership` / `mockAccountsPortWithMemberMembership` should mirror however other use case tests in this package mock the accounts port (look at `BrowseSpacesUseCase.spec.ts` or `DeleteSpaceUseCase.spec.ts` for the canonical mock setup).

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces-management --testFile=ListOrganizationSpacesForManagementUseCase.spec.ts`
Expected: FAIL — class missing.

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.ts
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
  SpaceId,
  SpaceManagementListItem,
  SpaceManagementListItemAdmin,
} from '@packmind/types';
import { InvalidPageError } from '../../domain/errors/InvalidPageError';

const origin = 'ListOrganizationSpacesForManagementUseCase';

export class ListOrganizationSpacesForManagementUseCase extends AbstractAdminUseCase<
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: ListOrganizationSpacesForManagementCommand & AdminContext,
  ): Promise<ListOrganizationSpacesForManagementResponse> {
    const { organizationId, page } = command;

    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidPageError(page);
    }

    const { items: spaces, totalCount } = await this.spacesPort.findOrgPagePaginated(
      organizationId,
      page,
      ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
    );

    if (spaces.length === 0) {
      return { items: [], totalCount, page, pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE };
    }

    const spaceIds = spaces.map((s) => s.id);

    const [adminRows, memberCounts, standardsCounts, recipesCounts, skillsCounts] =
      await Promise.all([
        this.spacesPort.findAdminsForSpaceIds(spaceIds),
        this.spacesPort.countByRoleForSpaceIds(spaceIds, 'member'),
        this.standardsPort.countBySpaceIds(spaceIds),
        this.recipesPort.countBySpaceIds(spaceIds),
        this.skillsPort.countBySpaceIds(spaceIds),
      ]);

    const adminsBySpace = new Map<SpaceId, SpaceManagementListItemAdmin[]>();
    for (const row of adminRows) {
      const list = adminsBySpace.get(row.spaceId) ?? [];
      list.push({ id: row.user.id, displayName: row.user.displayName });
      adminsBySpace.set(row.spaceId, list);
    }

    const items: SpaceManagementListItem[] = spaces.map((space) => ({
      ...space,
      admins: adminsBySpace.get(space.id) ?? [],
      membersCount: memberCounts.get(space.id) ?? 0,
      artifactsCount:
        (standardsCounts.get(space.id) ?? 0) +
        (recipesCounts.get(space.id) ?? 0) +
        (skillsCounts.get(space.id) ?? 0),
    }));

    this.logger.info('Listed organization spaces for management', {
      organizationId,
      page,
      itemsCount: items.length,
      totalCount,
    });

    return { items, totalCount, page, pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces-management --testFile=ListOrganizationSpacesForManagementUseCase.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.ts \
        packages/spaces-management/src/application/usecases/ListOrganizationSpacesForManagementUseCase.spec.ts
git commit -m ":sparkles: feat(spaces-management): add ListOrganizationSpacesForManagement use case"
```

---

### Task 10: Wire use case into `SpacesManagementAdapter` + extend `ISpacesManagementPort`

**Files:**
- Modify: `packages/types/src/spaces-management/ports/ISpacesManagementPort.ts`
- Modify: `packages/spaces-management/src/application/adapters/SpacesManagementAdapter.ts`

- [ ] **Step 1: Write the failing test**

Append to whichever spec already covers the adapter (search for `SpacesManagementAdapter.spec.ts`; if it doesn't exist, create one mirroring an adjacent adapter test):

```typescript
describe('SpacesManagementAdapter.listOrganizationSpacesForManagement', () => {
  it('instantiates ListOrganizationSpacesForManagementUseCase with the configured ports and returns its response', async () => {
    const adapter = new SpacesManagementAdapter();
    await adapter.initialize({
      [IAccountsPortName]: accountsPort,
      [ISpacesPortName]: spacesPort,
      [IStandardsPortName]: standardsPort,
      [IRecipesPortName]: recipesPort,
      [ISkillsPortName]: skillsPort,
      eventEmitterService,
    });
    spacesPort.findOrgPagePaginated.mockResolvedValue({ items: [], totalCount: 0 });

    const result = await adapter.listOrganizationSpacesForManagement({
      userId: createUserId('u'),
      organizationId: createOrganizationId('o'),
      page: 1,
    });

    expect(result).toEqual({ items: [], totalCount: 0, page: 1, pageSize: 8 });
  });
});
```

If no adapter spec file exists, fall back to writing a thin smoke test like the one above in a new file.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test spaces-management`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `ISpacesManagementPort` (`packages/types/src/spaces-management/ports/ISpacesManagementPort.ts`):

```typescript
listOrganizationSpacesForManagement(
  command: ListOrganizationSpacesForManagementCommand,
): Promise<ListOrganizationSpacesForManagementResponse>;
```

Import the new types and add the method line.

In `SpacesManagementAdapter.ts`:

```typescript
import { ListOrganizationSpacesForManagementUseCase } from '../usecases/ListOrganizationSpacesForManagementUseCase';

async listOrganizationSpacesForManagement(
  command: ListOrganizationSpacesForManagementCommand,
): Promise<ListOrganizationSpacesForManagementResponse> {
  const useCase = new ListOrganizationSpacesForManagementUseCase(
    this.accountsPort,
    this.spacesPort,
    this.standardsPort,
    this.recipesPort,
    this.skillsPort,
  );
  return useCase.execute(command);
}
```

(`accountsPort`/`spacesPort`/etc. are already initialized — see existing methods.)

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test spaces-management`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces-management && ./node_modules/.bin/nx lint types`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/spaces-management/ports/ISpacesManagementPort.ts \
        packages/spaces-management/src/application/adapters/SpacesManagementAdapter.ts \
        packages/spaces-management/src/application/adapters/SpacesManagementAdapter.spec.ts
git commit -m ":sparkles: feat(spaces-management): wire ListOrganizationSpacesForManagement into adapter"
```

---

### Task 11: Add API service method on `SpacesManagementService`

**Files:**
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts`

- [ ] **Step 1: Write the failing test**

If a service spec exists at `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.spec.ts`, add:

```typescript
it('listOrganizationSpacesForManagement delegates to the adapter', async () => {
  adapter.listOrganizationSpacesForManagement = jest.fn().mockResolvedValue({
    items: [], totalCount: 0, page: 1, pageSize: 8,
  });
  const result = await service.listOrganizationSpacesForManagement({
    userId: createUserId('u'),
    organizationId: createOrganizationId('o'),
    page: 1,
  });
  expect(adapter.listOrganizationSpacesForManagement).toHaveBeenCalled();
  expect(result.pageSize).toBe(8);
});
```

If no service spec exists, skip this test and rely on the controller test.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test spaces-management`
Expected: FAIL (or no-op if service spec doesn't exist).

- [ ] **Step 3: Write minimal implementation**

In `spaces-management.service.ts`, add:

```typescript
async listOrganizationSpacesForManagement(
  command: ListOrganizationSpacesForManagementCommand,
): Promise<ListOrganizationSpacesForManagementResponse> {
  this.logger.info('Listing organization spaces for management', {
    organizationId: command.organizationId,
    page: command.page,
  });
  return this.spacesManagementAdapter.listOrganizationSpacesForManagement(command);
}
```

Add the necessary imports to the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test spaces-management`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts \
        packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.spec.ts
git commit -m ":sparkles: feat(spaces-management): expose listOrganizationSpacesForManagement on service"
```

---

### Task 12: Add `GET listing` endpoint on `SpacesManagementController`

**Files:**
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts`
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `spaces-management.controller.spec.ts` (mirror the existing test setup; mock the service):

```typescript
describe('GET /organizations/:orgId/spaces-management/listing', () => {
  it('returns 200 with the response shape on happy path', async () => {
    const expected = { items: [], totalCount: 0, page: 1, pageSize: 8 };
    spacesManagementService.listOrganizationSpacesForManagement = jest.fn().mockResolvedValue(expected);

    const response = await request(app.getHttpServer())
      .get('/organizations/org-1/spaces-management/listing?page=1')
      .set('Authorization', authHeader)
      .expect(200);

    expect(response.body).toEqual(expected);
    expect(spacesManagementService.listOrganizationSpacesForManagement).toHaveBeenCalledWith({
      userId: expect.any(String),
      organizationId: 'org-1',
      page: 1,
    });
  });

  it('returns 400 when page is missing or not a positive integer', async () => {
    spacesManagementService.listOrganizationSpacesForManagement = jest
      .fn()
      .mockRejectedValue(new InvalidPageError('abc'));
    await request(app.getHttpServer())
      .get('/organizations/org-1/spaces-management/listing?page=abc')
      .set('Authorization', authHeader)
      .expect(400);
  });

  it('returns 403 when caller is not org admin', async () => {
    spacesManagementService.listOrganizationSpacesForManagement = jest
      .fn()
      .mockRejectedValue(new OrganizationAdminRequiredError({ userId: 'u', organizationId: 'org-1' }));
    await request(app.getHttpServer())
      .get('/organizations/org-1/spaces-management/listing?page=1')
      .set('Authorization', authHeader)
      .expect(403);
  });

  it('defaults page to 1 when not provided', async () => {
    spacesManagementService.listOrganizationSpacesForManagement = jest
      .fn()
      .mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 8 });
    await request(app.getHttpServer())
      .get('/organizations/org-1/spaces-management/listing')
      .set('Authorization', authHeader)
      .expect(200);
    expect(spacesManagementService.listOrganizationSpacesForManagement).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test spaces-management --testFile=spaces-management.controller.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Add to `SpacesManagementController` (declare it BEFORE any `:spaceId` param routes so NestJS matches `listing` first):

```typescript
import { Query } from '@nestjs/common';
import {
  ListOrganizationSpacesForManagementResponse,
} from '@packmind/types';
import { InvalidPageError } from '../../domain/errors/InvalidPageError';

/**
 * List the organization's spaces for the admin management page.
 * GET /organizations/:orgId/spaces-management/listing?page=N
 */
@Get('listing')
async listOrganizationSpacesForManagement(
  @Param('orgId') organizationId: OrganizationId,
  @Query('page') pageParam: string | undefined,
  @Req() request: AuthenticatedRequest,
): Promise<ListOrganizationSpacesForManagementResponse> {
  const userId = request.user.userId;
  const page = pageParam === undefined ? 1 : Number(pageParam);

  this.logger.info(
    'GET /organizations/:orgId/spaces-management/listing - Listing spaces for management',
    { organizationId, userId, page },
  );

  try {
    return await this.spacesManagementService.listOrganizationSpacesForManagement({
      userId,
      organizationId,
      page,
    });
  } catch (error) {
    if (error instanceof InvalidPageError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof OrganizationAdminRequiredError) {
      throw new ForbiddenException(error.message);
    }
    throw error;
  }
}
```

Place this method ABOVE any `@Get(':spaceId/...')`-style methods to keep NestJS route ordering predictable. (Looking at the current controller, the only `Get` is `browse`, so this is straightforward.)

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test spaces-management --testFile=spaces-management.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts \
        packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts
git commit -m ":sparkles: feat(spaces-management): expose listing endpoint for orga space management"
```

---

## Frontend

### Task 13: Update frontend types + mapper

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/types.ts`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/toSpaceListItem.ts`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/toSpaceListItem.test.ts`

- [ ] **Step 1: Update the failing test**

Replace the existing test to assert behavior on a `SpaceManagementListItem`-shaped input (already has admins/counts) and a non-null `createdAt`:

```typescript
import { describe, it, expect } from 'vitest'; // or @jest/globals — match existing imports
import type { SpaceManagementListItem } from '@packmind/types';
import { toSpaceListItem } from './toSpaceListItem';

describe('toSpaceListItem', () => {
  const dto: SpaceManagementListItem = {
    id: 's1' as any,
    name: 'Engineering',
    slug: 'engineering',
    organizationId: 'org-1' as any,
    isDefaultSpace: false,
    type: 'open',
    createdAt: '2025-01-12T10:00:00.000Z',
    admins: [{ id: 'u1' as any, displayName: 'Alice' }],
    membersCount: 12,
    artifactsCount: 9,
  } as any;

  it('decorates with colorToken and isOrgWide and preserves aggregated fields', () => {
    const row = toSpaceListItem(dto);
    expect(row.colorToken).toBeDefined();
    expect(row.isOrgWide).toBe(false);
    expect(row.admins).toEqual([{ id: 'u1', displayName: 'Alice' }]);
    expect(row.membersCount).toBe(12);
    expect(row.artifactsCount).toBe(9);
    expect(row.createdAt).toBe('2025-01-12T10:00:00.000Z');
  });

  it('marks the default space as org-wide', () => {
    const row = toSpaceListItem({ ...dto, isDefaultSpace: true });
    expect(row.isOrgWide).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=toSpaceListItem.test.ts`
Expected: FAIL — type mismatch / runtime mismatch.

- [ ] **Step 3: Update `types.ts` and the mapper**

```typescript
// apps/frontend/src/domain/spaces/components/SpacesManagementPage/types.ts
import type { Space } from '@packmind/types';
import type { SpaceColorToken } from '../spaceColor';

export type { SpaceColorToken };

export type SpaceAdminAvatar = {
  id: string;
  displayName: string;
};

export type SpaceListItem = Space & {
  colorToken: SpaceColorToken;
  isOrgWide: boolean;
  admins: SpaceAdminAvatar[];
  membersCount: number;
  artifactsCount: number;
  createdAt: string;
};
```

```typescript
// apps/frontend/src/domain/spaces/components/SpacesManagementPage/toSpaceListItem.ts
import type { SpaceManagementListItem } from '@packmind/types';
import { getColorTokenForSpace } from '../spaceColor';
import type { SpaceListItem } from './types';

export function toSpaceListItem(item: SpaceManagementListItem): SpaceListItem {
  return {
    ...item,
    colorToken: getColorTokenForSpace(item),
    isOrgWide: item.isDefaultSpace,
    admins: item.admins.map((a) => ({ id: a.id as string, displayName: a.displayName })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=toSpaceListItem.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/types.ts \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/toSpaceListItem.ts \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/toSpaceListItem.test.ts
git commit -m ":sparkles: feat(frontend): align SpaceListItem with SpaceManagementListItem DTO"
```

---

### Task 14: Add gateway method, query options, and hook

**Files:**
- Modify: `apps/frontend/src/domain/spaces/api/gateways/SpacesGatewayApi.ts`
- Modify: `apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts`
- Test: a colocated query/gateway spec if any exists; otherwise skip frontend test (lint + downstream consumer tests cover this)

- [ ] **Step 1: Write the failing test**

If a `SpacesQueries.test.ts` already exists, add:

```typescript
describe('getOrganizationSpacesForManagementQueryOptions', () => {
  it('builds a query key that includes orgId and page', () => {
    const opts = getOrganizationSpacesForManagementQueryOptions('org-1', 3);
    expect(opts.queryKey).toEqual(['organizations', 'org-1', 'spaces', 'management', 3]);
  });
});
```

If there is no such test file, this step is a no-op; the integration with `SpacesManagementPage.test.tsx` (Task 17) is the failing signal.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesQueries.test.ts` if applicable.
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In the gateway:

```typescript
// apps/frontend/src/domain/spaces/api/gateways/SpacesGatewayApi.ts
import type {
  ListOrganizationSpacesForManagementResponse,
  IListOrganizationSpacesForManagementUseCase,
} from '@packmind/types';
import type { Gateway } from '../../../../shared/api/gateway';

// add to the gateway implementation:
listOrganizationSpacesForManagement: (orgId: string, page: number) =>
  client.get<ListOrganizationSpacesForManagementResponse>(
    `/organizations/${orgId}/spaces-management/listing?page=${encodeURIComponent(String(page))}`,
  ),
```

The exact gateway construction style (Gateway<IUseCase> + axios) follows the codebase convention — copy the pattern from a sibling method like `getUserSpaces`.

In the queries file:

```typescript
// apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

export function getOrganizationSpacesForManagementQueryOptions(
  organizationId: string,
  page: number,
) {
  return queryOptions({
    queryKey: ['organizations', organizationId, 'spaces', 'management', page] as const,
    queryFn: () =>
      spacesGateway.listOrganizationSpacesForManagement(organizationId, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useGetOrganizationSpacesForManagementQuery(
  organizationId: string,
  page: number,
) {
  return useQuery(getOrganizationSpacesForManagementQueryOptions(organizationId, page));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend`
Expected: PASS (or no relevant tests).

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/api/gateways/SpacesGatewayApi.ts \
        apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts
git commit -m ":sparkles: feat(frontend): add management listing gateway and query options"
```

---

### Task 15: Refactor `SpacesPagination` to a controlled component

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesPagination.tsx`
- Create: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesPagination.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest'; // or jest
import { SpacesPagination } from './SpacesPagination';

describe('SpacesPagination', () => {
  it('renders nothing when totalCount <= pageSize', () => {
    render(<SpacesPagination page={1} pageSize={8} totalCount={5} onPageChange={() => {}} />);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('disables prev on page 1 and next on last page', () => {
    const { rerender } = render(
      <SpacesPagination page={1} pageSize={8} totalCount={32} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();

    rerender(<SpacesPagination page={4} pageSize={8} totalCount={32} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange with the requested page', async () => {
    const onPageChange = vi.fn();
    render(<SpacesPagination page={1} pageSize={8} totalCount={32} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesPagination.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Refactor `SpacesPagination.tsx` to a controlled component with the props shape `{ page, pageSize, totalCount, onPageChange }`. Internal logic computes `totalPages = Math.ceil(totalCount / pageSize)` and returns `null` when `totalCount <= pageSize`. Use the existing PMPagination/PMButton primitives the codebase already uses (look at the current implementation for the underlying primitives).

The component must expose buttons with accessible names matching `/prev/i` and `/next/i` (or update the test to whatever names the component uses — keep them in sync).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesPagination.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesPagination.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesPagination.test.tsx
git commit -m ":recycle: refactor(frontend): make SpacesPagination a controlled component"
```

---

### Task 16: Refactor `SpacesManagementPage` to use the new query and remove bulk selection

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx`

- [ ] **Step 1: Update the failing test**

Update the existing page test (or rewrite) to:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest'; // or jest
import { SpacesManagementPage } from './SpacesManagementPage';
import * as queries from '../../api/queries/SpacesQueries';

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('SpacesManagementPage', () => {
  it('renders rows from the new management query', async () => {
    vi.spyOn(queries, 'useGetOrganizationSpacesForManagementQuery').mockReturnValue({
      data: {
        items: [{ id: 's1', name: 'Engineering', slug: 'engineering', isDefaultSpace: false,
                 admins: [], membersCount: 0, artifactsCount: 0, createdAt: '2025-01-12T00:00:00.000Z',
                 organizationId: 'org-1', type: 'open' }],
        totalCount: 1, page: 1, pageSize: 8,
      },
      isLoading: false, isError: false,
    } as any);
    renderWithQuery(<SpacesManagementPage />);
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
  });

  it('does not render bulk action UI', () => {
    vi.spyOn(queries, 'useGetOrganizationSpacesForManagementQuery').mockReturnValue({
      data: { items: [], totalCount: 0, page: 1, pageSize: 8 }, isLoading: false, isError: false,
    } as any);
    renderWithQuery(<SpacesManagementPage />);
    expect(screen.queryByTestId('spaces-bulk-action-bar')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /select/i })).toBeNull();
  });

  it('triggers a refetch with new page when SpacesPagination calls onPageChange', async () => {
    const useQueryMock = vi.spyOn(queries, 'useGetOrganizationSpacesForManagementQuery');
    useQueryMock.mockReturnValue({
      data: { items: [], totalCount: 32, page: 1, pageSize: 8 }, isLoading: false, isError: false,
    } as any);
    renderWithQuery(<SpacesManagementPage />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(useQueryMock).toHaveBeenLastCalledWith(expect.any(String), 2);
  });
});
```

If the existing page test relies on a different mocking style (e.g. MSW), keep that pattern — only the assertions matter.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesManagementPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Rewrite `SpacesManagementPage.tsx` to:

```tsx
import { useState } from 'react';
import { useGetOrganizationSpacesForManagementQuery } from '../../api/queries/SpacesQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { toSpaceListItem } from './toSpaceListItem';
import { SpacesTable } from './SpacesTable';
import { SpacesPagination } from './SpacesPagination';

export function SpacesManagementPage() {
  const { organization } = useAuthContext();
  const [page, setPage] = useState(1);
  const orgId = organization?.id;
  const { data, isLoading, isError } = useGetOrganizationSpacesForManagementQuery(orgId ?? '', page);

  if (!orgId) return null;
  if (isLoading) return /* preserve current loading UI */;
  if (isError) return /* preserve current error UI */;
  if (!data) return null;

  const rows = data.items.map(toSpaceListItem);

  return (
    <>
      <SpacesTable spaces={rows} />
      <SpacesPagination
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.totalCount}
        onPageChange={setPage}
      />
    </>
  );
}
```

Remove all `selectedRows` / `onSelectionChange` state. Remove the `<SpacesBulkActionBar>` import and JSX. Keep the loading and error UI exactly as today (just dropping selection state, not visual treatment).

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesManagementPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesManagementPage.test.tsx
git commit -m ":sparkles: feat(frontend): wire SpacesManagementPage to management listing query"
```

---

### Task 17: Refactor `SpacesTable` and delete `SpacesBulkActionBar`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.tsx`
- Delete: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.tsx`
- Delete (if exists): `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.test.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/index.ts` (drop barrel export if any)

- [ ] **Step 1: Write/update the failing test**

If there's an existing `SpacesTable.test.tsx`, update its assertions to ensure no checkbox column is rendered. Otherwise create:

```typescript
import { render, screen } from '@testing-library/react';
import { SpacesTable } from './SpacesTable';
import type { SpaceListItem } from './types';

const row: SpaceListItem = {
  id: 's1' as any, name: 'Engineering', slug: 'engineering', organizationId: 'o' as any,
  isDefaultSpace: false, type: 'open', createdAt: '2025-01-12T00:00:00.000Z',
  colorToken: 'blue.500' as any, isOrgWide: false,
  admins: [], membersCount: 0, artifactsCount: 0,
};

describe('SpacesTable', () => {
  it('renders the expected columns and no row checkbox', () => {
    render(<SpacesTable spaces={[row]} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /select/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesTable.test.tsx`
Expected: FAIL — checkbox still present.

- [ ] **Step 3: Write minimal implementation**

Edit `SpacesTable.tsx`:
- Remove `selectedRows`, `onSelectionChange`, and any prop types related to selection.
- Remove the checkbox column (header and per-row cell).
- Keep all other columns: Name, Admins, Members, Artifacts, Created, Actions.
- Remove the `<SpacesBulkActionBar>` import/render.

Then `git rm` the bulk action bar file:

```bash
git rm apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.tsx
# and any companion test:
git rm -f apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.test.tsx 2>/dev/null || true
```

If the page's `index.ts` re-exports the bulk-action bar, drop that export.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesTable.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors. Fix any unused imports surfaced by the cleanup.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesTable.test.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/index.ts
git rm apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesBulkActionBar.tsx
# if companion test was tracked, git rm it as well
git commit -m ":fire: refactor(frontend): remove bulk-action UI from spaces management table"
```

---

### Task 18: Refactor route `clientLoader` to prefetch the new query and source the subtitle from `totalCount`

**Files:**
- Modify: `apps/frontend/app/routes/org.$orgSlug._protected.settings.spaces._index.tsx`

- [ ] **Step 1: Write the failing test**

If there's a route-level test, update it. Otherwise this task's failing signal is the existing page test from Task 16 plus a manual smoke (clientLoader is normally not unit-tested at the route level in this codebase — confirm by searching for sibling route tests).

- [ ] **Step 2: Run any relevant tests to verify they fail**

Run: `./node_modules/.bin/nx test frontend`
Expected: FAIL or no-op.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  ORGA_SPACE_MANAGEMENT_FEATURE_KEY,
  PMFeatureFlag,
  PMPage,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getOrganizationSpacesForManagementQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SpacesManagementPage } from '../../src/domain/spaces/components/SpacesManagementPage';
import { SpacesToolbar } from '../../src/domain/spaces/components/SpacesManagementPage/SpacesToolbar';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  try {
    const data = await queryClient.ensureQueryData(
      getOrganizationSpacesForManagementQueryOptions(me.organization.id, 1),
    );
    return { totalCount: data.totalCount };
  } catch {
    return { totalCount: null };
  }
}

export default function SettingsSpacesRouteModule() {
  const { user, organization } = useAuthContext();
  const { totalCount } = useLoaderData<typeof clientLoader>();

  if (!organization) return null;

  const subtitle =
    totalCount === null
      ? 'Manage every space in your organization'
      : `Manage every space in your organization · ${totalCount} ${totalCount === 1 ? 'space' : 'spaces'}`;

  return (
    <PMFeatureFlag
      featureKeys={[ORGA_SPACE_MANAGEMENT_FEATURE_KEY]}
      featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
      userEmail={user?.email}
    >
      <PMPage title="Spaces" subtitle={subtitle} actions={<SpacesToolbar />}>
        <SpacesManagementPage />
      </PMPage>
    </PMFeatureFlag>
  );
}
```

- [ ] **Step 4: Run all frontend tests**

Run: `./node_modules/.bin/nx test frontend`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/routes/org.\$orgSlug._protected.settings.spaces._index.tsx
git commit -m ":sparkles: feat(frontend): source spaces settings subtitle from management listing total"
```

---

### Task 19: Add `DeleteSpaceConfirmDialog` and wire `SpaceRowActions`

**Files:**
- Create: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/DeleteSpaceConfirmDialog.tsx`
- Create: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/DeleteSpaceConfirmDialog.test.tsx`
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceRowActions.tsx`
- Modify (if exists): `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceRowActions.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// DeleteSpaceConfirmDialog.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { DeleteSpaceConfirmDialog } from './DeleteSpaceConfirmDialog';

describe('DeleteSpaceConfirmDialog', () => {
  it('renders the confirmation copy with the space name', () => {
    renderWithQuery(
      <DeleteSpaceConfirmDialog isOpen onClose={() => {}} space={{ id: 's1', name: 'Engineering' } as any} />,
    );
    expect(screen.getByText(/Delete space 'Engineering'\?/)).toBeInTheDocument();
    expect(screen.getByText(/This action is irreversible\./)).toBeInTheDocument();
  });

  it('Cancel calls onClose without mutating', async () => {
    const onClose = vi.fn();
    renderWithQuery(<DeleteSpaceConfirmDialog isOpen onClose={onClose} space={{ id: 's1', name: 'X' } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Delete invokes the mutation, fires success toast, invalidates queries, and closes', async () => {
    // Mock useDeleteSpaceMutation to return mutateAsync that resolves
    const onClose = vi.fn();
    renderWithQuery(<DeleteSpaceConfirmDialog isOpen onClose={onClose} space={{ id: 's1', name: 'X' } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // assert toast and invalidation by spying on the toast helper / queryClient
  });

  it('on mutation error, fires error toast and stays open', async () => {
    const onClose = vi.fn();
    // Mock useDeleteSpaceMutation to reject
    renderWithQuery(<DeleteSpaceConfirmDialog isOpen onClose={onClose} space={{ id: 's1', name: 'X' } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });
});
```

For `SpaceRowActions.test.tsx`:

```tsx
describe('SpaceRowActions', () => {
  it('hides Delete on the default org-wide space', () => {
    render(<SpaceRowActions space={{ ...row, isDefaultSpace: true }} />);
    expect(screen.queryByRole('menuitem', { name: /delete/i })).toBeNull();
  });

  it('shows Delete on a non-default space and opens the confirmation dialog', async () => {
    render(<SpaceRowActions space={{ ...row, isDefaultSpace: false }} />);
    await userEvent.click(screen.getByRole('button', { name: /actions/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
    expect(screen.getByText(/Delete space/i)).toBeInTheDocument();
  });

  it('hides View when slug is missing', () => {
    render(<SpaceRowActions space={{ ...row, slug: '' }} />);
    expect(screen.queryByRole('menuitem', { name: /view/i })).toBeNull();
  });

  it('does not render Edit', async () => {
    render(<SpaceRowActions space={row} />);
    await userEvent.click(screen.getByRole('button', { name: /actions/i }));
    expect(screen.queryByRole('menuitem', { name: /edit/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test frontend`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`DeleteSpaceConfirmDialog.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { PMDialog, PMButton, PMText, useToast } from '@packmind/ui'; // match existing imports for modal/button primitives
import { useDeleteSpaceMutation } from '../../api/queries/SpacesQueries'; // or wherever it lives
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import type { Space } from '@packmind/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  space: Pick<Space, 'id' | 'name'>;
};

export function DeleteSpaceConfirmDialog({ isOpen, onClose, space }: Props) {
  const { organization } = useAuthContext();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mutateAsync, isPending } = useDeleteSpaceMutation();

  const handleConfirm = async () => {
    try {
      await mutateAsync({ spaceId: space.id, organizationId: organization!.id });
      toast({ title: `Space '${space.name}' deleted`, status: 'success' });
      await queryClient.invalidateQueries({
        queryKey: ['organizations', organization!.id, 'spaces', 'management'],
      });
      onClose();
    } catch (err) {
      toast({ title: 'Failed to delete space', status: 'error' });
      // dialog stays open
    }
  };

  return (
    <PMDialog isOpen={isOpen} onClose={onClose}>
      <PMText>{`Delete space '${space.name}'? This action is irreversible.`}</PMText>
      <PMButton onClick={onClose} variant="ghost">Cancel</PMButton>
      <PMButton onClick={handleConfirm} colorScheme="red" loading={isPending}>Delete</PMButton>
    </PMDialog>
  );
}
```

The exact PM-prefixed imports and dialog structure must match `working-with-pm-design-kit` conventions. Mirror an existing confirmation dialog in the codebase (search for an existing `*ConfirmDialog.tsx` and copy its structure).

If `useDeleteSpaceMutation` doesn't exist yet, create it next to the existing space mutations under `apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts` calling the existing backend `DELETE /organizations/:orgId/spaces-management/:spaceId` endpoint.

`SpaceRowActions.tsx` updates:

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DeleteSpaceConfirmDialog } from './DeleteSpaceConfirmDialog';

export function SpaceRowActions({ space }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const showView = Boolean(space.slug);
  const showDelete = !space.isDefaultSpace;

  return (
    <>
      <PMMenu>
        {showView && (
          <PMMenuItem onClick={() => navigate(`/org/${orgSlug}/spaces/${space.slug}`)}>
            View
          </PMMenuItem>
        )}
        {showDelete && (
          <PMMenuItem onClick={() => setConfirmOpen(true)}>Delete</PMMenuItem>
        )}
      </PMMenu>
      {showDelete && (
        <DeleteSpaceConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          space={space}
        />
      )}
    </>
  );
}
```

Edit row action: not rendered.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test frontend`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/DeleteSpaceConfirmDialog.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/DeleteSpaceConfirmDialog.test.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceRowActions.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpaceRowActions.test.tsx \
        apps/frontend/src/domain/spaces/api/queries/SpacesQueries.ts
git commit -m ":sparkles: feat(frontend): add delete confirmation flow to spaces management row actions"
```

---

### Task 20: Wire `CreateSpaceDialog.onCreated` from `SpacesToolbar` to invalidate the new query

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesToolbar.tsx`
- Modify (if needed): `apps/frontend/src/domain/spaces-management/components/CreateSpaceDialog.tsx` to ensure an `onCreated` callback prop exists

- [ ] **Step 1: Write the failing test**

```tsx
// SpacesToolbar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SpacesToolbar } from './SpacesToolbar';
import { QueryClient } from '@tanstack/react-query';

describe('SpacesToolbar', () => {
  it('opens CreateSpaceDialog and invalidates the management query on success', async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    renderWithAuthAndQuery(<SpacesToolbar />);
    await userEvent.click(screen.getByRole('button', { name: /new space/i }));
    // simulate the dialog calling onCreated
    // assert invalidate called with the management key
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['spaces', 'management']) }),
    );
  });
});
```

If a precise `onCreated` simulation is hard to script in the existing test harness, replace this with a unit test that asserts the `onCreated` callback prop wired by the toolbar invokes `queryClient.invalidateQueries` with the expected key.

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesToolbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`SpacesToolbar.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CreateSpaceDialog } from '../../../spaces-management/components/CreateSpaceDialog';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

export function SpacesToolbar() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  const handleCreated = async () => {
    if (organization) {
      await queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
    setOpen(false);
  };

  return (
    <>
      {/* visual-only Search input + Admin/Member dropdowns kept as-is */}
      <PMButton onClick={() => setOpen(true)}>+ New space</PMButton>
      <CreateSpaceDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        redirectAfterCreate={false}
        onCreated={handleCreated}
      />
    </>
  );
}
```

If `CreateSpaceDialog` does not yet expose an `onCreated` prop, add it: a callback invoked after a successful create, before closing.

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/nx test frontend --testFile=SpacesToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesToolbar.tsx \
        apps/frontend/src/domain/spaces/components/SpacesManagementPage/SpacesToolbar.test.tsx \
        apps/frontend/src/domain/spaces-management/components/CreateSpaceDialog.tsx
git commit -m ":sparkles: feat(frontend): invalidate management spaces query after CreateSpaceDialog success"
```

---

## End-to-end

### Task 21: E2E — `+ New space` keeps the user on the page (Rule 3)

**Files:**
- Create or update: `apps/e2e-tests/<page-objects>/SpacesManagementPage.ts` (POM helper)
- Create: `apps/e2e-tests/specs/spaces-management-create.spec.ts`

- [ ] **Step 1: Write the failing test**

Add a Playwright spec that:
1. Logs in as an org admin in a feature-flag-eligible domain (`@packmind.com` or `@promyze.com`).
2. Navigates to `/org/{orgSlug}/settings/spaces`.
3. Clicks `+ New space`.
4. Fills in name (e.g. `E2E Space ${Date.now()}`) and selects a visibility.
5. Clicks `Create space`.
6. Asserts: the dialog closes, URL still ends with `/settings/spaces`, the new space row appears in the table.

Mirror the existing Playwright POM pattern from `apps/e2e-tests/`.

- [ ] **Step 2: Run test to verify it fails**

Run the e2e suite for this single spec (use the project's e2e command — `./node_modules/.bin/nx e2e e2e-tests --testFile=spaces-management-create.spec.ts` or whatever the project uses).
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

By the time this test runs, all backend + frontend tasks are merged, so the implementation already exists. The test passing is the validation.

- [ ] **Step 4: Run test to verify it passes**

Re-run the spec.
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint e2e-tests`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/e2e-tests/specs/spaces-management-create.spec.ts \
        apps/e2e-tests/<page-objects>/SpacesManagementPage.ts
git commit -m ":white_check_mark: test(e2e): create space stays on management page"
```

---

### Task 22: E2E — Delete with confirmation (Rule 4)

**Files:**
- Update: `apps/e2e-tests/<page-objects>/SpacesManagementPage.ts`
- Create: `apps/e2e-tests/specs/spaces-management-delete.spec.ts`

- [ ] **Step 1: Write the failing test**

Add a Playwright spec that:
1. Logs in as an org admin and seeds a non-default space (use the existing API or factory helpers the e2e tests already use).
2. Navigates to the management page.
3. Opens the row actions menu on the seeded space.
4. Clicks `Delete`.
5. Asserts the modal copy is exactly `Delete space '{name}'? This action is irreversible.`.
6. Clicks `Delete`.
7. Asserts the modal closes, a success toast appears, and the row disappears from the table.

Then add a second test in the same spec that asserts the default org-wide space's row actions menu does NOT contain a `Delete` entry.

- [ ] **Step 2: Run test to verify it fails**

Run the spec.
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Same as Task 21 — the implementation is already in place; the test passing is the validation.

- [ ] **Step 4: Run test to verify it passes**

Re-run the spec.
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint e2e-tests`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/e2e-tests/specs/spaces-management-delete.spec.ts \
        apps/e2e-tests/<page-objects>/SpacesManagementPage.ts
git commit -m ":white_check_mark: test(e2e): delete space with confirmation modal"
```

---

## Final validation

After all 22 tasks complete:

- [ ] **Run all affected tests:** `npm run test:staged`
- [ ] **Run all affected lints:** `npm run lint:staged`
- [ ] **Manual smoke (frontend):**
  - Start the local stack (Docker Compose).
  - Sign in with a feature-flag-eligible org admin.
  - Navigate to `/org/{slug}/settings/spaces`.
  - Verify rows render with admins/members/artifacts/created.
  - Paginate forward and backward.
  - Create a new space → stays on page, row appears.
  - Delete a non-default space → modal copy correct, row disappears.
  - Open row actions on the default space → `Delete` not shown.
  - Click `View` on a non-default space → navigates to its dashboard.

- [ ] **No `--no-verify` was used at any commit.** Confirm via `git log --since='1 day ago' --pretty=full`.
