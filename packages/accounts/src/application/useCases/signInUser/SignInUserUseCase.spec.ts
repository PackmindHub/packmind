import { SignInUserUseCase } from './SignInUserUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { SignInUserCommand } from '../../../domain/useCases/ISignInUserUseCase';
import { createUserId, User } from '../../../domain/entities/User';
import {
  createOrganizationId,
  Organization,
} from '../../../domain/entities/Organization';

describe('SignInUserUseCase', () => {
  let useCase: SignInUserUseCase;
  let userService: jest.Mocked<UserService>;
  let organizationService: jest.Mocked<OrganizationService>;

  const testUser: User = {
    id: createUserId('user-123'),
    username: 'testuser',
    organizationId: createOrganizationId('org-123'),
    passwordHash: 'hashedPassword',
  };

  const testOrganization: Organization = {
    id: createOrganizationId('org-123'),
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    userService = {
      getUserByUsername: jest.fn(),
      validatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    organizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    useCase = new SignInUserUseCase(userService, organizationService);
  });

  describe('when user signs in with valid credentials', () => {
    it('returns the user and organization', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'password123',
      };

      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
        organization: testOrganization,
      });
      expect(userService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        createOrganizationId('org-123'),
      );
    });
  });

  describe('when user does not exist', () => {
    it('throws Error', async () => {
      const command: SignInUserCommand = {
        username: 'nonexistent',
        password: 'password123',
      };

      userService.getUserByUsername.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(userService.validatePassword).not.toHaveBeenCalled();
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when password is invalid', () => {
    it('throws Error', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when organization is not found', () => {
    it('throws Error', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'password123',
      };

      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);
      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User organization not found'),
      );
    });
  });
});
