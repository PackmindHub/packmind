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
  EmailAlreadyExistsError,
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
    describe('when no user exists', () => {
      const email = 'new-user@packmind.com';
      let result: User;

      beforeEach(async () => {
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
        mockUserRepository.add.mockImplementation(async (user) => user);
        result = await userService.createInactiveUser(email);
      });

      it('searches for existing user with lowercase email', () => {
        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email.toLowerCase());
      });

      it('persists user with lowercase email', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            email: email.toLowerCase(),
          }),
        );
      });

      it('persists user with null password hash', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            passwordHash: null,
          }),
        );
      });

      it('persists user as inactive', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            active: false,
          }),
        );
      });

      it('persists user with empty memberships', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            memberships: [],
          }),
        );
      });

      it('returns user with inactive status', () => {
        expect(result.active).toBe(false);
      });

      it('returns user with null password hash', () => {
        expect(result.passwordHash).toBeNull();
      });
    });

    describe('when user already exists', () => {
      const email = 'existing@packmind.com';
      let existingUser: User;
      let result: User;

      beforeEach(async () => {
        existingUser = userFactory({ email });
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );
        result = await userService.createInactiveUser(email);
      });

      it('returns the existing user', () => {
        expect(result).toBe(existingUser);
      });

      it('does not create a new user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when email is empty', () => {
      let thrownError: unknown;

      beforeEach(async () => {
        try {
          await userService.createInactiveUser('');
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws InvalidInvitationEmailError', () => {
        expect(thrownError).toBeInstanceOf(InvalidInvitationEmailError);
      });

      it('does not persist any user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });
  });

  describe('.addOrganizationMembership', () => {
    const organizationId = createOrganizationId('org-123');

    describe('when membership already exists', () => {
      let user: User;
      let result: User;

      beforeEach(async () => {
        const existingMembership: UserOrganizationMembership = {
          userId: createUserId('user-1'),
          organizationId,
          role: 'admin',
        };
        user = {
          id: existingMembership.userId,
          email: 'member@packmind.com',
          passwordHash: null,
          active: true,
          memberships: [existingMembership],
        };
        result = await userService.addOrganizationMembership(
          user,
          organizationId,
          'admin',
        );
      });

      it('returns the provided user', () => {
        expect(result).toBe(user);
      });

      it('does not persist any changes', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when membership is missing', () => {
      let user: User;
      let expectedMembership: UserOrganizationMembership;
      let result: User;

      beforeEach(async () => {
        user = userFactory({ memberships: [] });
        expectedMembership = {
          userId: user.id,
          organizationId,
          role: 'admin',
        };
        mockUserRepository.add.mockImplementation(
          async (savedUser) => savedUser,
        );
        result = await userService.addOrganizationMembership(
          user,
          organizationId,
          'admin',
        );
      });

      it('persists user with correct id', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: user.id,
          }),
        );
      });

      it('persists user with new membership', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            memberships: expect.arrayContaining([
              expect.objectContaining(expectedMembership),
            ]),
          }),
        );
      });

      it('returns user with new membership', () => {
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

    describe('when requester is admin and target is a member', () => {
      let adminUser: User;
      let targetUser: User;

      beforeEach(async () => {
        adminUser = createAdminUser();
        targetUser = createMemberUser({ id: createUserId('target-user') });
        mockMembershipRepository.removeMembership.mockResolvedValue(true);
        await userService.excludeUserFromOrganization({
          requestingUser: adminUser,
          targetUser,
          organizationId,
        });
      });

      it('removes membership successfully', () => {
        expect(mockMembershipRepository.removeMembership).toHaveBeenCalledWith(
          targetUser.id,
          organizationId,
        );
      });

      it('publishes user context change event', () => {
        expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
          String(targetUser.id),
          String(organizationId),
          'removed',
          undefined,
        );
      });
    });

    describe('when requester tries to exclude themselves', () => {
      let adminUser: User;
      let thrownError: unknown;

      beforeEach(async () => {
        adminUser = createAdminUser();
        try {
          await userService.excludeUserFromOrganization({
            requestingUser: adminUser,
            targetUser: adminUser,
            organizationId,
          });
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws UserCannotExcludeSelfError', () => {
        expect(thrownError).toBeInstanceOf(UserCannotExcludeSelfError);
      });

      it('does not remove membership', () => {
        expect(
          mockMembershipRepository.removeMembership,
        ).not.toHaveBeenCalled();
      });

      it('does not publish event', () => {
        expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
      });
    });

    describe('when membership removal fails due to missing membership', () => {
      let adminUser: User;
      let targetUser: User;
      let thrownError: unknown;

      beforeEach(async () => {
        adminUser = createAdminUser();
        targetUser = createMemberUser({
          id: createUserId('missing-membership-user'),
        });
        mockMembershipRepository.removeMembership.mockResolvedValue(false);
        try {
          await userService.excludeUserFromOrganization({
            requestingUser: adminUser,
            targetUser,
            organizationId,
          });
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws UserNotInOrganizationError', () => {
        expect(thrownError).toBeInstanceOf(UserNotInOrganizationError);
      });

      it('attempts to remove membership', () => {
        expect(mockMembershipRepository.removeMembership).toHaveBeenCalledWith(
          targetUser.id,
          organizationId,
        );
      });

      it('does not publish event', () => {
        expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('.createUser', () => {
    beforeEach(() => {
      jest.mocked(bcrypt.hash).mockResolvedValue('hashedpassword123' as never);
    });

    describe('when creating a new user successfully', () => {
      const email = 'testuser@packmind.com';
      const password = 'plainpassword';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      let organization: ReturnType<typeof createOrganizationId>;
      let result: User;

      beforeEach(async () => {
        organization = createOrganizationId(organizationId);
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
        mockUserRepository.add.mockImplementation(async (user) => user);
        result = await userService.createUser(email, password, organization);
      });

      it('searches for existing user by email', () => {
        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
      });

      it('hashes the password with correct salt rounds', () => {
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      });

      it('persists user with correct email', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            email,
          }),
        );
      });

      it('persists user with hashed password', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            passwordHash: 'hashedpassword123',
          }),
        );
      });

      it('persists user as active', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            active: true,
          }),
        );
      });

      it('persists user with admin membership', () => {
        expect(mockUserRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            memberships: [
              expect.objectContaining({
                organizationId: organization,
                role: 'admin',
              }),
            ],
          }),
        );
      });

      it('returns user with correct email', () => {
        expect(result.email).toBe(email);
      });

      it('returns user as active', () => {
        expect(result.active).toBe(true);
      });

      it('returns user with admin membership', () => {
        expect(result.memberships).toEqual([
          expect.objectContaining({
            organizationId: organization,
            role: 'admin',
          }),
        ]);
      });
    });

    describe('when email is missing', () => {
      let thrownError: unknown;

      beforeEach(async () => {
        try {
          await userService.createUser(
            '',
            'plainpassword',
            createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
          );
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws error with correct message', () => {
        expect(thrownError).toEqual(
          new Error('Email, password, and organizationId are required'),
        );
      });

      it('does not persist user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when password is missing', () => {
      let thrownError: unknown;

      beforeEach(async () => {
        try {
          await userService.createUser(
            'testuser@packmind.com',
            '',
            createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
          );
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws error with correct message', () => {
        expect(thrownError).toEqual(
          new Error('Email, password, and organizationId are required'),
        );
      });

      it('does not persist user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when organizationId is missing', () => {
      let thrownError: unknown;

      beforeEach(async () => {
        try {
          await userService.createUser(
            'testuser@packmind.com',
            'plainpassword',
            createOrganizationId(''),
          );
        } catch (error) {
          thrownError = error;
        }
      });

      it('throws error with correct message', () => {
        expect(thrownError).toEqual(
          new Error('Email, password, and organizationId are required'),
        );
      });

      it('does not persist user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when email already exists (case-insensitive)', () => {
      describe('with exact case match', () => {
        const email = 'testuser@packmind.com';
        let thrownError: unknown;

        beforeEach(async () => {
          const existingUser = userFactory({ email });
          mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
            existingUser,
          );
          try {
            await userService.createUser(
              email,
              'plainpassword',
              createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
            );
          } catch (error) {
            thrownError = error;
          }
        });

        it('throws EmailAlreadyExistsError', () => {
          expect(thrownError).toBeInstanceOf(EmailAlreadyExistsError);
        });

        it('searches for existing user', () => {
          expect(
            mockUserRepository.findByEmailCaseInsensitive,
          ).toHaveBeenCalledWith(email);
        });

        it('does not persist user', () => {
          expect(mockUserRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('with different case match', () => {
        const email = 'NewUser@packmind.com';
        let thrownError: unknown;

        beforeEach(async () => {
          const existingUser = userFactory({
            email: 'newuser@PACKMIND.com',
          });
          mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
            existingUser,
          );
          try {
            await userService.createUser(
              email,
              'plainpassword',
              createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
            );
          } catch (error) {
            thrownError = error;
          }
        });

        it('throws EmailAlreadyExistsError', () => {
          expect(thrownError).toBeInstanceOf(EmailAlreadyExistsError);
        });

        it('searches for existing user', () => {
          expect(
            mockUserRepository.findByEmailCaseInsensitive,
          ).toHaveBeenCalledWith(email);
        });

        it('does not persist user', () => {
          expect(mockUserRepository.add).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('.getUserById', () => {
    describe('when user is found', () => {
      const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
      let user: User;
      let result: User | null;

      beforeEach(async () => {
        user = userFactory({
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
        result = await userService.getUserById(userId);
      });

      it('calls repository with correct userId', () => {
        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      });

      it('returns the user', () => {
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
      let result: User | null;

      beforeEach(async () => {
        mockUserRepository.findById.mockResolvedValue(null);
        result = await userService.getUserById(userId);
      });

      it('calls repository with correct userId', () => {
        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('.getUserByEmail', () => {
    describe('when user is found', () => {
      const email = 'testuser@packmind.com';
      let user: User;
      let result: User | null;

      beforeEach(async () => {
        user = userFactory({
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
        result = await userService.getUserByEmail(email);
      });

      it('calls repository with correct email', () => {
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      });

      it('returns the user', () => {
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      const email = 'testuser@packmind.com';
      let result: User | null;

      beforeEach(async () => {
        mockUserRepository.findByEmail.mockResolvedValue(null);
        result = await userService.getUserByEmail(email);
      });

      it('calls repository with correct email', () => {
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('.getUserByEmailCaseInsensitive', () => {
    describe('when user is found with different case', () => {
      const searchEmail = 'TestUser@PACKMIND.com';
      let user: User;
      let result: User | null;

      beforeEach(async () => {
        user = userFactory({
          id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
          email: 'testuser@packmind.com',
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
        result = await userService.getUserByEmailCaseInsensitive(searchEmail);
      });

      it('calls repository with search email', () => {
        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(searchEmail);
      });

      it('returns the user', () => {
        expect(result).toEqual(user);
      });

      it('preserves original case in returned email', () => {
        expect(result?.email).toBe('testuser@packmind.com');
      });
    });

    describe('when user is found with same case', () => {
      const email = 'testuser@packmind.com';
      let user: User;
      let result: User | null;

      beforeEach(async () => {
        user = userFactory({
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
        result = await userService.getUserByEmailCaseInsensitive(email);
      });

      it('calls repository with correct email', () => {
        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
      });

      it('returns the user', () => {
        expect(result).toEqual(user);
      });
    });

    describe('when user is not found', () => {
      const email = 'nonexistent@packmind.com';
      let result: User | null;

      beforeEach(async () => {
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
        result = await userService.getUserByEmailCaseInsensitive(email);
      });

      it('calls repository with correct email', () => {
        expect(
          mockUserRepository.findByEmailCaseInsensitive,
        ).toHaveBeenCalledWith(email);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('.hashPassword', () => {
    const password = 'plainpassword';
    const hashedPassword = 'hashedpassword123';
    let result: string;

    beforeEach(async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
      result = await userService.hashPassword(password);
    });

    it('calls bcrypt with correct salt rounds', () => {
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('returns hashed password', () => {
      expect(result).toBe(hashedPassword);
    });
  });

  describe('.validatePassword', () => {
    describe('when password matches hash', () => {
      const password = 'plainpassword';
      const hash = 'hashedpassword123';
      let result: boolean;

      beforeEach(async () => {
        jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
        result = await userService.validatePassword(password, hash);
      });

      it('compares password with hash', () => {
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });
    });

    describe('when password does not match hash', () => {
      const password = 'plainpassword';
      const hash = 'hashedpassword123';
      let result: boolean;

      beforeEach(async () => {
        jest.mocked(bcrypt.compare).mockResolvedValue(false as never);
        result = await userService.validatePassword(password, hash);
      });

      it('compares password with hash', () => {
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      });

      it('returns false', () => {
        expect(result).toBe(false);
      });
    });

    describe('when stored hash is null', () => {
      const password = 'plainpassword';
      let result: boolean;

      beforeEach(async () => {
        result = await userService.validatePassword(password, null);
      });

      it('does not invoke bcrypt', () => {
        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      it('returns false', () => {
        expect(result).toBe(false);
      });
    });
  });

  describe('.listUsers', () => {
    describe('when users exist', () => {
      let users: User[];
      let result: User[];

      beforeEach(async () => {
        users = [
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
        result = await userService.listUsers();
      });

      it('calls repository list method', () => {
        expect(mockUserRepository.list).toHaveBeenCalled();
      });

      it('returns all users', () => {
        expect(result).toEqual(users);
      });
    });

    describe('when no users exist', () => {
      let result: User[];

      beforeEach(async () => {
        mockUserRepository.list.mockResolvedValue([]);
        result = await userService.listUsers();
      });

      it('calls repository list method', () => {
        expect(mockUserRepository.list).toHaveBeenCalled();
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });
    });
  });

  describe('.changeUserRole', () => {
    const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
    const organizationId = createOrganizationId(
      '123e4567-e89b-12d3-a456-426614174001',
    );

    describe('when role change succeeds', () => {
      let result: boolean;

      beforeEach(async () => {
        mockMembershipRepository.updateRole.mockResolvedValue(true);
        result = await userService.changeUserRole(
          userId,
          organizationId,
          'admin',
        );
      });

      it('updates role in repository', () => {
        expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
          userId,
          organizationId,
          'admin',
        );
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('publishes user context change event', () => {
        expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
          String(userId),
          String(organizationId),
          'role_changed',
          'admin',
        );
      });
    });

    describe('when membership update fails', () => {
      let result: boolean;

      beforeEach(async () => {
        mockMembershipRepository.updateRole.mockResolvedValue(false);
        result = await userService.changeUserRole(
          userId,
          organizationId,
          'member',
        );
      });

      it('updates role in repository', () => {
        expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
          userId,
          organizationId,
          'member',
        );
      });

      it('returns false', () => {
        expect(result).toBe(false);
      });

      it('does not publish event', () => {
        expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
      });
    });

    describe('when changing role from admin to member', () => {
      let result: boolean;

      beforeEach(async () => {
        mockMembershipRepository.updateRole.mockResolvedValue(true);
        result = await userService.changeUserRole(
          userId,
          organizationId,
          'member',
        );
      });

      it('updates role in repository', () => {
        expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
          userId,
          organizationId,
          'member',
        );
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('publishes event with member role', () => {
        expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
          String(userId),
          String(organizationId),
          'role_changed',
          'member',
        );
      });
    });

    describe('when changing role from member to admin', () => {
      let result: boolean;

      beforeEach(async () => {
        mockMembershipRepository.updateRole.mockResolvedValue(true);
        result = await userService.changeUserRole(
          userId,
          organizationId,
          'admin',
        );
      });

      it('updates role in repository', () => {
        expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
          userId,
          organizationId,
          'admin',
        );
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('publishes event with admin role', () => {
        expect(publishUserContextChangeEventSpy).toHaveBeenCalledWith(
          String(userId),
          String(organizationId),
          'role_changed',
          'admin',
        );
      });
    });

    describe('when repository throws error', () => {
      const error = new Error('Database connection failed');
      let thrownError: unknown;

      beforeEach(async () => {
        mockMembershipRepository.updateRole.mockRejectedValue(error);
        try {
          await userService.changeUserRole(userId, organizationId, 'admin');
        } catch (e) {
          thrownError = e;
        }
      });

      it('propagates repository errors', () => {
        expect(thrownError).toEqual(new Error('Database connection failed'));
      });

      it('calls repository with correct parameters', () => {
        expect(mockMembershipRepository.updateRole).toHaveBeenCalledWith(
          userId,
          organizationId,
          'admin',
        );
      });

      it('does not publish event', () => {
        expect(publishUserContextChangeEventSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('createSocialLoginUser', () => {
    describe('when user does not exist', () => {
      let result: User;

      beforeEach(async () => {
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(null);
        mockUserRepository.add.mockImplementation(async (user) => user);
        result = await userService.createSocialLoginUser('Social@Example.com ');
      });

      it('creates user with normalized email', () => {
        expect(result.email).toBe('social@example.com');
      });

      it('creates user with null password hash', () => {
        expect(result.passwordHash).toBeNull();
      });

      it('creates user with active status', () => {
        expect(result.active).toBe(true);
      });

      it('creates user with empty memberships', () => {
        expect(result.memberships).toEqual([]);
      });

      it('creates user with trial false', () => {
        expect(result.trial).toBe(false);
      });

      it('saves user to repository', () => {
        expect(mockUserRepository.add).toHaveBeenCalled();
      });
    });

    describe('when user already exists', () => {
      const existingUser = userFactory({
        email: 'existing@example.com',
        active: true,
      });
      let result: User;

      beforeEach(async () => {
        mockUserRepository.findByEmailCaseInsensitive.mockResolvedValue(
          existingUser,
        );
        result = await userService.createSocialLoginUser(
          'existing@example.com',
        );
      });

      it('returns existing user', () => {
        expect(result).toBe(existingUser);
      });

      it('does not create a new user', () => {
        expect(mockUserRepository.add).not.toHaveBeenCalled();
      });
    });
  });
});
