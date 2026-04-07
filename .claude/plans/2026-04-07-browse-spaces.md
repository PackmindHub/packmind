# Browse Spaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to browse all visible spaces in their organization and self-join open spaces.

**Architecture:** New `BrowseSpacesUseCase` and `JoinSpaceUseCase` in `packages/spaces-management` (proprietary). Single browse endpoint returns both user's spaces and discoverable spaces. Frontend drawer component adapted from playground prototype.

**Tech Stack:** NestJS, TypeORM, React, TanStack Query, Chakra UI (PM-prefixed), Jest

**Spec:** `.claude/specs/2026-04-07-browse-spaces-design.md`

---

## File Structure

### Backend (packages/types)
- **Create:** `packages/types/src/spaces-management/contracts/IBrowseSpacesUseCase.ts` — Command/Response types for browse
- **Create:** `packages/types/src/spaces-management/contracts/IJoinSpaceUseCase.ts` — Command/Response types for join
- **Modify:** `packages/types/src/spaces-management/contracts/index.ts` — Add barrel exports
- **Modify:** `packages/types/src/spaces-management/ports/ISpacesManagementPort.ts` — Add browseSpaces + joinSpace methods

### Backend (packages/spaces-management)
- **Create:** `packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.ts` — Use case logic
- **Create:** `packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.spec.ts` — Tests
- **Create:** `packages/spaces-management/src/application/usecases/JoinSpaceUseCase.ts` — Use case logic
- **Create:** `packages/spaces-management/src/application/usecases/JoinSpaceUseCase.spec.ts` — Tests
- **Modify:** `packages/spaces-management/src/application/adapters/SpacesManagementAdapter.ts` — Wire new use cases
- **Modify:** `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts` — New endpoints
- **Modify:** `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts` — Tests
- **Modify:** `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts` — New service methods
- **Modify:** `packages/spaces-management/src/index.ts` — Export new use cases

### Frontend
- **Modify:** `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts` — Add browse + join methods
- **Modify:** `apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts` — Implement methods
- **Modify:** `apps/frontend/src/domain/spaces-management/api/queryKeys.ts` — Add browse key
- **Modify:** `apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts` — Add query + mutation hooks
- **Create:** `apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.tsx` — Drawer component
- **Modify:** `apps/frontend/src/domain/spaces-management/components/BrowseSpaces.tsx` — Wire drawer to entry point
- **Create:** `apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx` — Tests

---

### Task 1: Browse Spaces Contract Types

**Files:**
- Create: `packages/types/src/spaces-management/contracts/IBrowseSpacesUseCase.ts`
- Create: `packages/types/src/spaces-management/contracts/IJoinSpaceUseCase.ts`
- Modify: `packages/types/src/spaces-management/contracts/index.ts`
- Modify: `packages/types/src/spaces-management/ports/ISpacesManagementPort.ts`

- [ ] **Step 1: Create IBrowseSpacesUseCase contract**

```typescript
// packages/types/src/spaces-management/contracts/IBrowseSpacesUseCase.ts
import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';
import { SpaceId } from '../../spaces/SpaceId';

export type BrowsableSpace = {
  id: SpaceId;
  name: string;
  type: SpaceType;
};

export type BrowseSpacesCommand = PackmindCommand;

export type BrowseSpacesResponse = {
  mySpaces: Space[];
  allSpaces: BrowsableSpace[];
};

export type IBrowseSpacesUseCase = IUseCase<
  BrowseSpacesCommand,
  BrowseSpacesResponse
>;
```

- [ ] **Step 2: Create IJoinSpaceUseCase contract**

```typescript
// packages/types/src/spaces-management/contracts/IJoinSpaceUseCase.ts
import { IUseCase, PackmindCommand } from '../../UseCase';

export type JoinSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type JoinSpaceResponse = void;

export type IJoinSpaceUseCase = IUseCase<JoinSpaceCommand, JoinSpaceResponse>;
```

- [ ] **Step 3: Update contracts barrel export**

Add to `packages/types/src/spaces-management/contracts/index.ts`:

```typescript
export * from './IBrowseSpacesUseCase';
export * from './IJoinSpaceUseCase';
```

- [ ] **Step 4: Add methods to ISpacesManagementPort**

In `packages/types/src/spaces-management/ports/ISpacesManagementPort.ts`, add imports and methods:

```typescript
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
} from '../contracts/IBrowseSpacesUseCase';
import {
  JoinSpaceCommand,
  JoinSpaceResponse,
} from '../contracts/IJoinSpaceUseCase';
```

Add to interface:

```typescript
  /**
   * Browse spaces: returns user's spaces and discoverable (open/restricted) spaces.
   */
  browseSpaces(command: BrowseSpacesCommand): Promise<BrowseSpacesResponse>;

  /**
   * Self-join an open space.
   */
  joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse>;
```

- [ ] **Step 5: Verify types build**

Run: `./node_modules/.bin/nx build types`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/spaces-management/
git commit -m "✨ feat(types): add BrowseSpaces and JoinSpace contracts and port methods"
```

---

### Task 2: BrowseSpacesUseCase

**Files:**
- Create: `packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.spec.ts`
- Create: `packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.spec.ts
import {
  BrowseSpacesCommand,
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { BrowseSpacesUseCase } from './BrowseSpacesUseCase';

describe('BrowseSpacesUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  let useCase: BrowseSpacesUseCase;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      | 'listUserSpaces'
      | 'listSpacesByOrganization'
      | 'findMembershipsByUserAndOrganization'
    >
  >;

  const buildCommand = (
    overrides?: Partial<BrowseSpacesCommand>,
  ): BrowseSpacesCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      listUserSpaces: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      findMembershipsByUserAndOrganization: jest.fn(),
    };

    useCase = new BrowseSpacesUseCase(spacesPort as unknown as ISpacesPort);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the user belongs to some spaces', () => {
    const memberSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'My Team',
      organizationId,
      type: SpaceType.open,
    });

    const openSpace = spaceFactory({
      id: createSpaceId('space-2'),
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    const restrictedSpace = spaceFactory({
      id: createSpaceId('space-3'),
      name: 'Restricted Space',
      organizationId,
      type: SpaceType.restricted,
    });

    const privateSpace = spaceFactory({
      id: createSpaceId('space-4'),
      name: 'Secret Space',
      organizationId,
      type: SpaceType.private,
    });

    const defaultSpace = spaceFactory({
      id: createSpaceId('space-default'),
      name: 'Global',
      organizationId,
      type: SpaceType.open,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [defaultSpace, memberSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([
        defaultSpace,
        memberSpace,
        openSpace,
        restrictedSpace,
        privateSpace,
      ]);
      spacesPort.findMembershipsByUserAndOrganization.mockResolvedValue([
        {
          userId,
          spaceId: defaultSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
        {
          userId,
          spaceId: memberSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
      ]);
    });

    it('returns user spaces in mySpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.mySpaces).toEqual([defaultSpace, memberSpace]);
    });

    it('returns open and restricted non-member spaces in allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([
        { id: openSpace.id, name: openSpace.name, type: SpaceType.open },
        {
          id: restrictedSpace.id,
          name: restrictedSpace.name,
          type: SpaceType.restricted,
        },
      ]);
    });

    it('excludes private spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const privateIds = result.allSpaces.filter(
        (s) => s.type === SpaceType.private,
      );
      expect(privateIds).toEqual([]);
    });

    it('excludes default space from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const defaultIds = result.allSpaces.filter(
        (s) => s.id === defaultSpace.id,
      );
      expect(defaultIds).toEqual([]);
    });

    it('excludes already-member spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const memberIds = result.allSpaces.filter(
        (s) => s.id === memberSpace.id,
      );
      expect(memberIds).toEqual([]);
    });
  });

  describe('when there are no discoverable spaces', () => {
    const memberSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'Only Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [memberSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([memberSpace]);
      spacesPort.findMembershipsByUserAndOrganization.mockResolvedValue([
        {
          userId,
          spaceId: memberSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
      ]);
    });

    it('returns empty allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces-management -- --testPathPattern=BrowseSpacesUseCase`
Expected: FAIL — cannot find `./BrowseSpacesUseCase`

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.ts
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  BrowsableSpace,
  createOrganizationId,
  createUserId,
  ISpacesPort,
  SpaceType,
} from '@packmind/types';

export class BrowseSpacesUseCase {
  constructor(private readonly spacesPort: ISpacesPort) {}

  async execute(command: BrowseSpacesCommand): Promise<BrowseSpacesResponse> {
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const [userSpacesResponse, allOrgSpaces, memberships] = await Promise.all([
      this.spacesPort.listUserSpaces(command),
      this.spacesPort.listSpacesByOrganization(organizationId),
      this.spacesPort.findMembershipsByUserAndOrganization(
        userId,
        organizationId,
      ),
    ]);

    const memberSpaceIds = new Set(memberships.map((m) => m.spaceId));

    const allSpaces: BrowsableSpace[] = allOrgSpaces
      .filter(
        (space) =>
          !memberSpaceIds.has(space.id) &&
          !space.isDefaultSpace &&
          (space.type === SpaceType.open || space.type === SpaceType.restricted),
      )
      .map((space) => ({
        id: space.id,
        name: space.name,
        type: space.type,
      }));

    return {
      mySpaces: userSpacesResponse.spaces,
      allSpaces,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces-management -- --testPathPattern=BrowseSpacesUseCase`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.ts packages/spaces-management/src/application/usecases/BrowseSpacesUseCase.spec.ts
git commit -m "✨ feat(spaces-management): add BrowseSpacesUseCase with tests"
```

---

### Task 3: JoinSpaceUseCase

**Files:**
- Create: `packages/spaces-management/src/application/usecases/JoinSpaceUseCase.spec.ts`
- Create: `packages/spaces-management/src/application/usecases/JoinSpaceUseCase.ts`
- Create: `packages/spaces-management/src/domain/errors/SpaceNotJoinableError.ts`

- [ ] **Step 1: Create the error class**

```typescript
// packages/spaces-management/src/domain/errors/SpaceNotJoinableError.ts
export class SpaceNotJoinableError extends Error {
  constructor(spaceId: string) {
    super(`Space ${spaceId} is not joinable`);
    this.name = 'SpaceNotJoinableError';
  }
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// packages/spaces-management/src/application/usecases/JoinSpaceUseCase.spec.ts
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISpacesPort,
  JoinSpaceCommand,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { JoinSpaceUseCase } from './JoinSpaceUseCase';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

describe('JoinSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  let useCase: JoinSpaceUseCase;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      'getSpaceById' | 'findMembership' | 'addSpaceMembership'
    >
  >;

  const buildCommand = (
    overrides?: Partial<JoinSpaceCommand>,
  ): JoinSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId: spaceId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn(),
      addSpaceMembership: jest.fn(),
    };

    useCase = new JoinSpaceUseCase(spacesPort as unknown as ISpacesPort);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when joining an open space successfully', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue(null);
      spacesPort.addSpaceMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('adds the user as a member', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not add a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the space belongs to another organization', () => {
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      name: 'Other Org Space',
      organizationId: createOrganizationId('other-org'),
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(otherOrgSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is private', () => {
    const privateSpace = spaceFactory({
      id: spaceId,
      name: 'Private Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(privateSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is restricted', () => {
    const restrictedSpace = spaceFactory({
      id: spaceId,
      name: 'Restricted Space',
      organizationId,
      type: SpaceType.restricted,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(restrictedSpace);
    });

    it('throws SpaceNotJoinableError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotJoinableError,
      );
    });
  });

  describe('when the user is already a member', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('does not add a duplicate membership', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `./node_modules/.bin/nx test spaces-management -- --testPathPattern=JoinSpaceUseCase`
Expected: FAIL — cannot find `./JoinSpaceUseCase`

- [ ] **Step 4: Write minimal implementation**

```typescript
// packages/spaces-management/src/application/usecases/JoinSpaceUseCase.ts
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISpacesPort,
  JoinSpaceCommand,
  JoinSpaceResponse,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

export class JoinSpaceUseCase {
  constructor(private readonly spacesPort: ISpacesPort) {}

  async execute(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    if (space.type === SpaceType.private) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    if (space.type === SpaceType.restricted) {
      throw new SpaceNotJoinableError(command.spaceId);
    }

    const existingMembership = await this.spacesPort.findMembership(
      userId,
      spaceId,
    );

    if (existingMembership) {
      return;
    }

    await this.spacesPort.addSpaceMembership({
      userId,
      spaceId,
      role: UserSpaceRole.MEMBER,
      createdBy: userId,
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `./node_modules/.bin/nx test spaces-management -- --testPathPattern=JoinSpaceUseCase`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add packages/spaces-management/src/application/usecases/JoinSpaceUseCase.ts packages/spaces-management/src/application/usecases/JoinSpaceUseCase.spec.ts packages/spaces-management/src/domain/errors/SpaceNotJoinableError.ts
git commit -m "✨ feat(spaces-management): add JoinSpaceUseCase with tests"
```

---

### Task 4: Wire Use Cases into Adapter, Service, and Controller

**Files:**
- Modify: `packages/spaces-management/src/application/adapters/SpacesManagementAdapter.ts`
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts`
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts`
- Modify: `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts`
- Modify: `packages/spaces-management/src/index.ts`

- [ ] **Step 1: Update SpacesManagementAdapter**

In `packages/spaces-management/src/application/adapters/SpacesManagementAdapter.ts`, add imports:

```typescript
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  JoinSpaceCommand,
  JoinSpaceResponse,
} from '@packmind/types';
import { BrowseSpacesUseCase } from '../usecases/BrowseSpacesUseCase';
import { JoinSpaceUseCase } from '../usecases/JoinSpaceUseCase';
```

Add methods to the class:

```typescript
  async browseSpaces(
    command: BrowseSpacesCommand,
  ): Promise<BrowseSpacesResponse> {
    const useCase = new BrowseSpacesUseCase(this.spacesPort);
    return useCase.execute(command);
  }

  async joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    const useCase = new JoinSpaceUseCase(this.spacesPort);
    return useCase.execute(command);
  }
```

- [ ] **Step 2: Update SpacesManagementService**

In `packages/spaces-management/src/nest-api/spaces-management/spaces-management.service.ts`, add imports:

```typescript
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  JoinSpaceCommand,
  JoinSpaceResponse,
} from '@packmind/types';
```

Add methods:

```typescript
  async browseSpaces(
    command: BrowseSpacesCommand,
  ): Promise<BrowseSpacesResponse> {
    this.logger.info('Browsing spaces', {
      organizationId: command.organizationId,
    });
    return this.spacesManagementAdapter.browseSpaces(command);
  }

  async joinSpace(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    this.logger.info('Joining space', {
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });
    return this.spacesManagementAdapter.joinSpace(command);
  }
```

- [ ] **Step 3: Update SpacesManagementController**

In `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.ts`, add imports:

```typescript
import {
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param as NestParam,
} from '@nestjs/common';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { BrowseSpacesResponse } from '@packmind/types';
```

Note: `Get` needs to be added to the existing `@nestjs/common` import. `Param` is already imported — add an alias or reuse it. Add new endpoints:

```typescript
  /**
   * Browse spaces in the organization
   * GET /organizations/:orgId/spaces-management/browse
   */
  @Get('browse')
  async browseSpaces(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<BrowseSpacesResponse> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces-management/browse - Browsing spaces',
      {
        organizationId,
        userId,
      },
    );

    return this.spacesManagementService.browseSpaces({
      userId,
      organizationId,
    });
  }

  /**
   * Self-join an open space
   * POST /organizations/:orgId/spaces-management/:spaceId/join
   */
  @Post(':spaceId/join')
  @HttpCode(204)
  async joinSpace(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces-management/:spaceId/join - Joining space',
      {
        organizationId,
        userId,
        spaceId,
      },
    );

    try {
      await this.spacesManagementService.joinSpace({
        userId,
        organizationId,
        spaceId,
      });
    } catch (error) {
      if (error instanceof SpaceNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SpaceNotJoinableError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
```

- [ ] **Step 4: Write controller tests**

Add to `packages/spaces-management/src/nest-api/spaces-management/spaces-management.controller.spec.ts`:

Update the mock service in `beforeEach`:

```typescript
    service = {
      createSpace: jest.fn(),
      moveArtifactsToSpace: jest.fn(),
      browseSpaces: jest.fn(),
      joinSpace: jest.fn(),
    } as unknown as jest.Mocked<SpacesManagementService>;
```

Add new describe blocks after existing ones:

```typescript
  describe('browseSpaces', () => {
    describe('when browsing spaces successfully', () => {
      const mockResponse = {
        mySpaces: [
          spaceFactory({
            id: createSpaceId('space-1'),
            name: 'My Space',
            organizationId,
          }),
        ],
        allSpaces: [
          {
            id: createSpaceId('space-2'),
            name: 'Open Space',
            type: SpaceType.open,
          },
        ],
      };

      let result: typeof mockResponse;

      beforeEach(async () => {
        service.browseSpaces.mockResolvedValue(mockResponse);
        result = await controller.browseSpaces(organizationId, mockRequest);
      });

      it('returns the browse response', () => {
        expect(result).toEqual(mockResponse);
      });

      it('calls service with correct params', () => {
        expect(service.browseSpaces).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
        });
      });
    });
  });

  describe('joinSpace', () => {
    const spaceId = 'space-1';

    describe('when joining a space successfully', () => {
      beforeEach(async () => {
        service.joinSpace.mockResolvedValue(undefined);
        await controller.joinSpace(organizationId, spaceId, mockRequest);
      });

      it('calls service with correct params', () => {
        expect(service.joinSpace).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
          spaceId,
        });
      });
    });

    describe('when the space is not found', () => {
      beforeEach(() => {
        service.joinSpace.mockRejectedValue(
          new SpaceNotFoundError(spaceId),
        );
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.joinSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('when the space is not joinable', () => {
      beforeEach(() => {
        service.joinSpace.mockRejectedValue(
          new SpaceNotJoinableError(spaceId),
        );
      });

      it('throws ForbiddenException', async () => {
        await expect(
          controller.joinSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
```

Add imports for `NotFoundException`, `ForbiddenException`, `BrowseSpacesResponse` and the error classes:

```typescript
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';
```

- [ ] **Step 5: Update barrel exports**

In `packages/spaces-management/src/index.ts`, add:

```typescript
export { BrowseSpacesUseCase } from './application/usecases/BrowseSpacesUseCase';
export { JoinSpaceUseCase } from './application/usecases/JoinSpaceUseCase';
export { SpaceNotJoinableError } from './domain/errors/SpaceNotJoinableError';
```

- [ ] **Step 6: Run all spaces-management tests**

Run: `./node_modules/.bin/nx test spaces-management`
Expected: ALL PASS

- [ ] **Step 7: Lint**

Run: `./node_modules/.bin/nx lint spaces-management`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add packages/spaces-management/src/
git commit -m "✨ feat(spaces-management): wire BrowseSpaces and JoinSpace into adapter, service, and controller"
```

---

### Task 5: Frontend Gateway and Query Hooks

**Files:**
- Modify: `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts`
- Modify: `apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts`
- Modify: `apps/frontend/src/domain/spaces-management/api/queryKeys.ts`
- Modify: `apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts`

- [ ] **Step 1: Update ISpacesManagementGateway**

In `apps/frontend/src/domain/spaces-management/api/gateways/ISpacesManagementGateway.ts`, add:

```typescript
import { BrowseSpacesResponse, SpaceId } from '@packmind/types';
```

Add to interface:

```typescript
  browseSpaces(orgId: string): Promise<BrowseSpacesResponse>;
  joinSpace(orgId: string, spaceId: SpaceId): Promise<void>;
```

- [ ] **Step 2: Update SpacesManagementGatewayApi**

In `apps/frontend/src/domain/spaces-management/api/gateways/SpacesManagementGatewayApi.ts`, add import:

```typescript
import { BrowseSpacesResponse, SpaceId } from '@packmind/types';
```

Add methods:

```typescript
  async browseSpaces(orgId: string): Promise<BrowseSpacesResponse> {
    if (!orgId) {
      throw new Error('Organization ID is required to browse spaces');
    }
    return this._api.get<BrowseSpacesResponse>(
      `${this._endpoint}/${orgId}/spaces-management/browse`,
    );
  }

  async joinSpace(orgId: string, spaceId: SpaceId): Promise<void> {
    if (!orgId) {
      throw new Error('Organization ID is required to join a space');
    }
    return this._api.post(
      `${this._endpoint}/${orgId}/spaces-management/${spaceId}/join`,
      {},
    );
  }
```

- [ ] **Step 3: Update query keys**

In `apps/frontend/src/domain/spaces-management/api/queryKeys.ts`:

```typescript
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SPACES_MANAGEMENT_SCOPE = 'spaces-management' as const;

export enum SpacesManagementQueryKey {
  CREATE = 'create',
  BROWSE = 'browse',
}

export const spacesManagementQueryKeys = {
  all: [ORGANIZATION_QUERY_SCOPE, SPACES_MANAGEMENT_SCOPE] as const,
  browse: (orgId: string) =>
    [
      ORGANIZATION_QUERY_SCOPE,
      SPACES_MANAGEMENT_SCOPE,
      SpacesManagementQueryKey.BROWSE,
      orgId,
    ] as const,
};
```

- [ ] **Step 4: Add query and mutation hooks**

In `apps/frontend/src/domain/spaces-management/api/queries/SpacesManagementQueries.ts`, add imports:

```typescript
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowseSpacesResponse, SpaceId } from '@packmind/types';
import { spacesManagementQueryKeys } from '../queryKeys';
```

Add the browse query and join mutation:

```typescript
export const getBrowseSpacesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: spacesManagementQueryKeys.browse(orgId),
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Organization ID is required to browse spaces');
      }
      return spacesManagementGateway.browseSpaces(orgId);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const useBrowseSpacesQuery = () => {
  const { organization } = useAuthContext();
  const orgId = organization?.id;
  return useQuery(getBrowseSpacesQueryOptions(orgId || ''));
};

const JOIN_SPACE_MUTATION_KEY = 'joinSpace';

export const useJoinSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [JOIN_SPACE_MUTATION_KEY],
    mutationFn: async ({ spaceId }: { spaceId: SpaceId }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.joinSpace(organization.id, spaceId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...spacesManagementQueryKeys.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [...spacesQueryKeys.all],
        }),
      ]);
    },
  });
};
```

Note: You'll need to add the `spacesQueryKeys` import — it's already imported in the file for the create mutation's onSuccess.

- [ ] **Step 5: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/domain/spaces-management/api/
git commit -m "✨ feat(frontend): add browse spaces gateway, query hooks, and join mutation"
```

---

### Task 6: BrowseSpacesDrawer Component

**Files:**
- Create: `apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.tsx`

- [ ] **Step 1: Create the drawer component**

Adapt the playground's `BrowseSpacesDrawer.tsx` from mock data to real props. Key changes from playground:
- Remove category grouping (flat list)
- Use `getSpaceColorPalette(space.name)` from SpaceNavBlock for space colors instead of `space.color`
- Use `BrowsableSpace` type from `@packmind/types` for "All spaces" tab
- Accept `onJoinSpace` callback for the Join button
- No pinning (removed from scope — can be added later)

```typescript
// apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.tsx
import React, { useState } from 'react';
import type { RefObject } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMIcon,
  PMInput,
  PMPortal,
  PMStatus,
  PMText,
} from '@packmind/ui';
import { LuUserPlus, LuPlus } from 'react-icons/lu';
import type { Space, BrowsableSpace, SpaceId } from '@packmind/types';
import { getSpaceColorPalette } from '../../organizations/components/sidebar/SpaceNavBlock';

interface BrowseSpacesDrawerProps {
  mySpaces: Space[];
  allSpaces: BrowsableSpace[];
  open: boolean;
  onClose: () => void;
  onSpaceClick: (space: Space) => void;
  onJoinSpace: (spaceId: SpaceId) => void;
  onCreateSpace: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}

export function BrowseSpacesDrawer({
  mySpaces,
  allSpaces,
  open,
  onClose,
  onSpaceClick,
  onJoinSpace,
  onCreateSpace,
  containerRef,
}: Readonly<BrowseSpacesDrawerProps>) {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMySpaces = searchQuery.trim()
    ? mySpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : mySpaces;

  const filteredAllSpaces = searchQuery.trim()
    ? allSpaces.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allSpaces;

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="start"
      size="sm"
    >
      <PMPortal container={containerRef}>
        <PMDrawer.Backdrop position="absolute" />
        <PMDrawer.Positioner position="absolute">
          <PMDrawer.Content>
            <PMDrawer.Header paddingBottom={0} borderBottomWidth="0">
              <PMDrawer.CloseTrigger asChild pos="initial">
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
              <PMDrawer.Title fontSize="sm" flex={1}>
                Spaces
              </PMDrawer.Title>
              <PMButton
                size="xs"
                variant="secondary"
                onClick={onCreateSpace}
                data-testid="browse-spaces-new-button"
              >
                <PMIcon fontSize="xs">
                  <LuPlus />
                </PMIcon>
                New
              </PMButton>
            </PMDrawer.Header>

            <PMBox
              paddingX={4}
              borderBottomWidth="1px"
              borderColor="{colors.border.tertiary}"
            >
              <PMHStack gap={0}>
                <TabButton
                  label="My spaces"
                  isActive={activeTab === 'my'}
                  onClick={() => setActiveTab('my')}
                />
                <TabButton
                  label="All spaces"
                  isActive={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                />
              </PMHStack>
            </PMBox>

            <PMBox paddingX={3} paddingTop={3} paddingBottom={1} flexShrink={0}>
              <PMInput
                placeholder="Search spaces…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                data-testid="browse-spaces-search"
              />
            </PMBox>

            <PMDrawer.Body paddingX={1} paddingY={2}>
              {activeTab === 'my' && (
                <MySpacesTab
                  spaces={filteredMySpaces}
                  searchQuery={searchQuery}
                  onSpaceClick={onSpaceClick}
                />
              )}
              {activeTab === 'all' && (
                <AllSpacesTab
                  spaces={filteredAllSpaces}
                  searchQuery={searchQuery}
                  onJoinSpace={onJoinSpace}
                />
              )}
            </PMDrawer.Body>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      paddingX={3}
      paddingY={1.5}
      fontSize="xs"
      fontWeight="medium"
      borderBottomWidth="2px"
      borderColor={isActive ? 'text.primary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.faded'}
      cursor="pointer"
      _hover={isActive ? undefined : { color: 'text.secondary' }}
      data-testid={`browse-spaces-tab-${label.toLowerCase().replace(' ', '-')}`}
    >
      {label}
    </PMBox>
  );
}

function MySpacesTab({
  spaces,
  searchQuery,
  onSpaceClick,
}: Readonly<{
  spaces: Space[];
  searchQuery: string;
  onSpaceClick: (space: Space) => void;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          No spaces matching &ldquo;{searchQuery}&rdquo;
        </PMText>
      </PMBox>
    );
  }

  return (
    <>
      {spaces.map((space) => (
        <PMBox
          key={space.id}
          role="group"
          display="flex"
          alignItems="center"
          gap={2}
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
          _hover={{ bg: 'bg.muted' }}
          cursor="pointer"
          onClick={() => onSpaceClick(space)}
          data-testid={`browse-spaces-my-${space.id}`}
        >
          <PMStatus.Root
            colorPalette={getSpaceColorPalette(space.name)}
            as="span"
            mr={1}
          >
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMText
            fontSize="sm"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {space.name}
          </PMText>
        </PMBox>
      ))}
    </>
  );
}

function AllSpacesTab({
  spaces,
  searchQuery,
  onJoinSpace,
}: Readonly<{
  spaces: BrowsableSpace[];
  searchQuery: string;
  onJoinSpace: (spaceId: SpaceId) => void;
}>) {
  if (spaces.length === 0) {
    return (
      <PMBox paddingX={3} paddingY={8} textAlign="center">
        <PMText color="faded" fontSize="xs">
          No spaces matching &ldquo;{searchQuery}&rdquo;
        </PMText>
      </PMBox>
    );
  }

  return (
    <>
      {spaces.map((space) => (
        <PMHStack
          key={space.id}
          gap={2}
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
          _hover={{ bg: 'bg.muted' }}
          data-testid={`browse-spaces-all-${space.id}`}
        >
          <PMStatus.Root
            colorPalette={getSpaceColorPalette(space.name)}
            as="span"
            mr={1}
          >
            <PMStatus.Indicator />
          </PMStatus.Root>
          <PMText
            flex={1}
            minW={0}
            fontSize="sm"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {space.name}
          </PMText>
          {space.type === 'open' && (
            <PMButton
              size="xs"
              variant="secondary"
              onClick={() => onJoinSpace(space.id)}
              data-testid={`browse-spaces-join-${space.id}`}
            >
              <PMIcon fontSize="xs">
                <LuUserPlus />
              </PMIcon>
              Join
            </PMButton>
          )}
        </PMHStack>
      ))}
    </>
  );
}
```

Note: `getSpaceColorPalette` must be exported from `SpaceNavBlock.tsx`. Check if it's already exported — if not, add `export` to the function declaration.

- [ ] **Step 2: Verify `getSpaceColorPalette` is exported**

Check `apps/frontend/src/domain/organizations/components/sidebar/SpaceNavBlock.tsx`. If `getSpaceColorPalette` is not exported, add `export` keyword to the function. If it's a non-exported local function, add `export` before `function getSpaceColorPalette`.

- [ ] **Step 3: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.tsx apps/frontend/src/domain/organizations/components/sidebar/SpaceNavBlock.tsx
git commit -m "✨ feat(frontend): add BrowseSpacesDrawer component"
```

---

### Task 7: Wire BrowseSpaces Entry Point

**Files:**
- Modify: `apps/frontend/src/domain/spaces-management/components/BrowseSpaces.tsx`

- [ ] **Step 1: Update BrowseSpaces component**

Replace the current stub with the real implementation that shows the drawer trigger and wires up the drawer:

```typescript
// apps/frontend/src/domain/spaces-management/components/BrowseSpaces.tsx
import React, { useState } from 'react';
import { PMIconButton } from '@packmind/ui';
import { LuCompass } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import type { Space } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { BrowseSpacesDrawer } from './BrowseSpacesDrawer';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import {
  useBrowseSpacesQuery,
  useJoinSpaceMutation,
} from '../api/queries/SpacesManagementQueries';

export function BrowseSpaces(): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { data } = useBrowseSpacesQuery();
  const joinMutation = useJoinSpaceMutation();

  const handleSpaceClick = (space: Space) => {
    if (organization?.slug) {
      navigate(routes.space(organization.slug, space.slug));
    }
    setIsDrawerOpen(false);
  };

  const handleJoinSpace = (spaceId: string) => {
    joinMutation.mutate({ spaceId });
  };

  return (
    <>
      <PMIconButton
        aria-label="Browse spaces"
        size="2xs"
        variant="ghost"
        onClick={() => setIsDrawerOpen(true)}
        data-testid="browse-spaces-trigger"
      >
        <LuCompass />
      </PMIconButton>
      <BrowseSpacesDrawer
        mySpaces={data?.mySpaces ?? []}
        allSpaces={data?.allSpaces ?? []}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSpaceClick={handleSpaceClick}
        onJoinSpace={handleJoinSpace}
        onCreateSpace={() => {
          setIsDrawerOpen(false);
          setIsCreateDialogOpen(true);
        }}
      />
      <CreateSpaceDialog
        open={isCreateDialogOpen}
        setOpen={setIsCreateDialogOpen}
      />
    </>
  );
}
```

Note: Check that `routes.space(orgSlug, spaceSlug)` exists. Search for the `routes` utility to find the correct function signature. If it doesn't exist, use inline URL construction like `` `/${organization.slug}/${space.slug}` ``.

- [ ] **Step 2: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/domain/spaces-management/components/BrowseSpaces.tsx
git commit -m "✨ feat(frontend): wire BrowseSpacesDrawer into BrowseSpaces entry point"
```

---

### Task 8: Frontend Tests

**Files:**
- Create: `apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx`

- [ ] **Step 1: Write component tests**

Follow the pattern from `CreateSpaceDialog.test.tsx`:

```typescript
// apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import { SpaceType } from '@packmind/types';
import { BrowseSpacesDrawer } from './BrowseSpacesDrawer';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

describe('BrowseSpacesDrawer', () => {
  const mySpaces = [
    {
      id: 'space-1',
      name: 'My Team',
      slug: 'my-team',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: false,
    },
    {
      id: 'space-2',
      name: 'Default',
      slug: 'default',
      type: SpaceType.open,
      organizationId: 'org-1',
      isDefaultSpace: true,
    },
  ];

  const allSpaces = [
    { id: 'space-3', name: 'Open Space', type: SpaceType.open },
    { id: 'space-4', name: 'Restricted Space', type: SpaceType.restricted },
  ];

  const defaultProps = {
    mySpaces,
    allSpaces,
    open: true,
    onClose: jest.fn(),
    onSpaceClick: jest.fn(),
    onJoinSpace: jest.fn(),
    onCreateSpace: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the drawer is open on My spaces tab', () => {
    it('renders user spaces', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      expect(screen.getByText('My Team')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('navigates to space on click', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-my-space-1'));

      expect(defaultProps.onSpaceClick).toHaveBeenCalledWith(mySpaces[0]);
    });
  });

  describe('when switching to All spaces tab', () => {
    it('renders discoverable spaces with join button for open type', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));

      expect(screen.getByText('Open Space')).toBeInTheDocument();
      expect(
        screen.getByTestId('browse-spaces-join-space-3'),
      ).toBeInTheDocument();
    });

    it('does not render join button for restricted spaces', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));

      expect(screen.getByText('Restricted Space')).toBeInTheDocument();
      expect(
        screen.queryByTestId('browse-spaces-join-space-4'),
      ).not.toBeInTheDocument();
    });

    it('calls onJoinSpace when clicking join', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-tab-all-spaces'));
      fireEvent.click(screen.getByTestId('browse-spaces-join-space-3'));

      expect(defaultProps.onJoinSpace).toHaveBeenCalledWith('space-3');
    });
  });

  describe('when searching', () => {
    it('filters my spaces by name', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      const searchInput = screen.getByTestId('browse-spaces-search');
      fireEvent.change(searchInput, { target: { value: 'Team' } });

      expect(screen.getByText('My Team')).toBeInTheDocument();
      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });

    it('shows empty state when no match', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      const searchInput = screen.getByTestId('browse-spaces-search');
      fireEvent.change(searchInput, { target: { value: 'zzzzz' } });

      expect(screen.getByText(/No spaces matching/)).toBeInTheDocument();
    });
  });

  describe('when clicking New button', () => {
    it('calls onCreateSpace', () => {
      renderWithProviders(<BrowseSpacesDrawer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('browse-spaces-new-button'));

      expect(defaultProps.onCreateSpace).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `./node_modules/.bin/nx test frontend -- --testPathPattern=BrowseSpacesDrawer`
Expected: ALL PASS (if the component is already created in Task 6)

- [ ] **Step 3: Run all frontend tests**

Run: `./node_modules/.bin/nx test frontend`
Expected: ALL PASS

- [ ] **Step 4: Lint**

Run: `./node_modules/.bin/nx lint frontend`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/domain/spaces-management/components/BrowseSpacesDrawer.test.tsx
git commit -m "✅ test(frontend): add BrowseSpacesDrawer component tests"
```

---

### Task 9: Final Validation

- [ ] **Step 1: Run all affected tests**

```bash
./node_modules/.bin/nx test spaces-management && ./node_modules/.bin/nx test frontend
```

Expected: ALL PASS

- [ ] **Step 2: Run all affected lints**

```bash
./node_modules/.bin/nx lint spaces-management && ./node_modules/.bin/nx lint frontend && ./node_modules/.bin/nx lint types
```

Expected: No errors

- [ ] **Step 3: Build check**

```bash
./node_modules/.bin/nx build types && ./node_modules/.bin/nx build spaces-management
```

Expected: BUILD SUCCESS
