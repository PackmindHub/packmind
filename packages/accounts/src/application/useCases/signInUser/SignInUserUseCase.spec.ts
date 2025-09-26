import { SignInUserUseCase } from './SignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
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
import { userFactory } from '../../../../test';

describe('SignInUserUseCase', () => {
  let useCase: ISignInUserUseCase;
  let userService: jest.Mocked<UserService>;
  let organizationService: jest.Mocked<OrganizationService>;

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

    useCase = new SignInUserUseCase(userService, organizationService);
  });

  describe('when user signs in with valid credentials', () => {
    it('returns the user, organization from first membership, and membership role', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );

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

      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithOriginalCase,
      );
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );

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

      userService.getUserByEmailCaseInsensitive.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
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

      userService.getUserByEmailCaseInsensitive.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when user has no memberships', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        email: 'testuser@packmind.com',
        password: 'password123',
      };

      const userWithNoMemberships: User = {
        ...testUser,
        memberships: [],
      };

      userService.getUserByEmailCaseInsensitive.mockResolvedValue(
        userWithNoMemberships,
      );
      userService.validatePassword.mockResolvedValue(true);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });
});
