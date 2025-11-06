import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { GenerateApiKeyUseCase } from './GenerateApiKeyUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';
import { createUserId } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { GenerateApiKeyCommand } from '@packmind/types';
import { userFactory, organizationFactory } from '../../../../test';

describe('GenerateApiKeyUseCase', () => {
  let generateApiKeyUseCase: GenerateApiKeyUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockApiKeyService: jest.Mocked<ApiKeyService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserService = {
      getUserById: jest.fn(),
    } as jest.Mocked<Partial<UserService>> as jest.Mocked<UserService>;

    mockOrganizationService = {
      getOrganizationById: jest.fn(),
    } as jest.Mocked<
      Partial<OrganizationService>
    > as jest.Mocked<OrganizationService>;

    mockApiKeyService = {
      generateApiKey: jest.fn(),
      getApiKeyExpiration: jest.fn(),
    } as jest.Mocked<Partial<ApiKeyService>> as jest.Mocked<ApiKeyService>;

    stubbedLogger = stubLogger();

    generateApiKeyUseCase = new GenerateApiKeyUseCase(
      mockUserService,
      mockOrganizationService,
      mockApiKeyService,
      stubbedLogger,
    );
  });

  describe('execute', () => {
    it('generates API key successfully', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');

      const testUser = userFactory({
        id: userId,
        email: 'testuser@packmind.com',
        passwordHash: 'hash',
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      const testOrganization = organizationFactory({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      const expectedApiKey = 'test.api.key';
      const expectedExpiresAt = new Date('2024-04-01T10:00:00Z');

      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      mockUserService.getUserById.mockResolvedValue(testUser);
      mockOrganizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      mockApiKeyService.generateApiKey.mockReturnValue(expectedApiKey);
      mockApiKeyService.getApiKeyExpiration.mockReturnValue(expectedExpiresAt);

      const result = await generateApiKeyUseCase.execute(command);

      expect(result).toEqual({
        apiKey: expectedApiKey,
        expiresAt: expectedExpiresAt,
      });
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockOrganizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(mockApiKeyService.generateApiKey).toHaveBeenCalledWith(
        testUser,
        testOrganization,
        'admin',
        expect.any(String),
      );
      expect(mockApiKeyService.getApiKeyExpiration).toHaveBeenCalledWith(
        expectedApiKey,
      );
    });

    it('throws error if user not found', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      mockUserService.getUserById.mockResolvedValue(null);

      await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
        'User not found',
      );
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
    });

    it('throws error if organization not found', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      const testUser = userFactory({
        id: userId,
        email: 'testuser@packmind.com',
        passwordHash: 'hash',
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      mockUserService.getUserById.mockResolvedValue(testUser);
      mockOrganizationService.getOrganizationById.mockResolvedValue(null);

      await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
        'Organization not found',
      );
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockOrganizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('throws error if user is not a member of the organization', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      const testUser = userFactory({
        id: userId,
        email: 'testuser@packmind.com',
        passwordHash: 'hash',
        memberships: [
          {
            userId,
            organizationId: createOrganizationId('org-789'),
            role: 'admin',
          },
        ],
      });

      mockUserService.getUserById.mockResolvedValue(testUser);

      await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
        'User organization membership not found',
      );
    });

    it('throws error if API key expiration fails', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      const testUser = userFactory({
        id: userId,
        email: 'testuser@packmind.com',
        passwordHash: 'hash',
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      const testOrganization = organizationFactory({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      mockUserService.getUserById.mockResolvedValue(testUser);
      mockOrganizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
      mockApiKeyService.generateApiKey.mockReturnValue('test.api.key');
      mockApiKeyService.getApiKeyExpiration.mockReturnValue(null);

      await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
        'Failed to get API key expiration',
      );
    });

    it('handles service errors gracefully', async () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const command: GenerateApiKeyCommand = {
        userId,
        organizationId,
      };

      const error = new Error('Database connection failed');
      mockUserService.getUserById.mockRejectedValue(error);

      await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
