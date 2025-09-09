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

  describe('when user signs in with valid credentials and correct organizationId', () => {
    it('returns the user and organization', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'password123',
        organizationId: createOrganizationId('org-123'),
      };

      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
        organization: testOrganization,
      });
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        createOrganizationId('org-123'),
      );
      expect(userService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(userService.validatePassword).toHaveBeenCalledWith(
        'password123',
        'hashedPassword',
      );
    });
  });

  describe('when organization does not exist', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'password123',
        organizationId: createOrganizationId('nonexistent-org'),
      };

      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(userService.getUserByUsername).not.toHaveBeenCalled();
      expect(userService.validatePassword).not.toHaveBeenCalled();
    });
  });

  describe('when user does not exist', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        username: 'nonexistent',
        password: 'password123',
        organizationId: createOrganizationId('org-123'),
      };

      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      userService.getUserByUsername.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
      expect(userService.validatePassword).not.toHaveBeenCalled();
    });
  });

  describe('when password is invalid', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'wrongpassword',
        organizationId: createOrganizationId('org-123'),
      };

      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(false);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
    });
  });

  describe('when user does not belong to the specified organization', () => {
    it('throws Invalid credentials error', async () => {
      const command: SignInUserCommand = {
        username: 'testuser',
        password: 'password123',
        organizationId: createOrganizationId('different-org'),
      };

      const differentOrganization: Organization = {
        id: createOrganizationId('different-org'),
        name: 'Different Organization',
        slug: 'different-org',
      };

      organizationService.getOrganizationById.mockResolvedValue(
        differentOrganization,
      );
      userService.getUserByUsername.mockResolvedValue(testUser);
      userService.validatePassword.mockResolvedValue(true);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('Invalid credentials'),
      );
    });
  });
});
