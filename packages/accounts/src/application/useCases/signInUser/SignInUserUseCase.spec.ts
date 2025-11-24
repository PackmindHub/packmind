import { SignInUserUseCase } from './SignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { LoginRateLimiterService } from '../../services/LoginRateLimiterService';
import { ISignInUserUseCase, SignInUserCommand } from '@packmind/types';
import {
  createUserId,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import { createOrganizationId, Organization } from '@packmind/types';
import { TooManyLoginAttemptsError } from '../../../domain/errors/TooManyLoginAttemptsError';
import { InvalidEmailOrPasswordError } from '../../../domain/errors/InvalidEmailOrPasswordError';
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user signs in with valid credentials', () => {
    const command: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    beforeEach(() => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      loginRateLimiterService.clearAttempts.mockResolvedValue();
    });

    it('returns the user, organization from first membership, and membership role', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
        organization: testOrganization,
        role: 'admin',
      });
    });

    it('calls getUserByEmailCaseInsensitive with the email', async () => {
      await useCase.execute(command);

      expect(userService.getUserByEmailCaseInsensitive).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
    });

    it('calls validatePassword with password and hash', async () => {
      await useCase.execute(command);

      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
    });

    it('calls getOrganizationById with organizationId', async () => {
      await useCase.execute(command);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when user signs in with different email case', () => {
    it('finds user with case-insensitive search and returns user with original email case', async () => {
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

      expect(result.user.email).toBe('testuser@packmind.com');
    });
  });

  describe('when organization does not exist', () => {
    const command: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    beforeEach(() => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(null);
    });

    it('throws InvalidEmailOrPasswordError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidEmailOrPasswordError,
      );
    });

    it('calls getUserByEmailCaseInsensitive with the email', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected to throw
      }

      expect(userService.getUserByEmailCaseInsensitive).toHaveBeenCalledWith(
        'testuser@packmind.com',
      );
    });

    it('calls validatePassword with password and hash', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected to throw
      }

      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
    });

    it('calls getOrganizationById with organizationId', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected to throw
      }

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when user does not exist', () => {
    it('throws InvalidEmailOrPasswordError', async () => {
      const command: SignInUserCommand = {
        email: 'nonexistent@packmind.com',
        password: 'password123',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidEmailOrPasswordError,
      );
    });
  });

  describe('when password is invalid', () => {
    it('throws InvalidEmailOrPasswordError', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'wrongpassword',
      };

      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);
      loginRateLimiterService.recordFailedAttempt.mockResolvedValue();

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidEmailOrPasswordError,
      );
    });
  });

  describe('when user has no memberships', () => {
    const command: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    const userWithNoMemberships: User = {
      ...testUser,
      memberships: [],
    };

    beforeEach(() => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithNoMemberships,
      );
      userService.validatePassword.mockResolvedValue(true);
    });

    it('returns the user with empty organizations array', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithNoMemberships,
        organizations: [],
      });
    });

    it('does not call getOrganizationById', async () => {
      await useCase.execute(command);

      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });

    it('calls clearAttempts with the email', async () => {
      await useCase.execute(command);

      expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
        command.email,
      );
    });
  });

  describe('when user belongs to multiple organizations', () => {
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

    beforeEach(() => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithMultipleOrgs,
      );
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById
        .mockResolvedValueOnce(testOrganization)
        .mockResolvedValueOnce(testOrganization2);
      loginRateLimiterService.clearAttempts.mockResolvedValue();
    });

    it('returns the user and list of available organizations with roles', async () => {
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
    });

    it('calls getOrganizationById twice', async () => {
      await useCase.execute(command);

      expect(organizationService.getOrganizationById).toHaveBeenCalledTimes(2);
    });

    it('calls getOrganizationById with first organizationId', async () => {
      await useCase.execute(command);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('calls getOrganizationById with second organizationId', async () => {
      await useCase.execute(command);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId2,
      );
    });
  });

  describe('when user belongs to multiple organizations and one does not exist', () => {
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

    it('throws InvalidEmailOrPasswordError', async () => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithMultipleOrgs,
      );
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById
        .mockResolvedValueOnce(testOrganization)
        .mockResolvedValueOnce(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidEmailOrPasswordError,
      );
    });
  });

  describe('rate limiting', () => {
    describe('when rate limit is exceeded', () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      beforeEach(() => {
        const bannedUntil = new Date(Date.now() + 30 * 60 * 1000);
        const rateLimitError = new TooManyLoginAttemptsError(bannedUntil);
        loginRateLimiterService.checkLoginAllowed.mockRejectedValue(
          rateLimitError,
        );
      });

      it('throws TooManyLoginAttemptsError', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          TooManyLoginAttemptsError,
        );
      });

      it('does not call getUserByEmailCaseInsensitive', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          userService.getUserByEmailCaseInsensitive,
        ).not.toHaveBeenCalled();
      });

      it('does not record failed attempt', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          loginRateLimiterService.recordFailedAttempt,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when user does not exist', () => {
      const command: SignInUserCommand = {
        email: 'nonexistent@packmind.com',
        password: 'password123',
      };

      beforeEach(() => {
        loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
        userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);
      });

      it('does not record failed attempt', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          loginRateLimiterService.recordFailedAttempt,
        ).not.toHaveBeenCalled();
      });

      it('does not clear attempts', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
      });
    });

    describe('when password is invalid', () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'wrongpassword',
      };

      beforeEach(() => {
        loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
        userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
        userService.validatePassword.mockResolvedValue(false);
        loginRateLimiterService.recordFailedAttempt.mockResolvedValue();
      });

      it('calls checkLoginAllowed with the email', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
          'testuser@packmind.com',
        );
      });

      it('records failed attempt with the email', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          loginRateLimiterService.recordFailedAttempt,
        ).toHaveBeenCalledWith('testuser@packmind.com');
      });

      it('does not clear attempts', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
      });
    });

    describe('when organization does not exist', () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      beforeEach(() => {
        loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
        userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
        userService.validatePassword.mockResolvedValue(true);
        organizationService.getOrganizationById.mockResolvedValue(null);
      });

      it('does not record failed attempt', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          loginRateLimiterService.recordFailedAttempt,
        ).not.toHaveBeenCalled();
      });

      it('does not clear attempts', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(loginRateLimiterService.clearAttempts).not.toHaveBeenCalled();
      });
    });

    describe('when login is successful', () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      beforeEach(() => {
        loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
        userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
        userService.validatePassword.mockResolvedValue(true);
        organizationService.getOrganizationById.mockResolvedValue(
          testOrganization,
        );
        loginRateLimiterService.clearAttempts.mockResolvedValue();
      });

      it('calls checkLoginAllowed with the email', async () => {
        await useCase.execute(command);

        expect(loginRateLimiterService.checkLoginAllowed).toHaveBeenCalledWith(
          'testuser@packmind.com',
        );
      });

      it('clears attempts with the email', async () => {
        await useCase.execute(command);

        expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
          'testuser@packmind.com',
        );
      });

      it('does not record failed attempt', async () => {
        await useCase.execute(command);

        expect(
          loginRateLimiterService.recordFailedAttempt,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
