import { GenerateUserTokenUseCase } from './GenerateUserTokenUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { GenerateUserTokenCommand } from '../../../domain/useCases/IGenerateUserTokenUseCase';
import { createUserId, User } from '../../../domain/entities/User';
import {
  createOrganizationId,
  Organization,
} from '../../../domain/entities/Organization';

describe('GenerateUserTokenUseCase', () => {
  let useCase: GenerateUserTokenUseCase;
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
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    organizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    useCase = new GenerateUserTokenUseCase(userService, organizationService);
  });

  describe('when generating token for valid user', () => {
    it('returns the user and organization', async () => {
      const command: GenerateUserTokenCommand = {
        userId: createUserId('user-123'),
      };

      userService.getUserById.mockResolvedValue(testUser);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual({
        user: testUser,
        organization: testOrganization,
      });
      expect(userService.getUserById).toHaveBeenCalledWith(
        createUserId('user-123'),
      );
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        createOrganizationId('org-123'),
      );
    });
  });

  describe('when user does not exist', () => {
    it('throws Error', async () => {
      const command: GenerateUserTokenCommand = {
        userId: createUserId('nonexistent'),
      };

      userService.getUserById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User not found'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when organization is not found', () => {
    it('throws Error', async () => {
      const command: GenerateUserTokenCommand = {
        userId: createUserId('user-123'),
      };

      userService.getUserById.mockResolvedValue(testUser);
      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User organization not found'),
      );
    });
  });
});
