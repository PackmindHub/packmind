import { GenerateUserTokenUseCase } from './GenerateUserTokenUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  GenerateUserTokenCommand,
  GenerateUserTokenResponse,
} from '../../../domain/useCases/IGenerateUserTokenUseCase';
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

describe('GenerateUserTokenUseCase', () => {
  let useCase: GenerateUserTokenUseCase;
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
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    organizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    useCase = new GenerateUserTokenUseCase(userService, organizationService);
  });

  describe('when generating token for valid user', () => {
    it('returns the user, organization, and role', async () => {
      const command: GenerateUserTokenCommand = {
        userId,
        organizationId,
      };

      userService.getUserById.mockResolvedValue(testUser);
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );

      const result = await useCase.execute(command);

      const expected: GenerateUserTokenResponse = {
        user: testUser,
        organization: testOrganization,
        role: 'admin',
      };

      expect(result).toEqual(expected);
      expect(userService.getUserById).toHaveBeenCalledWith(userId);
      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when user does not exist', () => {
    it('throws Error', async () => {
      const command: GenerateUserTokenCommand = {
        userId: createUserId('nonexistent'),
        organizationId,
      };

      userService.getUserById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User not found'),
      );
      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when organization membership is missing', () => {
    it('throws Error', async () => {
      const command: GenerateUserTokenCommand = {
        userId,
        organizationId: createOrganizationId('org-456'),
      };

      userService.getUserById.mockResolvedValue(testUser);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User organization membership not found'),
      );
    });
  });

  describe('when organization is not found', () => {
    it('throws Error', async () => {
      const command: GenerateUserTokenCommand = {
        userId,
        organizationId,
      };

      userService.getUserById.mockResolvedValue(testUser);
      organizationService.getOrganizationById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        new Error('User organization not found'),
      );
    });
  });
});
