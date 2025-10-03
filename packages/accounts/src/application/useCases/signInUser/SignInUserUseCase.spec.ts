import { SignInUserUseCase } from './SignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { LoginRateLimiterService } from '../../services/LoginRateLimiterService';
import {
  ISignInUserUseCase,
  SignInUserCommand,
} from '../../../domain/useCases/ISignInUserUseCase';
import {
  createUserId,
  User,
  UserOrganizationMembership,
} from '../../../domain/entities/User';
import {
  createOrganizationId,
  Organization,
} from '../../../domain/entities/Organization';
import { TooManyLoginAttemptsError } from '../../../domain/errors/TooManyLoginAttemptsError';
import { UnauthorizedException } from '@nestjs/common';
import { userFactory } from '../../../../test';

describe('SignInUserUseCase', () => {
  let useCase: ISignInUserUseCase;
  let userService: jest.Mocked<UserService>;
  let organizationService: jest.Mocked<OrganizationService>;
  let loginRateLimiterService: jest.Mocked<LoginRateLimiterService>;

  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-123');
  const membership: UserOrganizationMembership = {
    userId,
    organizationId,
    role: 'admin',
  };

  const testUser: User = {
    ...userFactory({
      id: userId,
      email: 'testuser@packmind.com',
      passwordHash: 'hashedPassword',
      memberships: [membership],
    }),
  };

  const testOrganization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    userService = {
      getUserByEmail: jest.fn(),
      getUserByEmailCaseInsensitive: jest.fn(),
      validatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    organizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    loginRateLimiterService = {
      checkLoginAllowed: jest.fn(),
      recordFailedAttempt: jest.fn(),
      clearAttempts: jest.fn(),
    } as unknown as jest.Mocked<LoginRateLimiterService>;

    useCase = new SignInUserUseCase(
      userService,
      organizationService,
      loginRateLimiterService,
    );
  });

  describe('when user signs in with valid credentials', () => {
    it('returns the user, organization from first membership, and membership role', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      loginRateLimiterService.clearAttempts.mockResolvedValue();

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
        organization: testOrganization,
        role: 'admin',
      });
      expect(userService.getUserByEmailCaseInsensitive).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when user signs in with different email case', () => {
    it('finds user with case-insensitive search and preserves original email case', async () => {
      const command: SignInUserCommand = {
        email: 'TestUser@PACKMIND.com', // Different case than stored email
        password: 'password123',
      };

      const userWithOriginalCase: User = {
        ...testUser,
        email: 'testuser@packmind.com', // Original case in database
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithOriginalCase,
      );
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      loginRateLimiterService.clearAttempts.mockResolvedValue();

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithOriginalCase,
        organization: testOrganization,
        role: 'admin',
      });
      expect(result.user.email).toBe('testuser@packmind.com'); // Original case preserved
      expect(userService.getUserByEmailCaseInsensitive).toHaveBeenCalledWith(
        'TestUser@PACKMIND.com', // Search was with different case
      );
    });
  });

  describe('when organization does not exist', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(userService.getUserByEmailCaseInsensitive).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when user does not exist', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        email: 'nonexistent@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid email or password'),
      );
      expect(userService.validatePassword).not.toHaveBeenCalled();
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when password is invalid', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'wrongpassword',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);
      loginRateLimiterService.recordFailedAttempt.mockResolvedValue();

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid email or password'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when user has no memberships', () => {
    it('returns the user with empty organizations array', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      const userWithNoMemberships: User = {
        ...testUser,
        memberships: [],
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithNoMemberships,
      );
      userService.validatePassword.mockResolvedValue(true);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithNoMemberships,
        organizations: [],
      });
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
      expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
        command.email,
      );
    });
  });

  describe('when user belongs to multiple organizations', () => {
    it('returns the user and list of available organizations with roles', async () => {
      const organizationId2 = createOrganizationId('org-456');
      const membership2: UserOrganizationMembership = {
        userId,
        organizationId: organizationId2,
        role: 'member',
      };

      const testOrganization2: Organization = {
        id: organizationId2,
        name: 'Second Organization',
        slug: 'second-org',
      };

      const userWithMultipleOrgs: User = {
        ...testUser,
        memberships: [membership, membership2],
      };

      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithMultipleOrgs,
      );
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById
        .mockResolvedValueOnce(testOrganization)
        .mockResolvedValueOnce(testOrganization2);
      loginRateLimiterService.clearAttempts.mockResolvedValue();

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithMultipleOrgs,
        organizations: [
          {
            organization: testOrganization,
            role: 'admin',
          },
          {
            organization: testOrganization2,
            role: 'member',
          },
        ],
      });
      expect(organizationService.getOrganizationById).toHaveBeenCalledTimes(2);
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId2,
      );
    });

    describe('when one of the organizations does not exist', () => {
      it('throws Invalid credentials error', async () => {
        const organizationId2 = createOrganizationId('org-456');
        const membership2: UserOrganizationMembership = {
          userId,
          organizationId: organizationId2,
          role: 'member',
        };

        const userWithMultipleOrgs: User = {
          ...testUser,
          memberships: [membership, membership2],
        };

        const command: SignInUserCommand = {
          email: 'testuser@packmind.com',
          password: 'password123',
        };

        loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
        userService.getUserByEmailCaseInsensitive.mockResolvedValue(
          userWithMultipleOrgs,
        );
        userService.validatePassword.mockResolvedValue(true);
        organizationService.getOrganizationById
          .mockResolvedValueOnce(testOrganization)
          .mockResolvedValueOnce(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          new Error('Invalid credentials'),
        );
      });
    });
  });

  describe('rate limiting', () => {
    it('throws TooManyLoginAttemptsError on rate limit exceeded', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      const bannedUntil = new Date(Date.now() + 30 * 60 * 1000);
      const rateLimitError = new TooManyLoginAttemptsError(bannedUntil);
      loginRateLimiterService.checkLoginAllowed.mockRejectedValue(
        rateLimitError,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        TooManyLoginAttemptsError,
      );

      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      // Should not proceed with authentication when rate limited
      expect(userService.getUserByEmailCaseInsensitive).not.toHaveBeenCalled();
      expect(
        loginRateLimiterService.recordFailedAttempt,
      ).not.toHaveBeenCalled();
    });

    it('does not record failed attempt for nonexistent user', async () => {
      const command: SignInUserCommand = {
        email: 'nonexistent@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'nonexistent@packmind.com',
      );
      expect(
        loginRateLimiterService.recordFailedAttempt,
      ).not.toHaveBeenCalled();
      expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
    });

    it('records failed attempt for invalid password', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'wrongpassword',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);
      loginRateLimiterService.recordFailedAttempt.mockResolvedValue();

      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(loginRateLimiterService.recordFailedAttempt).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
    });

    it('clears attempts for successful login with user with no memberships', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      const userWithNoMemberships: User = {
        ...testUser,
        memberships: [],
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithNoMemberships,
      );
      userService.validatePassword.mockResolvedValue(true);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithNoMemberships,
        organizations: [],
      });
      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(
        loginRateLimiterService.recordFailedAttempt,
      ).not.toHaveBeenCalled();
      expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
    });

    it('does not record failed attempt for nonexistent organization', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(
        loginRateLimiterService.recordFailedAttempt,
      ).not.toHaveBeenCalled();
      expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
    });

    it('clears attempts only on successful login', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      loginRateLimiterService.clearAttempts.mockResolvedValue();

      await useCase.execute(command);

      expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
      expect(
        loginRateLimiterService.recordFailedAttempt,
      ).not.toHaveBeenCalled();
    });
  });
});
