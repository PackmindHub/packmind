import {
  itHandlesDuplicateKeys,
  itHandlesSoftDelete,
} from '@packmind/test-utils';
import { DataSource, Repository } from 'typeorm';
import { UserRepository } from './UserRepository';
import { createUserId, User } from '@packmind/types';
import { Organization } from '@packmind/types';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { makeTestDatasource } from '@packmind/test-utils';
import { userFactory, organizationFactory } from '../../../test';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';

describe('UserRepository', () => {
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let organizationRepository: Repository<Organization>;
  let testOrganization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([
      UserSchema,
      OrganizationSchema,
      UserOrganizationMembershipSchema,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    userRepository = new UserRepository(
      dataSource.getRepository(UserSchema),
      logger,
    );
    organizationRepository = dataSource.getRepository(OrganizationSchema);

    // Create a test organization that users can reference
    testOrganization = await organizationRepository.save(organizationFactory());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  itHandlesSoftDelete<User>({
    entityFactory: () =>
      (() => {
        const baseUser = userFactory();
        return {
          ...baseUser,
          memberships: baseUser.memberships.map((membership) => ({
            ...membership,
            organizationId: testOrganization.id,
          })),
        };
      })(),
    getRepository: () => userRepository,
    queryDeletedEntity: async (id) =>
      dataSource.getRepository(UserSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  itHandlesDuplicateKeys<User>({
    entityFactory: (overrides) =>
      (() => {
        const baseUser = userFactory(overrides);
        return {
          ...baseUser,
          memberships: baseUser.memberships.map((membership) => ({
            ...membership,
            organizationId: testOrganization.id,
          })),
        };
      })(),
    getRepository: () => userRepository,
    duplicateFields: ['email'],
    expectedErrorMessage: () => `Email 'testus***************' already exists`,
  });

  describe('.add', () => {
    it('adds a new user successfully', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id,
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });

      const result = await userRepository.add(user);

      expect(result).toEqual(user);
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.passwordHash).toBe(user.passwordHash);
      expect(result.active).toBe(true);
      expect(result.memberships).toMatchObject(user.memberships);
    });

    it('persists a user with null password hash and inactive status', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174010');
      const user = userFactory({
        id,
        passwordHash: null,
        active: false,
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });

      const result = await userRepository.add(user);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.passwordHash).toBeNull();
      expect(result.active).toBe(false);
      expect(result.memberships).toMatchObject(user.memberships);
    });
  });

  describe('.findById', () => {
    it('finds user by ID', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id,
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });
      await userRepository.add(user);

      const result = await userRepository.findById(user.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe(user.email);
      expect(result?.passwordHash).toBe(user.passwordHash);
      expect(result?.active).toBe(true);
      expect(result?.memberships).toMatchObject(user.memberships);
    });

    describe('when user is not found', () => {
      it('returns null', async () => {
        const nonExistentId = createUserId(
          '123e4567-e89b-12d3-a456-426614174999',
        );

        const result = await userRepository.findById(nonExistentId);

        expect(result).toBeNull();
      });
    });
  });

  describe('.findByEmail', () => {
    it('finds user by email', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id,
        email: 'uniqueuser@packmind.com',
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });
      await userRepository.add(user);

      const result = await userRepository.findByEmail(user.email);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe(user.email);
      expect(result?.passwordHash).toBe(user.passwordHash);
      expect(result?.active).toBe(true);
      expect(result?.memberships).toMatchObject(user.memberships);
    });

    describe('when email is not found', () => {
      it('returns null', async () => {
        const nonExistentEmail = 'nonexistentuser@packmind.com';

        const result = await userRepository.findByEmail(nonExistentEmail);

        expect(result).toBeNull();
      });
    });
  });

  describe('.findByEmailCaseInsensitive', () => {
    it('finds user by email with different case', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id,
        email: 'Vincent@Example.com',
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });
      await userRepository.add(user);

      const result = await userRepository.findByEmailCaseInsensitive(
        'vincent@EXAMPLE.com',
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe('Vincent@Example.com'); // Original case preserved
      expect(result?.passwordHash).toBe(user.passwordHash);
      expect(result?.memberships).toMatchObject(user.memberships);
    });

    it('finds user by email with exact case', async () => {
      const id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id,
        email: 'test@example.com',
        memberships: [
          {
            userId: id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });
      await userRepository.add(user);

      const result =
        await userRepository.findByEmailCaseInsensitive('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe('test@example.com');
    });

    describe('when email is not found', () => {
      it('returns null', async () => {
        const nonExistentEmail = 'nonexistentuser@packmind.com';

        const result =
          await userRepository.findByEmailCaseInsensitive(nonExistentEmail);

        expect(result).toBeNull();
      });
    });
  });

  describe('.list', () => {
    describe('when no users exist', () => {
      it('returns empty array', async () => {
        const result = await userRepository.list();

        expect(result).toEqual([]);
      });
    });

    it('returns all users', async () => {
      const user1Id = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user1 = userFactory({
        id: user1Id,
        email: 'user1@packmind.com',
        memberships: [
          {
            userId: user1Id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });

      const user2Id = createUserId('123e4567-e89b-12d3-a456-426614174001');
      const user2 = userFactory({
        id: user2Id,
        email: 'user2@packmind.com',
        memberships: [
          {
            userId: user2Id,
            organizationId: testOrganization.id,
            role: 'admin',
          },
        ],
      });

      await userRepository.add(user1);
      await userRepository.add(user2);

      const result = await userRepository.list();

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.email)).toContain('user1@packmind.com');
      expect(result.map((u) => u.email)).toContain('user2@packmind.com');
      expect(result.every((u) => typeof u.active === 'boolean')).toBe(true);
    });
  });
});
