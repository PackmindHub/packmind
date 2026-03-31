import { Repository } from 'typeorm';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import {
  OrganizationSchema,
  UserSchema,
  UserOrganizationMembershipSchema,
} from '@packmind/accounts';
import { SpaceSchema } from '../schemas/SpaceSchema';
import { UserSpaceMembershipSchema } from '../schemas/UserSpaceMembershipSchema';
import { spaceFactory } from '../../../test';
import {
  createUserId,
  createSpaceId,
  createOrganizationId,
  Organization,
  Space,
  UserSpaceMembership,
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
  let ormRepository: Repository<WithTimestamps<UserSpaceMembership>>;
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
        role: 'member',
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
      role: 'member',
      ...overrides,
    };
    return repository.addMembership(membership);
  };

  describe('.addMembership', () => {
    describe('when adding a valid membership', () => {
      let result: UserSpaceMembership;
      let userId: ReturnType<typeof createUserId>;

      beforeEach(async () => {
        userId = await createUserInOrg();
        result = await repository.addMembership({
          userId,
          spaceId: space.id,
          role: 'member',
        });
      });

      it('returns the created membership', () => {
        expect(result.userId).toEqual(userId);
        expect(result.spaceId).toEqual(space.id);
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
      let userId: ReturnType<typeof createUserId>;
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

      it('returns the membership', async () => {
        const found = await repository.findMembership(userId, space.id);
        expect(found).not.toBeNull();
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
      let userId: ReturnType<typeof createUserId>;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
      });

      it('returns all memberships for the user', async () => {
        const memberships = await repository.findByUserId(userId);
        expect(memberships).toHaveLength(1);
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

  describe('.findByUserAndOrganization', () => {
    describe('when user has memberships in the organization', () => {
      let userId: ReturnType<typeof createUserId>;

      beforeEach(async () => {
        const membership = await createMembership();
        userId = membership.userId;
      });

      it('returns memberships for spaces in that organization', async () => {
        const memberships = await repository.findByUserAndOrganization(
          userId,
          organization.id,
        );
        expect(memberships).toHaveLength(1);
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
});
