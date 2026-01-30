import { Repository } from 'typeorm';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { UserSchema } from '../schemas/UserSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { createOrganization, createUser } from '../../../test';
import { createOrganizationId } from '@packmind/types';
import { createUserId } from '@packmind/types';
import { Organization } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { WithTimestamps } from '@packmind/types';
import { UserOrganizationMembership } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { UserOrganizationMembershipRepository } from './UserOrganizationMembershipRepository';

describe('UserOrganizationMembershipRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    UserSchema,
    UserOrganizationMembershipSchema,
  ]);

  let repository: UserOrganizationMembershipRepository;
  let ormRepository: Repository<WithTimestamps<UserOrganizationMembership>>;
  let organization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    logger = stubLogger();
    ormRepository = fixture.datasource.getRepository(
      UserOrganizationMembershipSchema,
    );
    repository = new UserOrganizationMembershipRepository(
      ormRepository,
      logger,
    );

    organization = await createOrganization(fixture.datasource, {
      id: createOrganizationId(uuidv4()),
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  const createMembership = async () => {
    const userId = createUserId(uuidv4());
    await createUser(fixture.datasource, {
      id: userId,
      memberships: [
        {
          userId,
          organizationId: organization.id,
          role: 'member',
        },
      ],
    });

    return userId;
  };

  describe('.removeMembership', () => {
    describe('when membership exists', () => {
      let userId: ReturnType<typeof createUserId>;
      let removed: boolean;

      beforeEach(async () => {
        userId = await createMembership();
        removed = await repository.removeMembership(userId, organization.id);
      });

      it('returns true', async () => {
        expect(removed).toBe(true);
      });

      it('deletes the membership from the database', async () => {
        const membership = await ormRepository.findOne({
          where: {
            userId,
            organizationId: organization.id,
          },
        });
        expect(membership).toBeNull();
      });
    });

    describe('when membership does not exist', () => {
      it('returns false', async () => {
        const removed = await repository.removeMembership(
          createUserId(uuidv4()),
          organization.id,
        );

        expect(removed).toBe(false);
      });
    });
  });

  describe('.updateRole', () => {
    describe('when updating member to admin', () => {
      let userId: ReturnType<typeof createUserId>;
      let updated: boolean;

      beforeEach(async () => {
        userId = await createMembership();
        updated = await repository.updateRole(userId, organization.id, 'admin');
      });

      it('returns true', async () => {
        expect(updated).toBe(true);
      });

      it('updates the role in the database', async () => {
        const membership = await ormRepository.findOne({
          where: {
            userId,
            organizationId: organization.id,
          },
        });
        expect(membership?.role).toBe('admin');
      });
    });

    describe('when updating admin to member', () => {
      let userId: ReturnType<typeof createUserId>;
      let updated: boolean;

      beforeEach(async () => {
        userId = createUserId(uuidv4());
        await createUser(fixture.datasource, {
          id: userId,
          memberships: [
            {
              userId,
              organizationId: organization.id,
              role: 'admin',
            },
          ],
        });
        updated = await repository.updateRole(
          userId,
          organization.id,
          'member',
        );
      });

      it('returns true', async () => {
        expect(updated).toBe(true);
      });

      it('updates the role in the database', async () => {
        const membership = await ormRepository.findOne({
          where: {
            userId,
            organizationId: organization.id,
          },
        });
        expect(membership?.role).toBe('member');
      });
    });

    describe('when membership does not exist', () => {
      it('returns false', async () => {
        const updated = await repository.updateRole(
          createUserId(uuidv4()),
          organization.id,
          'admin',
        );

        expect(updated).toBe(false);
      });
    });

    describe('when database error occurs', () => {
      it('throws an error', async () => {
        const userId = await createMembership();

        const invalidRepository = new UserOrganizationMembershipRepository(
          {} as Repository<WithTimestamps<UserOrganizationMembership>>,
          logger,
        );

        await expect(
          invalidRepository.updateRole(userId, organization.id, 'admin'),
        ).rejects.toThrow();
      });
    });
  });
});
