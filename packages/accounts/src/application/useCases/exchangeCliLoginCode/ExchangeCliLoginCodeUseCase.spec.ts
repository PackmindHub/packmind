import { createUserId, createOrganizationId } from '@packmind/types';
import {
  ExchangeCliLoginCodeUseCase,
  CliLoginCodeNotFoundError,
  CliLoginCodeExpiredError,
  CliLoginCodeUserNotFoundError,
  CliLoginCodeMembershipNotFoundError,
  CliLoginCodeOrganizationNotFoundError,
  CliLoginCodeApiKeyError,
} from './ExchangeCliLoginCodeUseCase';
import { ICliLoginCodeRepository } from '../../../domain/repositories/ICliLoginCodeRepository';
import { CliLoginCode } from '../../../domain/entities/CliLoginCode';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';
import { userFactory, organizationFactory } from '../../../../test';

describe('ExchangeCliLoginCodeUseCase', () => {
  let useCase: ExchangeCliLoginCodeUseCase;
  let mockRepository: jest.Mocked<ICliLoginCodeRepository>;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockApiKeyService: jest.Mocked<ApiKeyService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-456');
  const codeId = 'code-id' as CliLoginCode['id'];
  const codeToken = 'ABCD1234EF' as CliLoginCode['code'];

  beforeEach(() => {
    mockRepository = {
      add: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    } as jest.Mocked<ICliLoginCodeRepository>;

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

    useCase = new ExchangeCliLoginCodeUseCase(
      mockRepository,
      mockUserService,
      mockOrganizationService,
      mockApiKeyService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('with valid code', () => {
      const validCliLoginCode: CliLoginCode = {
        id: codeId,
        code: codeToken,
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
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

      it('returns API key and expiration date', async () => {
        const expectedApiKey = 'test.api.key';
        const expectedExpiresAt = new Date('2024-04-01T10:00:00Z');

        mockRepository.findByCode.mockResolvedValue(validCliLoginCode);
        mockUserService.getUserById.mockResolvedValue(testUser);
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          testOrganization,
        );
        mockApiKeyService.generateApiKey.mockReturnValue(expectedApiKey);
        mockApiKeyService.getApiKeyExpiration.mockReturnValue(
          expectedExpiresAt,
        );

        const result = await useCase.execute({ code: codeToken as string });

        expect(result).toEqual({
          apiKey: expectedApiKey,
          expiresAt: expectedExpiresAt,
        });
      });

      it('deletes the code after successful exchange', async () => {
        mockRepository.findByCode.mockResolvedValue(validCliLoginCode);
        mockUserService.getUserById.mockResolvedValue(testUser);
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          testOrganization,
        );
        mockApiKeyService.generateApiKey.mockReturnValue('test.api.key');
        mockApiKeyService.getApiKeyExpiration.mockReturnValue(new Date());

        await useCase.execute({ code: codeToken as string });

        expect(mockRepository.delete).toHaveBeenCalledWith(codeId);
      });
    });

    describe('when code is not found', () => {
      it('throws CliLoginCodeNotFoundError', async () => {
        mockRepository.findByCode.mockResolvedValue(null);

        await expect(useCase.execute({ code: 'INVALID_CODE' })).rejects.toThrow(
          CliLoginCodeNotFoundError,
        );
      });
    });

    describe('when code is expired', () => {
      const expiredCode: CliLoginCode = {
        id: codeId,
        code: codeToken,
        userId,
        organizationId,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };

      beforeEach(() => {
        mockRepository.findByCode.mockResolvedValue(expiredCode);
      });

      it('throws CliLoginCodeExpiredError', async () => {
        await expect(
          useCase.execute({ code: codeToken as string }),
        ).rejects.toThrow(CliLoginCodeExpiredError);
      });

      it('deletes the expired code', async () => {
        try {
          await useCase.execute({ code: codeToken as string });
        } catch {
          // Expected to throw
        }

        expect(mockRepository.delete).toHaveBeenCalledWith(codeId);
      });
    });

    describe('when user is not found', () => {
      it('throws CliLoginCodeUserNotFoundError', async () => {
        const validCode: CliLoginCode = {
          id: codeId,
          code: codeToken,
          userId,
          organizationId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        };

        mockRepository.findByCode.mockResolvedValue(validCode);
        mockUserService.getUserById.mockResolvedValue(null);

        await expect(
          useCase.execute({ code: codeToken as string }),
        ).rejects.toThrow(CliLoginCodeUserNotFoundError);
      });
    });

    describe('when user is not a member of the organization', () => {
      it('throws CliLoginCodeMembershipNotFoundError', async () => {
        const validCode: CliLoginCode = {
          id: codeId,
          code: codeToken,
          userId,
          organizationId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        };

        const userWithDifferentOrg = userFactory({
          id: userId,
          email: 'testuser@packmind.com',
          passwordHash: 'hash',
          memberships: [
            {
              userId,
              organizationId: createOrganizationId('different-org'),
              role: 'admin',
            },
          ],
        });

        mockRepository.findByCode.mockResolvedValue(validCode);
        mockUserService.getUserById.mockResolvedValue(userWithDifferentOrg);

        await expect(
          useCase.execute({ code: codeToken as string }),
        ).rejects.toThrow(CliLoginCodeMembershipNotFoundError);
      });
    });

    describe('when organization is not found', () => {
      it('throws CliLoginCodeOrganizationNotFoundError', async () => {
        const validCode: CliLoginCode = {
          id: codeId,
          code: codeToken,
          userId,
          organizationId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
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

        mockRepository.findByCode.mockResolvedValue(validCode);
        mockUserService.getUserById.mockResolvedValue(testUser);
        mockOrganizationService.getOrganizationById.mockResolvedValue(null);

        await expect(
          useCase.execute({ code: codeToken as string }),
        ).rejects.toThrow(CliLoginCodeOrganizationNotFoundError);
      });
    });

    describe('when API key expiration fails', () => {
      it('throws CliLoginCodeApiKeyError', async () => {
        const validCode: CliLoginCode = {
          id: codeId,
          code: codeToken,
          userId,
          organizationId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
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

        mockRepository.findByCode.mockResolvedValue(validCode);
        mockUserService.getUserById.mockResolvedValue(testUser);
        mockOrganizationService.getOrganizationById.mockResolvedValue(
          testOrganization,
        );
        mockApiKeyService.generateApiKey.mockReturnValue('test.api.key');
        mockApiKeyService.getApiKeyExpiration.mockReturnValue(null);

        await expect(
          useCase.execute({ code: codeToken as string }),
        ).rejects.toThrow(CliLoginCodeApiKeyError);
      });
    });
  });
});
