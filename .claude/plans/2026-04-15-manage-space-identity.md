# Manage Space Identity Implementation Plan

> **For agentic execution:** Use `packmind:architect-executor` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let space/org admins update a space's `name` and `color` via the existing PATCH endpoint; slug stays stable; collisions rejected; color persisted server-side and consumed by the sidebar.

**Architecture:** Touches `packages/types`, `packages/spaces` (service + schema), `packages/spaces-management` (use case + NestJS controller), `packages/migrations` (new migration with backfill), `apps/frontend` (gateway, mutation, `SpaceIdentitySection`, `SpaceGeneralSettings`, `SpaceNavBlock`). Authorization pattern mirrors `DeleteSpaceUseCase` (org-admin OR space-admin, checked inline inside `AbstractMemberUseCase.executeForMembers`).

**Tech Stack:** TypeScript, NestJS, TypeORM, React + TanStack Query + Chakra UI, `slug` package, Playwright.

**Source Spec:** `.claude/specs/2026-04-15-manage-space-identity-design.md`
**EM Spec:** `em-specs/manage-space-identity.md`

---

## Task 1: SpaceColor type + Space entity gains `color`

**Files:**
- Create: `packages/types/src/spaces/SpaceColor.ts`
- Modify: `packages/types/src/spaces/index.ts`
- Modify: `packages/types/src/spaces/Space.ts`

- [ ] **Step 1: Create the SpaceColor module**

Create `packages/types/src/spaces/SpaceColor.ts`:

```ts
export const SPACE_COLOR_PALETTES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
] as const;

export type SpaceColor = (typeof SPACE_COLOR_PALETTES)[number];

export function isSpaceColor(value: unknown): value is SpaceColor {
  return (
    typeof value === 'string' &&
    (SPACE_COLOR_PALETTES as readonly string[]).includes(value)
  );
}
```

- [ ] **Step 2: Export from the spaces barrel**

In `packages/types/src/spaces/index.ts`, add the new export line before the `contracts` re-export:

```ts
export * from './SpaceId';
export * from './Space';
export * from './SpaceColor';
export * from './UserSpaceMembership';
export * from './ports';
export * from './contracts';
export * from './events';
```

- [ ] **Step 3: Extend the Space entity type**

Replace the body of `packages/types/src/spaces/Space.ts`:

```ts
import { SpaceId } from './SpaceId';
import { OrganizationId } from '../accounts/Organization';
import { SpaceColor } from './SpaceColor';

export enum SpaceType {
  open = 'open',
  restricted = 'restricted',
  private = 'private',
}

export type Space = {
  id: SpaceId;
  name: string;
  slug: string;
  type: SpaceType;
  organizationId: OrganizationId;
  isDefaultSpace: boolean;
  color: SpaceColor;
};
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/nx build types`
Expected: PASS. Downstream build failures in consumer packages are expected — they'll be fixed in later tasks (factory update, schema update).

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/spaces/SpaceColor.ts packages/types/src/spaces/Space.ts packages/types/src/spaces/index.ts
git commit -m "feat(types): introduce SpaceColor type and add color to Space entity"
```

---

## Task 2: Add `color` column to SpaceSchema and migration

**Files:**
- Modify: `packages/spaces/src/infra/schemas/SpaceSchema.ts`
- Create: `packages/migrations/src/migrations/<timestamp>-AddColorToSpaces.ts`
- Create: `packages/migrations/src/migrations/<timestamp>-AddColorToSpaces.spec.ts`

> **Note:** Replace `<timestamp>` below with `date +%s000` at execution time — use a fresh epoch-ms value so this migration sorts after whatever is currently in `packages/migrations/src/migrations/`. The class name and file name must match (e.g., `1776263499000-AddColorToSpaces.ts` → `class AddColorToSpaces1776263499000`). For clarity in the code samples below, `1776263499000` is used as a placeholder — substitute consistently across both files and the class name.

- [ ] **Step 1: Add the column to SpaceSchema**

Edit `packages/spaces/src/infra/schemas/SpaceSchema.ts`. Add a `color` column after `isDefaultSpace` and before `organizationId`:

```ts
isDefaultSpace: {
  name: 'is_default_space',
  type: 'boolean',
  default: true,
},
color: {
  type: 'varchar',
  length: 16,
  nullable: false,
},
organizationId: {
  name: 'organization_id',
  type: 'uuid',
  nullable: false,
},
```

- [ ] **Step 2: Write the migration parity test first (TDD)**

Create `packages/migrations/src/migrations/1776263499000-AddColorToSpaces.spec.ts`:

```ts
import { hashNameToSpaceColor } from './1776263499000-AddColorToSpaces';

describe('hashNameToSpaceColor', () => {
  describe('when matching the frontend getSpaceColorPalette behavior', () => {
    const SPACE_COLOR_PALETTES = [
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'blue',
      'cyan',
      'purple',
      'pink',
    ] as const;

    function getSpaceColorPaletteFrontend(name: string): string {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
      }
      return SPACE_COLOR_PALETTES[
        Math.abs(hash) % SPACE_COLOR_PALETTES.length
      ];
    }

    const sampleNames = [
      'Global',
      'oddity',
      'security',
      'Security Connections',
      'My Space',
      'Acme Corp',
      'Backend',
      '日本語',
      '',
    ];

    it.each(sampleNames)(
      'returns the same color as the frontend for %p',
      (name) => {
        expect(hashNameToSpaceColor(name)).toBe(
          getSpaceColorPaletteFrontend(name),
        );
      },
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `./node_modules/.bin/nx test migrations --testFile=1776263499000-AddColorToSpaces.spec.ts`
Expected: FAIL (module not found — migration file doesn't exist yet).

- [ ] **Step 4: Create the migration with backfill**

Create `packages/migrations/src/migrations/1776263499000-AddColorToSpaces.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AddColorToSpaces1776263499000';

const SPACE_COLOR_PALETTES = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'cyan',
  'purple',
  'pink',
] as const;

export function hashNameToSpaceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
  }
  return SPACE_COLOR_PALETTES[Math.abs(hash) % SPACE_COLOR_PALETTES.length];
}

export class AddColorToSpaces1776263499000 implements MigrationInterface {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting migration: AddColorToSpaces');

    try {
      await queryRunner.query(`
        ALTER TABLE "spaces"
        ADD COLUMN "color" varchar(16) NULL
      `);

      const rows: Array<{ id: string; name: string }> = await queryRunner.query(
        `SELECT id, name FROM "spaces"`,
      );

      for (const row of rows) {
        const color = hashNameToSpaceColor(row.name);
        await queryRunner.query(
          `UPDATE "spaces" SET "color" = $1 WHERE id = $2`,
          [color, row.id],
        );
      }

      await queryRunner.query(`
        ALTER TABLE "spaces"
        ALTER COLUMN "color" SET NOT NULL
      `);

      this.logger.info(
        'Migration AddColorToSpaces completed successfully',
        { backfilledRows: rows.length },
      );
    } catch (error) {
      this.logger.error('Migration AddColorToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logger.info('Starting rollback: AddColorToSpaces');

    try {
      await queryRunner.query(`
        ALTER TABLE "spaces" DROP COLUMN "color"
      `);
      this.logger.info('Rollback AddColorToSpaces completed successfully');
    } catch (error) {
      this.logger.error('Rollback AddColorToSpaces failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
```

- [ ] **Step 5: Run the migration parity test to verify it passes**

Run: `./node_modules/.bin/nx test migrations --testFile=1776263499000-AddColorToSpaces.spec.ts`
Expected: PASS (9 cases).

- [ ] **Step 6: Lint**

Run: `./node_modules/.bin/nx lint migrations && ./node_modules/.bin/nx lint spaces`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/spaces/src/infra/schemas/SpaceSchema.ts packages/migrations/src/migrations/1776263499000-AddColorToSpaces.ts packages/migrations/src/migrations/1776263499000-AddColorToSpaces.spec.ts
git commit -m "feat(spaces): add color column to spaces with deterministic backfill"
```

---

## Task 3: Update spaceFactory to provide a default color

**Files:**
- Modify: `packages/spaces/test/spaceFactory.ts`

- [ ] **Step 1: Add color default to the factory**

Replace the content of `packages/spaces/test/spaceFactory.ts`:

```ts
import {
  createOrganizationId,
  createSpaceId,
  Space,
  SpaceColor,
  SpaceType,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_FACTORY_COLOR: SpaceColor = 'blue';

export function spaceFactory(overrides: Partial<Space> = {}): Space {
  return {
    id: createSpaceId(uuidv4()),
    name: 'Test Space',
    slug: 'test-space',
    type: SpaceType.open,
    organizationId: createOrganizationId(uuidv4()),
    isDefaultSpace: false,
    color: DEFAULT_FACTORY_COLOR,
    ...overrides,
  };
}
```

- [ ] **Step 2: Run affected tests**

Run: `./node_modules/.bin/nx test spaces`
Expected: PASS (or at least no new failures caused by factory).

Run: `./node_modules/.bin/nx test spaces-management`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/spaces/test/spaceFactory.ts
git commit -m "test(spaces): default color in spaceFactory"
```

---

## Task 4: Add SpaceRenamedEvent

**Files:**
- Create: `packages/types/src/spaces/events/SpaceRenamedEvent.ts`
- Modify: `packages/types/src/spaces/events/index.ts`

- [ ] **Step 1: Create the event class**

Create `packages/types/src/spaces/events/SpaceRenamedEvent.ts`:

```ts
import { UserEvent } from '../../events';
import { SpaceId } from '../SpaceId';

export interface SpaceRenamedPayload {
  spaceId: SpaceId;
  spaceSlug: string;
  oldName: string;
  newName: string;
}

export class SpaceRenamedEvent extends UserEvent<SpaceRenamedPayload> {
  static override readonly eventName = 'spaces.space.renamed';
}
```

- [ ] **Step 2: Export from the events barrel**

Edit `packages/types/src/spaces/events/index.ts`:

```ts
export * from './SpaceCreatedEvent';
export * from './SpaceMembersAddedEvent';
export * from './SpaceMembersRemovedEvent';
export * from './SpaceMembersRoleUpdatedEvent';
export * from './SpaceVisibilityUpdatedEvent';
export * from './SpaceDeletedEvent';
export * from './SpaceRenamedEvent';
```

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/nx build types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/spaces/events/SpaceRenamedEvent.ts packages/types/src/spaces/events/index.ts
git commit -m "feat(types): add SpaceRenamedEvent"
```

---

## Task 5: Add three new domain errors in spaces-management

**Files:**
- Create: `packages/spaces-management/src/domain/errors/CannotRenameDefaultSpaceError.ts`
- Create: `packages/spaces-management/src/domain/errors/SpaceIdentityUpdateForbiddenError.ts`
- Create: `packages/spaces-management/src/domain/errors/InvalidSpaceColorError.ts`

- [ ] **Step 1: Create CannotRenameDefaultSpaceError**

Create `packages/spaces-management/src/domain/errors/CannotRenameDefaultSpaceError.ts`:

```ts
export class CannotRenameDefaultSpaceError extends Error {
  constructor(spaceId: string) {
    super(`Cannot rename the default space ${spaceId}`);
    this.name = 'CannotRenameDefaultSpaceError';
  }
}
```

- [ ] **Step 2: Create SpaceIdentityUpdateForbiddenError**

Create `packages/spaces-management/src/domain/errors/SpaceIdentityUpdateForbiddenError.ts`:

```ts
export class SpaceIdentityUpdateForbiddenError extends Error {
  constructor(userId: string, spaceId: string) {
    super(
      `User ${userId} is not authorized to update identity of space ${spaceId}`,
    );
    this.name = 'SpaceIdentityUpdateForbiddenError';
  }
}
```

- [ ] **Step 3: Create InvalidSpaceColorError**

Create `packages/spaces-management/src/domain/errors/InvalidSpaceColorError.ts`:

```ts
export class InvalidSpaceColorError extends Error {
  constructor(color: string) {
    super(`Space color '${color}' is not a valid palette value`);
    this.name = 'InvalidSpaceColorError';
  }
}
```

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/spaces-management/src/domain/errors/CannotRenameDefaultSpaceError.ts packages/spaces-management/src/domain/errors/SpaceIdentityUpdateForbiddenError.ts packages/spaces-management/src/domain/errors/InvalidSpaceColorError.ts
git commit -m "feat(spaces-management): add identity-update domain errors"
```

---

## Task 6: Rework `SpaceService.updateSpace` — slug stability + collision guard + color

**Files:**
- Modify: `packages/spaces/src/application/services/SpaceService.ts` (lines 146-176)
- Modify/create: `packages/spaces/src/application/services/SpaceService.spec.ts` (add tests; file exists — locate and extend)

- [ ] **Step 1: Write failing tests first (TDD)**

Locate `packages/spaces/src/application/services/SpaceService.spec.ts` (or adjacent). Add a new `describe('updateSpace')` block. If the file doesn't exist, create it. Tests to add:

```ts
import { OrganizationId, SpaceId, SpaceType } from '@packmind/types';
import { spaceFactory } from '../../../test/spaceFactory';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { SpaceSlugConflictError } from '../../domain/errors/SpaceSlugConflictError';
import { SpaceService } from './SpaceService';

describe('SpaceService.updateSpace', () => {
  let repo: jest.Mocked<ISpaceRepository>;
  let service: SpaceService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOrganizationId: jest.fn(),
      add: jest.fn(),
      updateFields: jest.fn(),
      deleteById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<ISpaceRepository>;
    service = new SpaceService(repo);
  });

  describe('when updating only the name', () => {
    const space = spaceFactory({ name: 'secrurity', slug: 'secrurity' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.findBySlug.mockResolvedValue(null);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('persists the new name', async () => {
      const result = await service.updateSpace(space.id, { name: 'security' });
      expect(result.name).toBe('security');
    });

    it('does not update the slug', async () => {
      await service.updateSpace(space.id, { name: 'security' });
      expect(repo.updateFields).toHaveBeenCalledWith(
        space.id,
        expect.not.objectContaining({ slug: expect.anything() }),
      );
    });
  });

  describe('when renaming to a name whose slug collides with another space', () => {
    const target = spaceFactory({
      name: 'Security Connections',
      slug: 'security-connections',
    });
    const other = spaceFactory({
      organizationId: target.organizationId,
      name: 'Security',
      slug: 'security',
    });

    beforeEach(() => {
      repo.findById.mockResolvedValue(target);
      repo.findBySlug.mockResolvedValue(other);
    });

    it('throws SpaceSlugConflictError', async () => {
      await expect(
        service.updateSpace(target.id, { name: 'Security' }),
      ).rejects.toBeInstanceOf(SpaceSlugConflictError);
    });
  });

  describe('when renaming to a name whose slug equals its own slug', () => {
    const space = spaceFactory({ name: 'Security', slug: 'security' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.findBySlug.mockResolvedValue(space);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('allows the update', async () => {
      const result = await service.updateSpace(space.id, { name: 'security' });
      expect(result.name).toBe('security');
    });
  });

  describe('when updating the color', () => {
    const space = spaceFactory({ color: 'blue' });

    beforeEach(() => {
      repo.findById.mockResolvedValue(space);
      repo.updateFields.mockImplementation(async (_id, fields) => ({
        ...space,
        ...fields,
      }));
    });

    it('persists the new color', async () => {
      const result = await service.updateSpace(space.id, { color: 'purple' });
      expect(result.color).toBe('purple');
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces --testFile=SpaceService.spec.ts`
Expected: the new tests FAIL (current `updateSpace` doesn't accept `color`, still regenerates slug, still throws on the "same-slug" self-case because it calls `findBySlug` and that match isn't the self-check we need).

- [ ] **Step 3: Rewrite `updateSpace` in SpaceService**

Replace lines 146-176 of `packages/spaces/src/application/services/SpaceService.ts` with:

```ts
async updateSpace(
  spaceId: SpaceId,
  fields: { name?: string; type?: SpaceType; color?: SpaceColor },
): Promise<Space> {
  this.logger.info('Updating space', { spaceId });

  const repoFields: {
    name?: string;
    type?: SpaceType;
    color?: SpaceColor;
  } = {};

  if (fields.name !== undefined) {
    const space = await this.spaceRepository.findById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }
    const candidateSlug = slug(fields.name);
    const existingBySlug = await this.spaceRepository.findBySlug(
      candidateSlug,
      space.organizationId,
    );
    if (existingBySlug && existingBySlug.id !== spaceId) {
      throw new SpaceSlugConflictError(fields.name, space.organizationId);
    }
    repoFields.name = fields.name;
  }

  if (fields.type !== undefined) {
    repoFields.type = fields.type;
  }

  if (fields.color !== undefined) {
    repoFields.color = fields.color;
  }

  return this.spaceRepository.updateFields(spaceId, repoFields);
}
```

Also add `SpaceColor` to the imports at the top of the file:

```ts
import {
  createSpaceId,
  OrganizationId,
  Space,
  SpaceColor,
  SpaceId,
  SpaceType,
} from '@packmind/types';
```

And update the `ISpaceRepository.updateFields` signature if needed to accept `color` (see next step if the type inference fails).

- [ ] **Step 4: Verify `ISpaceRepository.updateFields` accepts the color field**

Open `packages/spaces/src/domain/repositories/ISpaceRepository.ts`. If `updateFields`'s second parameter is typed narrowly (e.g., `{ name?: string; slug?: string; type?: SpaceType }`), extend it to include `color?: SpaceColor`:

```ts
updateFields(
  id: SpaceId,
  fields: Partial<Pick<Space, 'name' | 'slug' | 'type' | 'color'>>,
): Promise<Space>;
```

Use the `Partial<Pick<>>` shape (per the TypeScript-good-practices standard: presentation/adapter DTOs should intersect with domain types to catch drift). If the file uses a free-form type, just add `color?: SpaceColor`.

Also verify the TypeORM repository implementation — if it naively passes the fields object to `.update()`, no code change is required (TypeORM resolves the column via schema). Otherwise, map `color → color` explicitly.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces --testFile=SpaceService.spec.ts`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `./node_modules/.bin/nx lint spaces`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/spaces/src/application/services/SpaceService.ts packages/spaces/src/application/services/SpaceService.spec.ts packages/spaces/src/domain/repositories/ISpaceRepository.ts
git commit -m "feat(spaces): keep slug stable on rename and accept color updates"
```

---

## Task 7: Extend `UpdateSpaceCommand` contract

**Files:**
- Modify: `packages/types/src/spaces-management/contracts/IUpdateSpaceUseCase.ts`

- [ ] **Step 1: Add `color` to the command and switch to SpaceMemberCommand**

Replace the content of `packages/types/src/spaces-management/contracts/IUpdateSpaceUseCase.ts`:

```ts
import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';
import { SpaceColor } from '../../spaces/SpaceColor';

export type UpdateSpaceCommand = SpaceMemberCommand & {
  name?: string;
  type?: SpaceType;
  color?: SpaceColor;
};

export type UpdateSpaceResponse = Space;

export type IUpdateSpaceUseCase = IUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
>;
```

**Rationale:** The use case is moving from `AbstractSpaceAdminUseCase` to `AbstractMemberUseCase` (Task 8). Per the `use-case-architecture-patterns` standard, commands that carry a `spaceId` should extend `SpaceMemberCommand` rather than `SpaceAdminCommand` once the "space admin required" semantic no longer applies at the contract level.

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/nx build types`
Expected: PASS. Consumer compile errors (in `UpdateSpaceUseCase`) are expected and addressed in Task 8.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/spaces-management/contracts/IUpdateSpaceUseCase.ts
git commit -m "feat(types): extend UpdateSpaceCommand with color and switch to SpaceMemberCommand"
```

---

## Task 8: Rewrite `UpdateSpaceUseCase`

**Files:**
- Modify: `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts`
- Modify/create: `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.spec.ts`

- [ ] **Step 1: Write failing tests first (TDD)**

Create or replace `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.spec.ts`:

```ts
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceColor,
  SpaceRenamedEvent,
  SpaceType,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UserSpaceRole,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { UpdateSpaceUseCase } from './UpdateSpaceUseCase';

describe('UpdateSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  let useCase: UpdateSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      'getSpaceById' | 'findMembership' | 'updateSpace'
    >
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const existingSpace = spaceFactory({
    id: spaceId,
    organizationId,
    isDefaultSpace: false,
    name: 'oddity',
    slug: 'oddity',
    color: 'blue',
  });

  const buildCommand = (
    overrides?: Partial<UpdateSpaceCommand>,
  ): UpdateSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(existingSpace),
      findMembership: jest.fn(),
      updateSpace: jest
        .fn()
        .mockImplementation(async (_id, fields) => ({ ...existingSpace, ...fields })),
    };
    eventEmitterService = { emit: jest.fn().mockReturnValue(true) };
  });

  afterEach(() => jest.clearAllMocks());

  const buildUseCase = (userRole: 'admin' | 'member') => {
    const user = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: userRole }],
    });
    const organization = organizationFactory({ id: organizationId });
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;
    return new UpdateSpaceUseCase(
      spacesPort as unknown as ISpacesPort,
      accountsPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  };

  describe('when the caller is an organization admin', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('updates the name', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));
      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ name: 'security' }),
      );
    });

    it('updates the color', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));
      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ color: 'purple' }),
      );
    });

    it('emits SpaceRenamedEvent when the name changes', async () => {
      await useCase.execute(buildCommand({ name: 'new-name' }));
      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(SpaceRenamedEvent),
      );
    });

    it('does not emit SpaceRenamedEvent when only color changes', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));
      expect(eventEmitterService.emit).not.toHaveBeenCalledWith(
        expect.any(SpaceRenamedEvent),
      );
    });
  });

  describe('when the caller is a space admin (not org admin)', () => {
    beforeEach(() => {
      useCase = buildUseCase('member');
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.ADMIN,
      });
    });

    it('updates the space', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));
      expect(spacesPort.updateSpace).toHaveBeenCalled();
    });
  });

  describe('when the caller is neither org admin nor space admin', () => {
    beforeEach(() => {
      useCase = buildUseCase('member');
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
      });
    });

    it('throws SpaceIdentityUpdateForbiddenError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'security' })),
      ).rejects.toBeInstanceOf(SpaceIdentityUpdateForbiddenError);
    });
  });

  describe('when updating the default space name', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue({
        ...existingSpace,
        isDefaultSpace: true,
        name: 'Global',
      });
      useCase = buildUseCase('admin');
    });

    it('throws CannotRenameDefaultSpaceError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'Not Global' })),
      ).rejects.toBeInstanceOf(CannotRenameDefaultSpaceError);
    });

    it('allows updating the color', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));
      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ color: 'purple' }),
      );
    });
  });

  describe('when the color is invalid', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('throws InvalidSpaceColorError', async () => {
      await expect(
        useCase.execute(
          buildCommand({ color: 'chartreuse' as unknown as SpaceColor }),
        ),
      ).rejects.toBeInstanceOf(InvalidSpaceColorError);
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
      useCase = buildUseCase('admin');
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'x' })),
      ).rejects.toBeInstanceOf(SpaceNotFoundError);
    });
  });

  describe('when the space type changes', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('still emits SpaceVisibilityUpdatedEvent', async () => {
      await useCase.execute(buildCommand({ type: SpaceType.restricted }));
      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(SpaceVisibilityUpdatedEvent),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces-management --testFile=UpdateSpaceUseCase.spec.ts`
Expected: FAIL on all the new cases (use case still extends `AbstractSpaceAdminUseCase`).

- [ ] **Step 3: Rewrite the use case**

Replace the content of `packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts`:

```ts
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  isSpaceColor,
  SpaceRenamedEvent,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
  UserSpaceRole,
} from '@packmind/types';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';

export class UpdateSpaceUseCase extends AbstractMemberUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
> {
  constructor(
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    protected override readonly logger: PackmindLogger = new PackmindLogger(
      'UpdateSpaceUseCase',
    ),
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: UpdateSpaceCommand & MemberContext,
  ): Promise<UpdateSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    const isOrgAdmin = command.membership.role === 'admin';
    if (!isOrgAdmin) {
      const spaceMembership = await this.spacesPort.findMembership(
        userId,
        spaceId,
      );
      if (spaceMembership?.role !== UserSpaceRole.ADMIN) {
        throw new SpaceIdentityUpdateForbiddenError(
          command.userId,
          command.spaceId,
        );
      }
    }

    const isRenaming =
      command.name !== undefined && command.name !== space.name;
    if (isRenaming && space.isDefaultSpace) {
      throw new CannotRenameDefaultSpaceError(command.spaceId);
    }

    if (command.color !== undefined && !isSpaceColor(command.color)) {
      throw new InvalidSpaceColorError(command.color as string);
    }

    const updatedSpace = await this.spacesPort.updateSpace(spaceId, {
      name: command.name,
      type: command.type,
      color: command.color,
    });

    if (isRenaming) {
      this.eventEmitterService.emit(
        new SpaceRenamedEvent({
          userId,
          organizationId,
          source: command.source ?? 'ui',
          spaceId,
          spaceSlug: updatedSpace.slug,
          oldName: space.name,
          newName: updatedSpace.name,
        }),
      );
    }

    if (command.type !== undefined && command.type !== space.type) {
      this.eventEmitterService.emit(
        new SpaceVisibilityUpdatedEvent({
          userId,
          organizationId,
          source: command.source ?? 'ui',
          spaceId,
          newVisibility: command.type,
        }),
      );
    }

    return updatedSpace;
  }
}
```

- [ ] **Step 4: Verify `ISpacesPort.updateSpace` accepts the color field**

Open `packages/types/src/spaces/ports/ISpacesPort.ts` (or equivalent). Extend the `updateSpace` signature if it's narrowly typed:

```ts
updateSpace(
  spaceId: SpaceId,
  fields: { name?: string; type?: SpaceType; color?: SpaceColor },
): Promise<Space>;
```

If the adapter in `SpacesHexa` thin-wraps the service, the updated `SpaceService.updateSpace` signature from Task 6 already supports this — just propagate the type.

- [ ] **Step 5: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces-management --testFile=UpdateSpaceUseCase.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.ts packages/spaces-management/src/application/usecases/UpdateSpaceUseCase.spec.ts packages/types/src/spaces/ports/ISpacesPort.ts
git commit -m "feat(spaces-management): rework UpdateSpaceUseCase for identity updates"
```

---

## Task 9: Extend PATCH endpoint with color and new error mappings

**Files:**
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts` (lines 255-286)
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts`

- [ ] **Step 1: Write failing tests first**

Extend the controller spec with new cases under `describe('updateSpace')`. Add:

```ts
describe('when the body includes a color', () => {
  it('forwards color to the service', async () => {
    await controller.updateSpace(
      organizationId,
      spaceId,
      { color: 'purple' },
      request,
    );
    expect(spacesManagementService.updateSpace).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'purple' }),
    );
  });
});

describe('when the service throws CannotRenameDefaultSpaceError', () => {
  beforeEach(() => {
    spacesManagementService.updateSpace.mockRejectedValue(
      new CannotRenameDefaultSpaceError(spaceId),
    );
  });

  it('responds with 422', async () => {
    await expect(
      controller.updateSpace(organizationId, spaceId, { name: 'x' }, request),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('when the service throws SpaceIdentityUpdateForbiddenError', () => {
  beforeEach(() => {
    spacesManagementService.updateSpace.mockRejectedValue(
      new SpaceIdentityUpdateForbiddenError(userId, spaceId),
    );
  });

  it('responds with 403', async () => {
    await expect(
      controller.updateSpace(organizationId, spaceId, { name: 'x' }, request),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('when the service throws InvalidSpaceColorError', () => {
  beforeEach(() => {
    spacesManagementService.updateSpace.mockRejectedValue(
      new InvalidSpaceColorError('chartreuse'),
    );
  });

  it('responds with 400', async () => {
    await expect(
      controller.updateSpace(
        organizationId,
        spaceId,
        { color: 'chartreuse' as unknown as SpaceColor },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

Import the new errors at the top:

```ts
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { SpaceColor } from '@packmind/types';
```

- [ ] **Step 2: Run tests to verify failure**

Run: `./node_modules/.bin/nx test spaces-management --testFile=spaces-management.controller.spec.ts`
Expected: FAIL on the four new cases.

- [ ] **Step 3: Update the controller**

Edit `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts` lines 255-286.

Update the body type and service call:

```ts
@Patch(':spaceId')
async updateSpace(
  @Param('orgId') organizationId: OrganizationId,
  @Param('spaceId') spaceId: SpaceId,
  @Body() body: { name?: string; type?: SpaceType; color?: SpaceColor },
  @Req() request: AuthenticatedRequest,
): Promise<Space> {
  const userId = request.user.userId;

  this.logger.info(
    'PATCH /organizations/:orgId/spaces-management/:spaceId - Updating space',
    { organizationId, userId, spaceId },
  );

  try {
    return await this.spacesManagementService.updateSpace({
      userId,
      organizationId,
      spaceId,
      name: body.name?.trim() || undefined,
      type: body.type,
      color: body.color,
    });
  } catch (error) {
    if (error instanceof SpaceNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof SpaceSlugConflictError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof CannotRenameDefaultSpaceError) {
      throw new UnprocessableEntityException(error.message);
    }
    if (error instanceof SpaceIdentityUpdateForbiddenError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof InvalidSpaceColorError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
```

Add the required imports at the top of the file (error classes + `SpaceColor` from `@packmind/types` + `BadRequestException`, `ForbiddenException`, `UnprocessableEntityException` from `@nestjs/common` — some may already be present).

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces-management --testFile=spaces-management.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint + build**

Run: `./node_modules/.bin/nx lint spaces-management && ./node_modules/.bin/nx build api`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts
git commit -m "feat(api): accept color and map new errors on PATCH /spaces-management/:spaceId"
```

---

## Task 10: Extend frontend gateway + mutation signature

**Files:**
- Modify: `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts`
- Modify: `apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts`
- Modify: `apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts` (lines 253-288)

- [ ] **Step 1: Extend the gateway interface**

In `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts`, update the `updateSpace` signature. Import `SpaceColor`:

```ts
import {
  BrowseSpacesResponse,
  Space,
  SpaceColor,
  SpaceId,
  SpaceType,
} from '@packmind/types';
```

```ts
updateSpace(
  orgId: string,
  spaceId: SpaceId,
  fields: { name?: string; type?: SpaceType; color?: SpaceColor },
): Promise<Space>;
```

- [ ] **Step 2: Extend the implementation**

In `SpacesManagementGatewayApi.ts`, update the method signature to match (the axios call forwards the body unchanged):

```ts
async updateSpace(
  orgId: string,
  spaceId: SpaceId,
  fields: { name?: string; type?: SpaceType; color?: SpaceColor },
): Promise<Space> {
  if (!orgId) {
    throw new Error('Organization ID is required to update a space');
  }
  return this._api.patch<Space>(
    `${this._endpoint}/${orgId}/spaces-management/${spaceId}`,
    fields,
  );
}
```

And update the import to include `SpaceColor`.

- [ ] **Step 3: Extend the mutation type**

In `SpacesManagementQueries.ts` line 266, update the `fields` type in `useUpdateSpaceMutation`:

```ts
fields: { name?: string; type?: SpaceType; color?: SpaceColor };
```

Import `SpaceColor`:

```ts
import {
  ArtifactReference,
  BrowseSpacesResponse,
  SpaceColor,
  SpaceId,
  SpaceType,
} from '@packmind/types';
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/nx typecheck frontend`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts
git commit -m "feat(frontend): accept color in updateSpace gateway and mutation"
```

---

## Task 11: Migrate SpaceNavBlock to use persisted `space.color`

**Files:**
- Modify: `apps/frontend/src/domain/organizations/components/sidebar/SpaceNavBlock.tsx`

- [ ] **Step 1: Replace call sites and remove local duplicates**

Edit `apps/frontend/src/domain/organizations/components/sidebar/SpaceNavBlock.tsx`:

1. Delete lines 38-56 (the local `SPACE_COLOR_PALETTES` constant and `getSpaceColorPalette` function).
2. Keep `getSpaceInitials` (lines 58-65).
3. Replace the three call sites of `getSpaceColorPalette(space.name)` with `space.color`:
   - Line 198: `colorPalette={getSpaceColorPalette(space.name)}` → `colorPalette={space.color}`
   - Line 272: `backgroundColor={`${getSpaceColorPalette(space.name)}.solid`}` → `backgroundColor={`${space.color}.solid`}`
   - Line 365: `colorPalette={getSpaceColorPalette(space.name)}` → `colorPalette={space.color}`

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/nx typecheck frontend`
Expected: PASS (`UserSpaceWithRole` inherits `color` via the Space type extension in Task 1).

- [ ] **Step 3: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors (unused-import warnings should be zero — we kept the import list clean).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/domain/organizations/components/sidebar/SpaceNavBlock.tsx
git commit -m "feat(frontend): drive sidebar space color from persisted field"
```

---

## Task 12: Rewrite `SpaceIdentitySection` — real data, mutation, slug warning, disabled states

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx`
- Create: `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.spec.tsx`

- [ ] **Step 1: Write failing component tests first**

Create `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.spec.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpaceIdentitySection } from './SpaceIdentitySection';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';

// If a toast mock is required, follow the existing mocking pattern used in
// SpaceDangerZoneSection.spec.tsx (or similar). Otherwise, use the raw render.

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('SpaceIdentitySection', () => {
  describe('when canEdit is false', () => {
    const space = spaceFactory({ name: 'oddity', slug: 'oddity', color: 'blue' });

    it('disables the name input', () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={false} />);
      expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('disables the Save button', () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={false} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  describe('when the space is the default space', () => {
    const space = spaceFactory({
      isDefaultSpace: true,
      name: 'Global',
      slug: 'global',
      color: 'blue',
    });

    it('disables the name input', () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={true} />);
      expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('still allows editing the color', () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={true} />);
      const redSwatch = screen.getByLabelText('Select red color');
      expect(redSwatch).not.toBeDisabled();
    });
  });

  describe('when the name is changed so its slug no longer matches the saved slug', () => {
    const space = spaceFactory({ name: 'secrurity', slug: 'secrurity', color: 'blue' });

    it('shows the slug-mismatch warning', async () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={true} />);
      const input = screen.getByLabelText('Name');
      fireEvent.change(input, { target: { value: 'security' } });
      await waitFor(() => {
        expect(screen.getByText(/no longer matches the name/i)).toBeInTheDocument();
      });
    });
  });

  describe('when the form is clean', () => {
    const space = spaceFactory({ name: 'oddity', slug: 'oddity', color: 'blue' });

    it('keeps the Save button disabled', () => {
      renderWithProviders(<SpaceIdentitySection space={space} canEdit={true} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });
});
```

Note: The `vitest` vs `jest` choice depends on the project's frontend test runner (Nx config uses `@swc/jest` per CLAUDE.md, but frontend may differ). Inspect `apps/frontend/jest.config.ts` or the project-level config to determine which imports to use and adjust accordingly. If the project uses Jest, swap `vi.fn()` → `jest.fn()` and `vitest` imports for `@jest/globals` or globals.

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test frontend --testFile=SpaceIdentitySection.spec.tsx`
Expected: FAIL (component accepts no `space`/`canEdit` props yet).

- [ ] **Step 3: Rewrite the component**

Replace `apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import slug from 'slug';
import { Space, SPACE_COLOR_PALETTES, SpaceColor } from '@packmind/types';
import {
  PMButton,
  PMColorSwatch,
  PMField,
  PMHeading,
  PMHStack,
  PMInput,
  PMPageSection,
  PMVStack,
  PMText,
  toaster,
} from '@packmind/ui';
import { useUpdateSpaceMutation } from '../../spaces-management/api/queries/SpacesManagementQueries';
import { AxiosError } from 'axios';

interface SpaceIdentitySectionProps {
  space: Space;
  canEdit: boolean;
}

export function SpaceIdentitySection({
  space,
  canEdit,
}: SpaceIdentitySectionProps) {
  const [name, setName] = useState(space.name);
  const [selectedColor, setSelectedColor] = useState<SpaceColor>(space.color);
  const updateSpaceMutation = useUpdateSpaceMutation();

  const isDefaultSpace = space.isDefaultSpace;
  const nameDisabled = !canEdit || isDefaultSpace;
  const colorDisabled = !canEdit;

  const slugMismatchWarning = useMemo(() => {
    if (!name) return null;
    const candidate = slug(name);
    return candidate !== space.slug ? (
      <PMText variant="body" color="warning" fontSize="xs">
        The space URL will remain <code>/spaces/{space.slug}</code>, which no
        longer matches the name.
      </PMText>
    ) : null;
  }, [name, space.slug]);

  const hasChanges =
    (name !== space.name && !isDefaultSpace) || selectedColor !== space.color;

  const handleSave = async () => {
    const fields: { name?: string; color?: SpaceColor } = {};
    if (name !== space.name && !isDefaultSpace) fields.name = name;
    if (selectedColor !== space.color) fields.color = selectedColor;
    if (Object.keys(fields).length === 0) return;

    try {
      await updateSpaceMutation.mutateAsync({ spaceId: space.id, fields });
      toaster.create({
        type: 'success',
        title: 'Space updated',
      });
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      const messageByStatus: Record<number, string> = {
        400: 'Invalid color selected.',
        403: "You don't have permission to update this space.",
        409: 'Another space with a similar name already exists.',
        422: 'The default space cannot be renamed.',
      };
      toaster.create({
        type: 'error',
        title:
          (status !== undefined && messageByStatus[status]) ||
          'Failed to update the space.',
      });
    }
  };

  return (
    <PMPageSection
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Space identity
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMField.Root disabled={nameDisabled}>
          <PMField.Label>Name</PMField.Label>
          <PMInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
            disabled={nameDisabled}
            aria-label="Name"
          />
          {isDefaultSpace && (
            <PMField.HelperText>
              The default space cannot be renamed.
            </PMField.HelperText>
          )}
          {slugMismatchWarning}
        </PMField.Root>

        <PMField.Root disabled={colorDisabled}>
          <PMField.Label>Color</PMField.Label>
          <PMHStack gap={3} flexWrap="wrap">
            {SPACE_COLOR_PALETTES.map((color) => (
              <PMColorSwatch
                key={color}
                value={`{colors.${color}.solid}`}
                cursor={colorDisabled ? 'not-allowed' : 'pointer'}
                outline={selectedColor === color ? '2px solid' : 'none'}
                outlineColor={
                  selectedColor === color ? `${color}.solid` : undefined
                }
                outlineOffset="2px"
                transition="outline 0.15s"
                _hover={colorDisabled ? undefined : { opacity: 0.8 }}
                aria-label={`Select ${color} color`}
                aria-disabled={colorDisabled}
                onClick={() => !colorDisabled && setSelectedColor(color)}
              />
            ))}
          </PMHStack>
          <PMField.HelperText>
            This color is used to identify the space in the sidebar.
          </PMField.HelperText>
        </PMField.Root>

        <PMHStack justify="flex-end">
          <PMButton
            variant="secondary"
            onClick={handleSave}
            disabled={!canEdit || !hasChanges || updateSpaceMutation.isPending}
            loading={updateSpaceMutation.isPending}
          >
            Save changes
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
```

Notes:
- `toaster` / `PMText` imports may need adjustment to match the existing toast and text component APIs in `@packmind/ui`. Search for existing usages (e.g., `SpaceDangerZoneSection.tsx`) to copy the exact style.
- If `PMField.Root` doesn't accept a `disabled` prop for labeling children, set `disabled` on the `PMInput` and `aria-disabled` on the field wrapper. Verify against the existing Chakra component usage.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test frontend --testFile=SpaceIdentitySection.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck**

Run: `./node_modules/.bin/nx lint frontend && ./node_modules/.bin/nx typecheck frontend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceIdentitySection.tsx apps/frontend/src/domain/spaces/components/SpaceIdentitySection.spec.tsx
git commit -m "feat(frontend): wire SpaceIdentitySection to real data and mutation"
```

---

## Task 13: Update `SpaceGeneralSettings` — always render, pass `canEdit`

**Files:**
- Modify: `apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx`

- [ ] **Step 1: Update the component**

Replace `apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx`:

```tsx
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMFeatureFlag,
  PMVStack,
  SPACE_IDENTITY_FEATURE_KEY,
} from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceAccessSection } from './SpaceAccessSection';
import { SpaceDangerZoneSection } from './SpaceDangerZoneSection';
import { SpaceIdentitySection } from './SpaceIdentitySection';

export function SpaceGeneralSettings() {
  const { space, spaceId } = useCurrentSpace();
  const { user, organization } = useAuthContext();
  const { data } = useGetSpaceMembersQuery(spaceId ?? '');

  const currentUserMember = data?.members?.find((m) => m.userId === user?.id);
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const isOrgAdmin = organization?.role === 'admin';
  const canEditIdentity = isSpaceAdmin || isOrgAdmin;
  const canDeleteSpace = isSpaceAdmin || isOrgAdmin;

  return (
    <PMVStack align="stretch" gap={6} pt={4}>
      {space && (
        <PMFeatureFlag
          featureKeys={[SPACE_IDENTITY_FEATURE_KEY]}
          featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
          userEmail={user?.email}
        >
          <SpaceIdentitySection space={space} canEdit={canEditIdentity} />
        </PMFeatureFlag>
      )}
      {isSpaceAdmin && !space?.isDefaultSpace && <SpaceAccessSection />}
      {!space?.isDefaultSpace && (
        <SpaceDangerZoneSection canDeleteSpace={canDeleteSpace} />
      )}
    </PMVStack>
  );
}
```

Changes:
- Section now renders for any viewer (not just space admins) — EM technical rule "visible but disabled".
- `canEdit = isSpaceAdmin || isOrgAdmin` — covers Rule 1 Examples 1 + 2; Rule 1 Example 3 yields `canEdit=false`.
- The `space &&` guard ensures we don't render with `undefined` while loading.

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/nx typecheck frontend`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx
git commit -m "feat(frontend): always render SpaceIdentitySection and gate edit perms"
```

---

## Task 14: E2E tests covering Rules 1, 3, 5

**Files:**
- Create: `apps/e2e-tests/src/features/spaces-management/ManageSpaceIdentity.spec.ts`

- [ ] **Step 1: Follow the existing E2E authoring skill**

Read `apps/e2e-tests/` layout first to align with existing patterns (e.g., `PrivateSpaceAccess.spec.ts`, `MoveArtifacts.spec.ts`). Verify the Page Object Model patterns used. The test file name and describe structure should mirror those files.

- [ ] **Step 2: Create the E2E test file**

Create `apps/e2e-tests/src/features/spaces-management/ManageSpaceIdentity.spec.ts`. The structure should cover, as three top-level tests:

1. **Rule 1 Example 1 — space admin updates name + color, sees it reflected in the sidebar.**
2. **Rule 3 Example 1 — space admin attempts to rename "Security Connections" → "Security" when a sibling "Security" space exists; the form shows an error and the backend rejects with 409.**
3. **Rule 5 Example 1 — space admin on the default "Global" space updates the color; save succeeds; name input is disabled.**

Per the `cli-e2e-test-authoring` / `working-with-playground-app` conventions, use the existing test fixtures for organizations and spaces. Leverage helpers in `apps/e2e-tests/src/features/spaces-management/` for signup/signin/space-creation. If a helper for "create admin user + organization + space" doesn't exist, follow the pattern in `AddMembersToSpace.spec.ts`.

Because this file is long and duplicates existing scaffolding, the executor should:
1. Open `apps/e2e-tests/src/features/spaces-management/AddMembersToSpace.spec.ts` and use it as the structural template.
2. Copy the fixture-creation logic (beforeEach) and adapt for this feature.
3. Write three describe blocks — one per rule — each with its own test.

The test file must use real Playwright browser flows (not mocks).

- [ ] **Step 3: Run the E2E suite**

Run: `./node_modules/.bin/nx e2e e2e-tests --testFile=ManageSpaceIdentity.spec.ts`
Expected: PASS. If dependencies (Docker Compose, DB migrations) aren't running, the instructions in `apps/e2e-tests/README.md` cover the setup. Do NOT mark this task complete on environment errors — flag them back.

- [ ] **Step 4: Commit**

```bash
git add apps/e2e-tests/src/features/spaces-management/ManageSpaceIdentity.spec.ts
git commit -m "test(e2e): cover space identity update rules 1, 3, 5"
```

---

## Task 15: Final quality gates across affected projects

**Files:** (none — validation only)

- [ ] **Step 1: Lint all affected projects**

Run: `npm run lint:staged`
Expected: no errors.

- [ ] **Step 2: Test all affected projects**

Run: `npm run test:staged`
Expected: PASS.

- [ ] **Step 3: Build the API**

Run: `./node_modules/.bin/nx build api`
Expected: PASS.

- [ ] **Step 4: Build the frontend**

Run: `./node_modules/.bin/nx build frontend`
Expected: PASS.

- [ ] **Step 5: Manual verification**

- Start the stack (Docker Compose per CLAUDE.md).
- Sign in as an org admin.
- Navigate to a non-default space settings → update name and color → confirm the sidebar updates and the toast appears.
- Navigate to the default "Global" space settings → confirm the name input is disabled, but color saves successfully.
- Sign in as a non-admin member → confirm the Identity section is visible but disabled.
- Attempt a slug-colliding rename → confirm the toast with "Another space with a similar name already exists."

Fix any issues in place (no scope creep — stick to what the plan covers).

- [ ] **Step 6: No new commit required unless fixes were made.**

---

## Appendix — Task dependency graph

```
1 ─┬─ 2 ── 3
   └─ 4
3 ── 6
4 ── 7
5 ── 7
6, 7 ── 8
8 ── 9
1 ── 10
10 ── 12
1 ── 11
12 ── 13
13 ── 14
14 ── 15
```

Tasks 1, 4, 5 can be picked up in parallel by different executors.  All others are sequential per the graph.
