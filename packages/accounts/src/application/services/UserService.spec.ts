import { UserService } from './UserService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IUserOrganizationMembershipRepository } from '../../domain/repositories/IUserOrganizationMembershipRepository';
import {
  User,
  createUserId,
  UserOrganizationMembership,
} from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { userFactory } from '../../../test';
import {
  InvalidInvitationEmailError,
  UserNotInOrganizationError,
  UserCannotExcludeSelfError,
} from '../../domain/errors';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockMembershipRepository: jest.Mocked<IUserOrganizationMembershipRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let publishUserContextChangeEventSpy: jest.SpyInstance;

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

    mockMembershipRepository = {
      removeMembership: jest.fn(),
      updateRole: jest.fn(),
    } as unknown as jest.Mocked<IUserOrganizationMembershipRepository>;

    stubbedLogger = stubLogger();

    publishUserContextChangeEventSpy = jest
      .spyOn(SSEEventPublisher, 'publishUserContextChangeEvent')
      .mockResolvedValue();

    userService = new UserService(
      mockUserRepository,
      mockMembershipRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('.createInactiveUser', () => {
    it('creates a new inactive user if none exists', async () => {
      const email = 'new-user@packmind.com';
      mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
      mockUserRepository.add.mockImplementation(async (user) => user);

      const result = await userService.createInactiveUser(email);

      expect(
        mockUserRepository.findByEmailCaseInsensitive,
      ).toHaveBeenCalledWith(email.toLowerCase());
      expect(mockUserRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          email: email.toLowerCase(),
          passwordHash: null,
          active: false,
          memberships: [],
        }),
      );
      expect(result.active).toBe(false);
      expect(result.passwordHash).toBeNull();
    });

    it('returns existing user if already present', async () => {
      const email = 'existing@packmind.com';
      const existingUser = userFactory({ email });
      mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
        existingUser,
      );

      const result = await userService.createInactiveUser(email);

      expect(result).toBe(existingUser);
      expect(mockUserRepository.add).not.toHaveBeenCalled();
    });

    it('throws if email is empty', async () => {
      await expect(userService.createInactiveUser('')).rejects.toBeInstanceOf(
        InvalidInvitationEmailError,
      );
      expect(mockUserRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('.addOrganizationMembership', () => {
    const organizationId = createOrganizationId('org-123');

    describe('when membership already exists', () => {
      it('returns the provided user', async () => {
        const existingMembership: UserOrganizationMembership = {
          userId: createUserId('user-1'),
          organizationId,
          role: 'admin',
        };
        const user: User = {
          id: existingMembership.userId,
          email: 'member@packmind.com',
          passwordHash: null,
          active: true,
          memberships: [existingMembership],
        };

        const result = await userService.addOrganizationMembership(
          user,
          organizationId,
          'admin',
        );

        expect(result).toBe(user);
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when membership is missing', () => {
      it('persists the new membership and returns the saved user', async () => {
        const user = userFactory({ memberships: [] });
        const expectedMembership: UserOrganizationMembership = {
          userId: user.id,
          organizationId,
          role: 'admin',
        };

        mockUserRepository.add.mockImplementation(
          async (savedUser) => savedUser,
        );

        const result = await userService.addOrganizationMembership(
          user,
          organizationId,
          'admin',
        );

        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: user.id,
            memberships: expect.arrayContaining([
              expect.objectContaining(expectedMembership),
            ]),
          }),
        );
        expect(result.memberships).toEqual([
          expect.objectContaining(expectedMembership),
        ]);
      });
    });
  });

  describe('.excludeUserFromOrganization', () => {
    const organizationId = createOrganizationId('org-1');

    const createAdminUser = (overrides?: Partial<User>) => {
      const id = overrides?.id ?? createUserId('admin-user');
      return userFactory({
        id,
        memberships: [
          {
            userId: id,
            organizationId,
            role: 'admin',
          },
        ],
        ...overrides,
      });
    };

    const createMemberUser = (overrides?: Partial<User>) => {
      const id = overrides?.id ?? createUserId('member-user');
      return userFactory({
        id,
        memberships: [
          {
            userId: id,
            organizationId,
            role: 'member',
          },
        ],
        ...overrides,
      });
    };

    it('removes membership if requester is admin and target is a member', async () => {
      const adminUser = createAdminUser();
      const targetUser = createMemberUser({ id: createUserId('target-user') });

      mockMembershipRepository.removeMembership.mockResolvedValue(true);

      await expect(
        userService.excludeUserFromOrganization({
          requestingUser: adminUser,
          targetUser,
          organizationId,
        }),
      ).resolves.toBeUndefined();

      expect(mockMembershipRepository.removeMembership).toHaveBeenCalledWith(
        targetUser.id,
        organizationId,
      );

      expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
        String(targetUser.id),
        String(organizationId),
        'removed',
        undefined,
      );
    });

    it('throws if requester tries to exclude themselves', async () => {
      const adminUser = createAdminUser();

      await expect(
        userService.excludeUserFromOrganization({
          requestingUser: adminUser,
          targetUser: adminUser,
          organizationId,
        }),
      ).rejects.toBeInstanceOf(UserCannotExcludeSelfError);

      expect(mockMembershipRepository.removeMembership).not.toHaveBeenCalled();
      expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
    });

    it('throws if membership removal fails due to missing membership', async () => {
      const adminUser = createAdminUser();
      const targetUser = createMemberUser({
        id: createUserId('missing-membership-user'),
      });

      mockMembershipRepository.removeMembership.mockResolvedValue(false);

      await expect(
        userService.excludeUserFromOrganization({
          requestingUser: adminUser,
          targetUser,
          organizationId,
        }),
      ).rejects.toBeInstanceOf(UserNotInOrganizationError);

      expect(mockMembershipRepository.removeMembership).toHaveBeenCalledWith(
        targetUser.id,
        organizationId,
      );
      expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('.createUser', () => {
    beforeEach(() => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashedpassword123' as never);
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
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
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
        ).rejects.toThrow(`Email 'testus***************' already exists`);

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
        ).rejects.toThrow(`Email 'NewUse**************' already exists`);

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

      jest.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

      const result = await userService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('.validatePassword', () => {
    describe('when password matches hash', () => {
      it('returns true', async () => {
        const password = 'plainpassword';
        const hash = 'hashedpassword123';

        jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

        const result = await userService.validatePassword(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(true);
      });
    });

    describe('when password does not match hash', () => {
      it('returns false', async () => {
        const password = 'plainpassword';
        const hash = 'hashedpassword123';

        jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

        const result = await userService.validatePassword(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(false);
      });
    });

    describe('when stored hash is null', () => {
      it('returns false without invoking bcrypt', async () => {
        const password = 'plainpassword';

        const result = await userService.validatePassword(password, null);

        expect(bcrypt.compare).not.toHaveBeenCalled();
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

  describe('.changeUserRole', () => {
    const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
    const organizationId = createOrganizationId(
      '123e4567-e89b-12d3-a456-426614174001',
    );

    it('changes user role successfully and returns true', async () => {
      mockMembershipRepository.updateRole.mockResolvedValue(true);

      const result = await userService.changeUserRole(
        userId,
        organizationId,
        'admin',
      );

      expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
        userId,
        organizationId,
        'admin',
      );
      expect(result).toBe(true);
      expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
        String(userId),
        String(organizationId),
        'role_changed',
        'admin',
      );
    });

    it('returns false if membership update fails', async () => {
      mockMembershipRepository.updateRole.mockResolvedValue(false);

      const result = await userService.changeUserRole(
        userId,
        organizationId,
        'member',
      );

      expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
        userId,
        organizationId,
        'member',
      );
      expect(result).toBe(false);
      expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
    });

    it('changes role from admin to member', async () => {
      mockMembershipRepository.updateRole.mockResolvedValue(true);

      const result = await userService.changeUserRole(
        userId,
        organizationId,
        'member',
      );

      expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
        userId,
        organizationId,
        'member',
      );
      expect(result).toBe(true);
      expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
        String(userId),
        String(organizationId),
        'role_changed',
        'member',
      );
    });

    it('changes role from member to admin', async () => {
      mockMembershipRepository.updateRole.mockResolvedValue(true);

      const result = await userService.changeUserRole(
        userId,
        organizationId,
        'admin',
      );

      expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
        userId,
        organizationId,
        'admin',
      );
      expect(result).toBe(true);
      expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
        String(userId),
        String(organizationId),
        'role_changed',
        'admin',
      );
    });

    it('propagates repository errors', async () => {
      const error = new Error('Database connection failed');
      mockMembershipRepository.updateRole.mockRejectedValue(error);

      await expect(
        userService.changeUserRole(userId, organizationId, 'admin'),
      ).rejects.toThrow('Database connection failed');

      expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
        userId,
        organizationId,
        'admin',
      );
      expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
    });
  });
});
