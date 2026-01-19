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
    describe('when generating API key successfully', () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');
      const expectedApiKey = 'test.api.key';
      const expectedExpiresAt = new Date('2024-04-01T10:00:00Z');

      let testUser: ReturnType<typeof userFactory>;
      let testOrganization: ReturnType<typeof organizationFactory>;
      let command: GenerateApiKeyCommand;
      let result: { apiKey: string; expiresAt: Date };

      beforeEach(async () => {
        testUser = userFactory({
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

        testOrganization = organizationFactory({
          id: organizationId,
          name: 'Test Organization',
          slug: 'test-org',
        });

        command = {
          userId,
          organizationId,
        };

        mockUserService.getUserById.mockResolvedValue(testUser);
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          testOrganization,
        );
        mockApiKeyService.generateApiKey.mockReturnValue(expectedApiKey);
        mockApiKeyService.getApiKeyExpiration.mockReturnValue(
          expectedExpiresAt,
        );

        result = await generateApiKeyUseCase.execute(command);
      });

      it('returns the generated API key with expiration', () => {
        expect(result).toEqual({
          apiKey: expectedApiKey,
          expiresAt: expectedExpiresAt,
        });
      });

      it('fetches the user by ID', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      });

      it('fetches the organization by ID', () => {
        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith(organizationId);
      });

      it('generates the API key with correct parameters', () => {
        expect(mockApiKeyService.generateApiKey).toHaveBeenCalledWith(
          testUser,
          testOrganization,
          'admin',
          expect.any(String),
        );
      });

      it('retrieves the API key expiration', () => {
        expect(mockApiKeyService.getApiKeyExpiration).toHaveBeenCalledWith(
          expectedApiKey,
        );
      });
    });

    describe('when user is not found', () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');

      beforeEach(() => {
        mockUserService.getUserById.mockResolvedValue(null);
      });

      it('throws user not found error', async () => {
        const command: GenerateApiKeyCommand = {
          userId,
          organizationId,
        };

        await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
          'User not found',
        );
      });
    });

    describe('when organization is not found', () => {
      const userId = createUserId('user-123');
      const organizationId = createOrganizationId('org-456');

      beforeEach(() => {
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
      });

      it('throws organization not found error', async () => {
        const command: GenerateApiKeyCommand = {
          userId,
          organizationId,
        };

        await expect(generateApiKeyUseCase.execute(command)).rejects.toThrow(
          'Organization not found',
        );
      });
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
