import {
  createTestDatasourceFixture,
  itHandlesDuplicateKeys,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { UserRepository } from './UserRepository';
import { createUserId, User } from '@packmind/types';
import { Organization } from '@packmind/types';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { userFactory, organizationFactory } from '../../../test';
import { PackmindLogger } from '@packmind/logger';

describe('UserRepository', () => {
  const fixture = createTestDatasourceFixture([
    UserSchema,
    OrganizationSchema,
    UserOrganizationMembershipSchema,
  ]);

  let userRepository: UserRepository;
  let organizationRepository: Repository<Organization>;
  let testOrganization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    logger = stubLogger();
    userRepository = new UserRepository(
      fixture.datasource.getRepository(UserSchema),
      logger,
    );
    organizationRepository =
      fixture.datasource.getRepository(OrganizationSchema);

    // Create a test organization that users can reference
    testOrganization = await organizationRepository.save(organizationFactory());
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

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
      fixture.datasource.getRepository(UserSchema).findOne({
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
    it('returns user matching the input', async () => {
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
    });

    describe('when user has null password hash and inactive status', () => {
      it('persists null password hash', async () => {
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

        expect(result.passwordHash).toBeNull();
      });

      it('persists inactive status', async () => {
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

        expect(result.active).toBe(false);
      });
    });
  });

  describe('.findById', () => {
    it('returns user with expected properties', async () => {
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

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        active: true,
      });
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
    it('returns user with expected properties', async () => {
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

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        active: true,
      });
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
    describe('when querying with different case', () => {
      it('returns user with expected properties', async () => {
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

        expect(result).toMatchObject({
          id: user.id,
          email: 'Vincent@Example.com',
          passwordHash: user.passwordHash,
        });
      });
    });

    describe('when querying with exact case', () => {
      it('returns user with expected properties', async () => {
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

        expect(result).toMatchObject({
          id: user.id,
          email: 'test@example.com',
        });
      });
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

    it('returns all users with expected length', async () => {
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
    });
  });
});
