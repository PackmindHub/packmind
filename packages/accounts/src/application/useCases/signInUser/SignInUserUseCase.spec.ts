import { PackmindEventEmitterService } from '@packmind/node-utils';
import { SignInUserUseCase } from './SignInUserUseCase';
import { UserService } from '../../services/UserService';
import { MembershipResolutionService } from '../../services/MembershipResolutionService';
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
  let membershipResolutionService: jest.Mocked<MembershipResolutionService>;
  let loginRateLimiterService: jest.Mocked<LoginRateLimiterService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;

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

    membershipResolutionService = {
      resolveUserOrganizations: jest.fn(),
    } as unknown as jest.Mocked<MembershipResolutionService>;

    loginRateLimiterService = {
      checkLoginAllowed: jest.fn(),
      recordFailedAttempt: jest.fn(),
      clearAttempts: jest.fn(),
    } as unknown as jest.Mocked<LoginRateLimiterService>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new SignInUserUseCase(
      userService,
      membershipResolutionService,
      loginRateLimiterService,
      mockEventEmitterService,
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
      loginRateLimiterService.clearAttempts.mockResolvedValue();
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organization: testOrganization,
        role: 'admin',
      });
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

    it('calls resolveUserOrganizations with the user', async () => {
      await useCase.execute(command);

      expect(
        membershipResolutionService.resolveUserOrganizations,
      ).toHaveBeenCalledWith(testUser);
    });

    it('emits UserSignedInEvent with user and organization details', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            userId,
            organizationId,
            email: 'testuser@packmind.com',
            method: 'password',
            source: 'ui',
          },
        }),
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
      loginRateLimiterService.clearAttempts.mockResolvedValue();
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organization: testOrganization,
        role: 'admin',
      });

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
      loginRateLimiterService.clearAttempts.mockResolvedValue();
      membershipResolutionService.resolveUserOrganizations.mockRejectedValue(
        new InvalidEmailOrPasswordError(),
      );
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

    it('calls resolveUserOrganizations with the user', async () => {
      try {
        await useCase.execute(command);
      } catch {
        // Expected to throw
      }

      expect(
        membershipResolutionService.resolveUserOrganizations,
      ).toHaveBeenCalledWith(testUser);
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
      loginRateLimiterService.clearAttempts.mockResolvedValue();
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organizations: [],
      });
    });

    it('returns the user with empty organizations array', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: userWithNoMemberships,
        organizations: [],
      });
    });

    it('calls resolveUserOrganizations with the user', async () => {
      await useCase.execute(command);

      expect(
        membershipResolutionService.resolveUserOrganizations,
      ).toHaveBeenCalledWith(userWithNoMemberships);
    });

    it('calls clearAttempts with the email', async () => {
      await useCase.execute(command);

      expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
        command.email,
      );
    });

    it('does not emit UserSignedInEvent', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when user belongs to multiple organizations', () => {
    const organizationId2 = createOrganizationId('org-456');

    const testOrganization2: Organization = {
      id: organizationId2,
      name: 'Second Organization',
      slug: 'second-org',
    };

    const command: SignInUserCommand = {
      email: 'testuser@packmind.com',
      password: 'password123',
    };

    beforeEach(() => {
      loginRateLimiterService.checkLoginAllowed.mockResolvedValue();
      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      loginRateLimiterService.clearAttempts.mockResolvedValue();
      membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
        organizations: [
          { organization: testOrganization, role: 'admin' },
          { organization: testOrganization2, role: 'member' },
        ],
      });
    });

    it('returns the user and list of available organizations with roles', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
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

    it('calls resolveUserOrganizations with the user', async () => {
      await useCase.execute(command);

      expect(
        membershipResolutionService.resolveUserOrganizations,
      ).toHaveBeenCalledWith(testUser);
    });

    it('emits UserSignedInEvent with the first organization', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            userId,
            organizationId,
            email: 'testuser@packmind.com',
            method: 'password',
            source: 'ui',
          },
        }),
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
        loginRateLimiterService.clearAttempts.mockResolvedValue();
        membershipResolutionService.resolveUserOrganizations.mockRejectedValue(
          new InvalidEmailOrPasswordError(),
        );
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

      it('clears attempts before resolving memberships', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(loginRateLimiterService.clearAttempts).toHaveBeenCalledWith(
          command.email,
        );
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
        loginRateLimiterService.clearAttempts.mockResolvedValue();
        membershipResolutionService.resolveUserOrganizations.mockResolvedValue({
          organization: testOrganization,
          role: 'admin',
        });
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
