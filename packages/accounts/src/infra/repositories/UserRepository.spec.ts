import { DataSource, Repository } from 'typeorm';
import { UserRepository } from './UserRepository';
import { createUserId, User } from '../../domain/entities/User';
import { Organization } from '../../domain/entities/Organization';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import {
  makeTestDatasource,
  itHandlesSoftDelete,
  itHandlesDuplicateKeys,
} from '@packmind/shared/test';
import { userFactory, organizationFactory } from '../../../test';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('UserRepository', () => {
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let organizationRepository: Repository<Organization>;
  let testOrganization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([UserSchema, OrganizationSchema]);
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
      userFactory({
        organizationId: testOrganization.id,
      }),
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
      userFactory({
        organizationId: testOrganization.id,
        ...overrides,
      }),
    getRepository: () => userRepository,
    duplicateFields: ['username'],
    expectedErrorMessage: (user) =>
      `Username '${user.username}' already exists`,
  });

  describe('.add', () => {
    it('adds a new user successfully', async () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        organizationId: testOrganization.id,
      });

      const result = await userRepository.add(user);

      expect(result).toEqual(user);
      expect(result.id).toBe(user.id);
      expect(result.username).toBe(user.username);
      expect(result.passwordHash).toBe(user.passwordHash);
      expect(result.organizationId).toBe(user.organizationId);
    });
  });

  describe('.findById', () => {
    it('finds user by ID', async () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        organizationId: testOrganization.id,
      });
      await userRepository.add(user);

      const result = await userRepository.findById(user.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.username).toBe(user.username);
      expect(result?.passwordHash).toBe(user.passwordHash);
      expect(result?.organizationId).toBe(user.organizationId);
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

  describe('.findByUsername', () => {
    it('finds user by username', async () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        username: 'uniqueuser',
        organizationId: testOrganization.id,
      });
      await userRepository.add(user);

      const result = await userRepository.findByUsername(user.username);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.username).toBe(user.username);
      expect(result?.passwordHash).toBe(user.passwordHash);
      expect(result?.organizationId).toBe(user.organizationId);
    });

    describe('when username is not found', () => {
      it('returns null', async () => {
        const nonExistentUsername = 'nonexistentuser';

        const result = await userRepository.findByUsername(nonExistentUsername);

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
      const user1 = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        username: 'user1',
        organizationId: testOrganization.id,
      });

      const user2 = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174001'),
        username: 'user2',
        organizationId: testOrganization.id,
      });

      await userRepository.add(user1);
      await userRepository.add(user2);

      const result = await userRepository.list();

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.username)).toContain('user1');
      expect(result.map((u) => u.username)).toContain('user2');
    });
  });
});
