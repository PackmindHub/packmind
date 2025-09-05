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
const mockCompare = jest.fn<Promise<boolean>, [string, string]>();

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
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
      const username = 'testuser';
      const password = 'plainpassword';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      mockUserRepository.add.mockResolvedValue({
        id: expect.any(String),
        username,
        passwordHash: 'hashedpassword123',
        organizationId: createOrganizationId(organizationId),
      });

      const result = await userService.createUser(
        username,
        password,
        createOrganizationId(organizationId),
      );

      expect(mockHash).toHaveBeenCalledWith(password, 10);
      expect(mockUserRepository.add).toHaveBeenCalledWith({
        id: expect.any(String),
        username,
        passwordHash: 'hashedpassword123',
        organizationId: createOrganizationId(organizationId),
      });
      expect(result.username).toBe(username);
      expect(result.organizationId).toBe(organizationId);
    });

    describe('when username is missing', () => {
      it('throws error', async () => {
        const username = '';
        const password = 'plainpassword';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        await expect(
          userService.createUser(
            username,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow(
          'Username, password, and organizationId are required',
        );

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when password is missing', () => {
      it('throws error', async () => {
        const username = 'testuser';
        const password = '';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        await expect(
          userService.createUser(
            username,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow(
          'Username, password, and organizationId are required',
        );

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when organizationId is missing', () => {
      it('throws error', async () => {
        const username = 'testuser';
        const password = 'plainpassword';
        const organizationId = '';

        await expect(
          userService.createUser(
            username,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow(
          'Username, password, and organizationId are required',
        );

        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when username already exists', () => {
      it('throws error', async () => {
        const username = 'testuser';
        const password = 'plainpassword';
        const organizationId = '123e4567-e89b-12d3-a456-426614174001';

        mockUserRepository.add.mockRejectedValue(
          new Error("Username 'testuser' already exists"),
        );

        await expect(
          userService.createUser(
            username,
            password,
            createOrganizationId(organizationId),
          ),
        ).rejects.toThrow("Username 'testuser' already exists");

        expect(mockUserRepository.add).toHaveBeenCalled();
      });
    });
  });

  describe('.getUserById', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
        const user = userFactory({
          id: userId,
          organizationId: createOrganizationId(
            '123e4567-e89b-12d3-a456-426614174001',
          ),
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

  describe('.getUserByUsername', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const username = 'testuser';
        const user = userFactory({
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          username,
          organizationId: createOrganizationId(
            '123e4567-e89b-12d3-a456-426614174001',
          ),
        });

        mockUserRepository.findByUsername.mockResolvedValue(user);

        const result = await userService.getUserByUsername(username);

        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
          username,
        );
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      it('returns null', async () => {
        const username = 'testuser';

        mockUserRepository.findByUsername.mockResolvedValue(null);

        const result = await userService.getUserByUsername(username);

        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
          username,
        );
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
  });

  describe('.listUsers', () => {
    it('returns all users', async () => {
      const users: User[] = [
        {
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          username: 'testuser1',
          passwordHash: 'hashedpassword123',
          organizationId: createOrganizationId(
            '123e4567-e89b-12d3-a456-426614174001',
          ),
        },
        {
          id: createUserId('123e4567-e89b-12d3-a456-426614174001'),
          username: 'testuser2',
          passwordHash: 'hashedpassword456',
          organizationId: createOrganizationId(
            '123e4567-e89b-12d3-a456-426614174002',
          ),
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
