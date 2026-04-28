import { Repository } from 'typeorm';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import {
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  UserSchema,
} from '@packmind/accounts';
import { SpaceSchema } from '../schemas/SpaceSchema';
import { UserSpaceMembershipSchema } from '../schemas/UserSpaceMembershipSchema';
import { spaceFactory } from '../../../test';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Organization,
  Space,
  UserId,
  UserSpaceMembership,
  UserSpaceRole,
  WithSoftDelete,
  WithTimestamps,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { v4 as uuidv4 } from 'uuid';
import { UserSpaceMembershipRepository } from './UserSpaceMembershipRepository';

describe('UserSpaceMembershipRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    UserSchema,
    UserOrganizationMembershipSchema,
    SpaceSchema,
    UserSpaceMembershipSchema,
  ]);

  let repository: UserSpaceMembershipRepository;
  let ormRepository: Repository<
    WithSoftDelete<WithTimestamps<UserSpaceMembership>>
  >;
  let organization: Organization;
  let space: Space;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    logger = stubLogger();
    ormRepository = fixture.datasource.getRepository(UserSpaceMembershipSchema);
    repository = new UserSpaceMembershipRepository(ormRepository, logger);

    organization = await fixture.datasource
      .getRepository(OrganizationSchema)
      .save({
        id: createOrganizationId(uuidv4()),
        name: 'Test Organization',
        slug: 'test-org',
      });

    const spaceData = spaceFactory({
      organizationId: organization.id,
    });
    space = await fixture.datasource.getRepository(SpaceSchema).save(spaceData);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  const createUserInOrg = async () => {
    const userId = createUserId(uuidv4());
    await fixture.datasource.getRepository(UserSchema).save({
      id: userId,
      email: `${uuidv4()}@test.com`,
      passwordHash: null,
      active: true,
      trial: false,
    });
    await fixture.datasource
      .getRepository(UserOrganizationMembershipSchema)
      .save({
        userId,
        organizationId: organization.id,
        role: UserSpaceRole.MEMBER,
      });
    return userId;
  };

  const createMembership = async (
    overrides: Partial<UserSpaceMembership> = {},
  ) => {
    const userId = overrides.userId ?? (await createUserInOrg());
    const membership: UserSpaceMembership = {
      userId,
      spaceId: space.id,
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
      ...overrides,
    };
    return repository.addMembership(membership);
  };

  describe('.addMembership', () => {
    describe('when adding a valid membership', () => {
      let result: UserSpaceMembership;
      let userId: UserId;

      beforeEach(async () => {
        userId = await createUserInOrg();
        result = await repository.addMembership({
          userId,
          spaceId: space.id,
          role: UserSpaceRole.MEMBER,
          pinned: false,
          createdBy: userId,
          updatedBy: userId,
        });
      });

      it('returns the correct userId', () => {
        expect(result.userId).toEqual(userId);
      });

      it('returns the correct spaceId', () => {
        expect(result.spaceId).toEqual(space.id);
      });

      it('returns the correct role', () => {
        expect(result.role).toBe('member');
      });

      it('persists the membership in the database', async () => {
        const found = await ormRepository.findOne({
          where: { userId, spaceId: space.id },
        });
        expect(found).not.toBeNull();
      });
    });
  });

  describe('.removeMembership', () => {
    describe('when membership exists', () => {
      let userId: UserId;
      let removed: boolean;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
        removed = await repository.removeMembership(userId, space.id);
      });

      it('returns true', () => {
        expect(removed).toBe(true);
      });

      it('deletes the membership from the database', async () => {
        const found = await ormRepository.findOne({
          where: { userId, spaceId: space.id },
        });
        expect(found).toBeNull();
      });
    });

    describe('when membership does not exist', () => {
      it('returns false', async () => {
        const removed = await repository.removeMembership(
          createUserId(uuidv4()),
          space.id,
        );
        expect(removed).toBe(false);
      });
    });
  });

  describe('.findMembership', () => {
    describe('when membership exists', () => {
      let userId: ReturnType<typeof createUserId>;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
      });

      it('returns a non-null result', async () => {
        const found = await repository.findMembership(userId, space.id);
        expect(found).not.toBeNull();
      });

      it('returns the correct userId', async () => {
        const found = await repository.findMembership(userId, space.id);
        expect(found?.userId).toEqual(userId);
      });
    });

    describe('when membership does not exist', () => {
      it('returns null', async () => {
        const found = await repository.findMembership(
          createUserId(uuidv4()),
          space.id,
        );
        expect(found).toBeNull();
      });
    });
  });

  describe('.findByUserId', () => {
    describe('when user has memberships', () => {
      let userId: UserId;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
      });

      it('returns one membership', async () => {
        const memberships = await repository.findByUserId(userId);
        expect(memberships).toHaveLength(1);
      });

      it('returns the membership with the correct userId', async () => {
        const memberships = await repository.findByUserId(userId);
        expect(memberships[0].userId).toEqual(userId);
      });
    });

    describe('when user has no memberships', () => {
      it('returns an empty array', async () => {
        const memberships = await repository.findByUserId(
          createUserId(uuidv4()),
        );
        expect(memberships).toEqual([]);
      });
    });
  });

  describe('.findBySpaceId', () => {
    describe('when space has memberships', () => {
      beforeEach(async () => {
        await createMembership();
      });

      it('returns all memberships for the space', async () => {
        const memberships = await repository.findBySpaceId(space.id);
        expect(memberships).toHaveLength(1);
      });
    });

    describe('when space has no memberships', () => {
      it('returns an empty array', async () => {
        const memberships = await repository.findBySpaceId(
          createSpaceId(uuidv4()),
        );
        expect(memberships).toEqual([]);
      });
    });
  });

  describe('.softDeleteBySpaceId', () => {
    const deletedBy = 'test-actor-id';

    describe('when the space has active memberships', () => {
      let affectedCount: number;

      beforeEach(async () => {
        await createMembership();
        await createMembership();
        affectedCount = await repository.softDeleteBySpaceId(
          space.id,
          deletedBy,
        );
      });

      it('returns the count of affected memberships', () => {
        expect(affectedCount).toBe(2);
      });

      it('sets deletedAt on the soft-deleted memberships', async () => {
        const memberships = await ormRepository.find({
          where: { spaceId: space.id },
          withDeleted: true,
        });
        expect(memberships.every((m) => m.deletedAt !== null)).toBe(true);
      });

      it('sets deletedBy on the soft-deleted memberships', async () => {
        const memberships = await ormRepository.find({
          where: { spaceId: space.id },
          withDeleted: true,
        });
        expect(memberships.every((m) => m.deletedBy === deletedBy)).toBe(true);
      });

      it('excludes soft-deleted memberships from findBySpaceId', async () => {
        const memberships = await repository.findBySpaceId(space.id);
        expect(memberships).toEqual([]);
      });
    });

    describe('when the space has no memberships', () => {
      it('returns zero', async () => {
        const affectedCount = await repository.softDeleteBySpaceId(
          space.id,
          deletedBy,
        );
        expect(affectedCount).toBe(0);
      });
    });

    describe('when memberships belong to another space', () => {
      let otherSpaceMembershipCount: number;

      beforeEach(async () => {
        const otherSpace = await fixture.datasource
          .getRepository(SpaceSchema)
          .save(
            spaceFactory({
              organizationId: organization.id,
              slug: 'other-space',
              name: 'Other Space',
            }),
          );

        await createMembership({ spaceId: otherSpace.id });
        await repository.softDeleteBySpaceId(space.id, deletedBy);
        const remaining = await repository.findBySpaceId(otherSpace.id);
        otherSpaceMembershipCount = remaining.length;
      });

      it('does not affect them', () => {
        expect(otherSpaceMembershipCount).toBe(1);
      });
    });

    describe('when called again on already soft-deleted memberships', () => {
      it('returns zero without error', async () => {
        await createMembership();
        await repository.softDeleteBySpaceId(space.id, deletedBy);

        const secondCallCount = await repository.softDeleteBySpaceId(
          space.id,
          deletedBy,
        );
        expect(secondCallCount).toBe(0);
      });
    });
  });

  describe('.findByUserAndOrganization', () => {
    describe('when user has memberships in the organization', () => {
      let userId: UserId;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
      });

      it('returns one membership', async () => {
        const memberships = await repository.findByUserAndOrganization(
          userId,
          organization.id,
        );
        expect(memberships).toHaveLength(1);
      });

      it('returns the membership with the correct userId', async () => {
        const memberships = await repository.findByUserAndOrganization(
          userId,
          organization.id,
        );
        expect(memberships[0].userId).toEqual(userId);
      });
    });

    describe('when user has no memberships in the organization', () => {
      it('returns an empty array', async () => {
        const memberships = await repository.findByUserAndOrganization(
          createUserId(uuidv4()),
          organization.id,
        );
        expect(memberships).toEqual([]);
      });
    });
  });

  describe('.findAdminsForSpaceIds', () => {
    const createUserInOrgWithDisplayName = async (
      overrides: {
        displayName?: string | null;
        email?: string;
      } = {},
    ) => {
      const userId = createUserId(uuidv4());
      const email = overrides.email ?? `${uuidv4()}@test.com`;
      await fixture.datasource.getRepository(UserSchema).save({
        id: userId,
        email,
        displayName: overrides.displayName ?? null,
        passwordHash: null,
        active: true,
        trial: false,
      });
      await fixture.datasource
        .getRepository(UserOrganizationMembershipSchema)
        .save({
          userId,
          organizationId: organization.id,
          role: UserSpaceRole.MEMBER,
        });
      return { userId, email };
    };

    describe('when there are admin and member memberships across spaces', () => {
      let spaceB: Space;
      let adminAUserId: UserId;
      let adminB1UserId: UserId;
      let adminB2UserId: UserId;
      let rows: Array<{
        spaceId: ReturnType<typeof createSpaceId>;
        user: { id: UserId; displayName: string };
      }>;

      beforeEach(async () => {
        spaceB = await fixture.datasource.getRepository(SpaceSchema).save(
          spaceFactory({
            organizationId: organization.id,
            slug: 'space-b',
            name: 'Space B',
          }),
        );

        const adminA = await createUserInOrgWithDisplayName({
          displayName: 'Admin A',
        });
        const adminB1 = await createUserInOrgWithDisplayName({
          displayName: 'Admin B1',
        });
        const adminB2 = await createUserInOrgWithDisplayName({
          displayName: null,
          email: 'adminb2.long.handle@example.com',
        });
        const memberB = await createUserInOrgWithDisplayName({
          displayName: 'Member B',
        });

        adminAUserId = adminA.userId;
        adminB1UserId = adminB1.userId;
        adminB2UserId = adminB2.userId;

        await createMembership({
          userId: adminA.userId,
          spaceId: space.id,
          role: UserSpaceRole.ADMIN,
        });
        await createMembership({
          userId: adminB1.userId,
          spaceId: spaceB.id,
          role: UserSpaceRole.ADMIN,
        });
        await createMembership({
          userId: adminB2.userId,
          spaceId: spaceB.id,
          role: UserSpaceRole.ADMIN,
        });
        await createMembership({
          userId: memberB.userId,
          spaceId: spaceB.id,
          role: UserSpaceRole.MEMBER,
        });

        rows = await repository.findAdminsForSpaceIds([space.id, spaceB.id]);
      });

      it('returns one row per admin per space', () => {
        expect(rows).toHaveLength(3);
      });

      it('groups admins by space correctly', () => {
        const spaceAUserIds = rows
          .filter((r) => r.spaceId === space.id)
          .map((r) => r.user.id);
        const spaceBUserIds = rows
          .filter((r) => r.spaceId === spaceB.id)
          .map((r) => r.user.id);

        expect(spaceAUserIds).toEqual([adminAUserId]);
        expect(spaceBUserIds).toHaveLength(2);
        expect(new Set(spaceBUserIds)).toEqual(
          new Set([adminB1UserId, adminB2UserId]),
        );
      });

      it('excludes member-role memberships', () => {
        expect(rows.some((r) => r.user.displayName === 'Member B')).toBe(false);
      });

      it('uses User.displayName when present', () => {
        const adminA = rows.find((r) => r.user.id === adminAUserId);
        expect(adminA?.user.displayName).toBe('Admin A');
      });

      it('falls back to email local-part when displayName is null', () => {
        const adminB2 = rows.find((r) => r.user.id === adminB2UserId);
        expect(adminB2?.user.displayName).toBe('adminb2.long.handle');
      });
    });

    describe('when given an empty space ID list', () => {
      it('returns an empty array without querying', async () => {
        const rows = await repository.findAdminsForSpaceIds([]);
        expect(rows).toEqual([]);
      });
    });

    describe('when an admin membership has been soft-deleted', () => {
      it('is excluded from the results', async () => {
        const admin = await createUserInOrgWithDisplayName({
          displayName: 'Soft Deleted Admin',
        });
        await createMembership({
          userId: admin.userId,
          spaceId: space.id,
          role: UserSpaceRole.ADMIN,
        });
        await repository.softDeleteBySpaceId(space.id, 'tester');

        const rows = await repository.findAdminsForSpaceIds([space.id]);

        expect(rows).toEqual([]);
      });
    });
  });

  describe('.countByRoleForSpaceIds', () => {
    let spaceB: Space;

    beforeEach(async () => {
      spaceB = await fixture.datasource.getRepository(SpaceSchema).save(
        spaceFactory({
          organizationId: organization.id,
          slug: 'space-b',
          name: 'Space B',
        }),
      );
    });

    it('returns a Map of spaceId -> count for the requested role; spaces with zero are absent', async () => {
      await createMembership({ role: UserSpaceRole.MEMBER });
      await createMembership({ role: UserSpaceRole.MEMBER });
      await createMembership({ spaceId: spaceB.id, role: UserSpaceRole.ADMIN });

      const counts = await repository.countByRoleForSpaceIds(
        [space.id, spaceB.id],
        UserSpaceRole.MEMBER,
      );

      expect(counts.get(space.id)).toBe(2);
      expect(counts.has(spaceB.id)).toBe(false);
    });

    it('returns an empty Map for empty input', async () => {
      const counts = await repository.countByRoleForSpaceIds(
        [],
        UserSpaceRole.MEMBER,
      );
      expect(counts.size).toBe(0);
    });

    it('excludes soft-deleted memberships from the count', async () => {
      await createMembership({ role: UserSpaceRole.ADMIN });
      await createMembership({ role: UserSpaceRole.ADMIN });
      await repository.softDeleteBySpaceId(space.id, 'tester');

      const counts = await repository.countByRoleForSpaceIds(
        [space.id],
        UserSpaceRole.ADMIN,
      );

      expect(counts.has(space.id)).toBe(false);
    });
  });

  describe('.updateMembershipPinned', () => {
    describe('when membership exists', () => {
      let userId: UserId;

      beforeEach(async () => {
        const membership = await createMembership({ pinned: false });
        userId = membership.userId;
      });

      it('returns true', async () => {
        const result = await repository.updateMembershipPinned(
          userId,
          space.id,
          true,
        );
        expect(result).toBe(true);
      });

      it('persists the pinned status', async () => {
        await repository.updateMembershipPinned(userId, space.id, true);
        const found = await repository.findMembership(userId, space.id);
        expect(found?.pinned).toBe(true);
      });
    });

    describe('when unpinning a previously pinned membership', () => {
      let userId: UserId;

      beforeEach(async () => {
        const membership = await createMembership({ pinned: true });
        userId = membership.userId;
      });

      it('persists the unpinned status', async () => {
        await repository.updateMembershipPinned(userId, space.id, false);
        const found = await repository.findMembership(userId, space.id);
        expect(found?.pinned).toBe(false);
      });
    });

    describe('when membership does not exist', () => {
      it('returns false', async () => {
        const result = await repository.updateMembershipPinned(
          createUserId(uuidv4()),
          space.id,
          true,
        );
        expect(result).toBe(false);
      });
    });
  });
});
