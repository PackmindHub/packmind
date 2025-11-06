import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
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
  let dataSource: DataSource;
  let repository: UserOrganizationMembershipRepository;
  let ormRepository: Repository<WithTimestamps<UserOrganizationMembership>>;
  let organization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([
      OrganizationSchema,
      UserSchema,
      UserOrganizationMembershipSchema,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    ormRepository = dataSource.getRepository(UserOrganizationMembershipSchema);
    repository = new UserOrganizationMembershipRepository(
      ormRepository,
      logger,
    );

    organization = await createOrganization(dataSource, {
      id: createOrganizationId(uuidv4()),
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await dataSource.destroy();
  });

  const createMembership = async () => {
    const userId = createUserId(uuidv4());
    await createUser(dataSource, {
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
    it('removes an existing membership and returns true', async () => {
      const userId = await createMembership();

      const removed = await repository.removeMembership(
        userId,
        organization.id,
      );

      expect(removed).toBe(true);

      const membership = await ormRepository.findOne({
        where: {
          userId,
          organizationId: organization.id,
        },
      });
      expect(membership).toBeNull();
    });

    it('returns false if no membership exists', async () => {
      const removed = await repository.removeMembership(
        createUserId(uuidv4()),
        organization.id,
      );

      expect(removed).toBe(false);
    });
  });

  describe('.updateRole', () => {
    it('updates an existing membership role and returns true', async () => {
      const userId = await createMembership();

      const updated = await repository.updateRole(
        userId,
        organization.id,
        'admin',
      );

      expect(updated).toBe(true);

      const membership = await ormRepository.findOne({
        where: {
          userId,
          organizationId: organization.id,
        },
      });
      expect(membership?.role).toBe('admin');
    });

    it('returns false if no membership exists', async () => {
      const updated = await repository.updateRole(
        createUserId(uuidv4()),
        organization.id,
        'admin',
      );

      expect(updated).toBe(false);
    });

    it('updates role from admin to member', async () => {
      const userId = createUserId(uuidv4());
      await createUser(dataSource, {
        id: userId,
        memberships: [
          {
            userId,
            organizationId: organization.id,
            role: 'admin',
          },
        ],
      });

      const updated = await repository.updateRole(
        userId,
        organization.id,
        'member',
      );

      expect(updated).toBe(true);

      const membership = await ormRepository.findOne({
        where: {
          userId,
          organizationId: organization.id,
        },
      });
      expect(membership?.role).toBe('member');
    });

    it('handles transaction rollback on database error', async () => {
      const userId = await createMembership();

      // Mock a database error by creating a repository with invalid connection
      const invalidRepository = new UserOrganizationMembershipRepository(
        {} as Repository<WithTimestamps<UserOrganizationMembership>>, // Invalid repository
        logger,
      );

      await expect(
        invalidRepository.updateRole(userId, organization.id, 'admin'),
      ).rejects.toThrow();
    });
  });
});
