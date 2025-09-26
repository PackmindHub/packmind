import { UserService } from './UserService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, createUserId } from '../../domain/entities/User';
import { createOrganizationId } from '../../domain/entities/Organization';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { userFactory } from '../../../test';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockHash = jest.fn<Promise<string>, [string, number]>();
const mockCompare = jest.fn<Promise<boolean>, [string, string | null]>();

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailCaseInsensitive: jest.fn(),
      list: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    // Set up the mock implementations
    const bcrypt = jest.requireMock('bcrypt');
    bcrypt.hash = mockHash;
    bcrypt.compare = mockCompare;

    stubbedLogger = stubLogger();

    userService = new UserService(mockUserRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('.createUser', () => {
    beforeEach(() => {
      mockHash.mockResolvedValue('hashedpassword123');
    });

    it('creates a new user successfully', async () => {
      const email = 'testuser@packmind.com';
      const password = 'plainpassword';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const organization = createOrganizationId(organizationId);
      mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
      mockUserRepository.add.mockImplementation(async (user) => user);

      const result = await userService.createUser(
        email,
        password,
        organization,
      );

      expect(
        mockUserRepository.findByEmailCaseInsensitive,
      ).toHaveBeenCalledWith(email);
      expect(mockHash).toHaveBeenCalledWith(password, 10);
      expect(mockUserRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          passwordHash: 'hashedpassword123',
          active: true,
          memberships: [
            expect.objectContaining({
              organizationId: organization,
              role: 'admin',
            }),
          ],
        }),
      );
      expect(result.email).toBe(email);
      expect(result.active).toBe(true);
      expect(result.memberships).toEqual([
        expect.objectContaining({
          organizationId: organization,
          role: 'admin',
        }),
      ]);
    });

    describe('when email is missing', () => {
      it('throws error', async () => {
        const email = '';
        const password = 'plainpassword';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        await expect(
          userService.createUser(
            email,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow('Email, password, and organizationId are required');

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when password is missing', () => {
      it('throws error', async () => {
        const email = 'testuser@packmind.com';
        const password = '';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        await expect(
          userService.createUser(
            email,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow('Email, password, and organizationId are required');

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when organizationId is missing', () => {
      it('throws error', async () => {
        const email = 'testuser@packmind.com';
        const password = 'plainpassword';
        const organizationId = '';

        await expect(
          userService.createUser(
            email,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow('Email, password, and organizationId are required');

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when email already exists (case-insensitive)', () => {
      it('throws error for exact case match', async () => {
        const email = 'testuser@packmind.com';
        const password = 'plainpassword';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        const existingUser = userFactory({ email });
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );

        await expect(
          userService.createUser(
            email,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow(`Email '${email}' already exists`);

        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });

      it('throws error for different case match', async () => {
        const email = 'NewUser@packmind.com';
        const password = 'plainpassword';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        const existingUser = userFactory({
          email: 'newuser@PACKMIND.com', // Different case
        });

        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );

        await expect(
          userService.createUser(
            email,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow(`Email '${email}' already exists`);

        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });
  });

  describe('.getUserById', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
        const user = userFactory({
          id: userId,
          memberships: [
            {
              userId,
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174001',
              ),
              role: 'admin',
            },
          ],
        });

        mockUserRepository.findById.mockResolvedValue(user);

        const result = await userService.getUserById(userId);

        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      it('returns null', async () => {
        const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');

        mockUserRepository.findById.mockResolvedValue(null);

        const result = await userService.getUserById(userId);

        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
        expect(result).toBeNull();
      });
    });
  });

  describe('.getUserByEmail', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const email = 'testuser@packmind.com';
        const user = userFactory({
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          email,
          memberships: [
            {
              userId: createUserId('123e4567-e89b-12d3-a456-426614174000'),
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174001',
              ),
              role: 'admin',
            },
          ],
        });

        mockUserRepository.findByEmail.mockResolvedValue(user);

        const result = await userService.getUserByEmail(email);

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      it('returns null', async () => {
        const email = 'testuser@packmind.com';

        mockUserRepository.findByEmail.mockResolvedValue(null);

        const result = await userService.getUserByEmail(email);

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
        expect(result).toBeNull();
      });
    });
  });

  describe('.getUserByEmailCaseInsensitive', () => {
    describe('when user is found with different case', () => {
      it('returns the user', async () => {
        const searchEmail = 'TestUser@PACKMIND.com';
        const user = userFactory({
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          email: 'testuser@packmind.com', // Different case in database
          memberships: [
            {
              userId: createUserId('123e4567-e89b-12d3-a456-426614174000'),
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174001',
              ),
              role: 'admin',
            },
          ],
        });

        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(user);

        const result =
          await userService.getUserByEmailCaseInsensitive(searchEmail);

        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(searchEmail);
        expect(result).toEqual(user);
        expect(result?.email).toBe('testuser@packmind.com'); // Original case preserved
      });
    });

    describe('when user is found with same case', () => {
      it('returns the user', async () => {
        const email = 'testuser@packmind.com';
        const user = userFactory({
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          email,
          memberships: [
            {
              userId: createUserId('123e4567-e89b-12d3-a456-426614174000'),
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174001',
              ),
              role: 'admin',
            },
          ],
        });

        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(user);

        const result = await userService.getUserByEmailCaseInsensitive(email);

        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      it('returns null', async () => {
        const email = 'nonexistent@packmind.com';

        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);

        const result = await userService.getUserByEmailCaseInsensitive(email);

        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
        expect(result).toBeNull();
      });
    });
  });

  describe('.hashPassword', () => {
    it('hashes password with correct salt rounds', async () => {
      const password = 'plainpassword';
      const hashedPassword = 'hashedpassword123';

      mockHash.mockResolvedValue(hashedPassword);

      const result = await userService.hashPassword(password);

      expect(mockHash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('.validatePassword', () => {
    describe('when password matches hash', () => {
      it('returns true', async () => {
        const password = 'plainpassword';
        const hash = 'hashedpassword123';

        mockCompare.mockResolvedValue(true);

        const result = await userService.validatePassword(password, hash);

        expect(mockCompare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(true);
      });
    });

    describe('when password does not match hash', () => {
      it('returns false', async () => {
        const password = 'plainpassword';
        const hash = 'hashedpassword123';

        mockCompare.mockResolvedValue(false);

        const result = await userService.validatePassword(password, hash);

        expect(mockCompare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(false);
      });
    });

    describe('when stored hash is null', () => {
      it('returns false without invoking bcrypt', async () => {
        const password = 'plainpassword';

        const result = await userService.validatePassword(password, null);

        expect(mockCompare).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });
  });

  describe('.listUsers', () => {
    it('returns all users', async () => {
      const users: User[] = [
        {
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          email: 'testuser1@packmind.com',
          passwordHash: 'hashedpassword123',
          active: true,
          memberships: [
            {
              userId: createUserId('123e4567-e89b-12d3-a456-426614174000'),
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174001',
              ),
              role: 'admin',
            },
          ],
        },
        {
          id: createUserId('123e4567-e89b-12d3-a456-426614174001'),
          email: 'testuser2@packmind.com',
          passwordHash: 'hashedpassword456',
          active: true,
          memberships: [
            {
              userId: createUserId('123e4567-e89b-12d3-a456-426614174001'),
              organizationId: createOrganizationId(
                '123e4567-e89b-12d3-a456-426614174002',
              ),
              role: 'admin',
            },
          ],
        },
      ];

      mockUserRepository.list.mockResolvedValue(users);

      const result = await userService.listUsers();

      expect(mockUserRepository.list).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    describe('when no users exist', () => {
      it('returns empty array', async () => {
        mockUserRepository.list.mockResolvedValue([]);

        const result = await userService.listUsers();

        expect(mockUserRepository.list).toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
  });
});
