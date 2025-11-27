import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  LLMProvider,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';
import { TestSavedLLMConfigurationUseCase } from './testSavedLLMConfiguration.usecase';
import { createLLMService } from '../../../factories/createLLMService';

jest.mock('../../../factories/createLLMService');

const mockedCreateLLMService = createLLMService as jest.MockedFunction<
  typeof createLLMService
>;

describe('TestSavedLLMConfigurationUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-456');

  let useCase: TestSavedLLMConfigurationUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockConfigurationRepository: jest.Mocked<ILLMConfigurationRepository>;
  let mockExecutePrompt: jest.Mock;

  const adminUser = {
    id: userId,
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'admin' as const,
      },
    ],
  };

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    passwordHash: 'hashed-password',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  };

  const organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockConfigurationRepository = {
      save: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };

    mockExecutePrompt = jest.fn();

    mockedCreateLLMService.mockReturnValue({
      executePrompt: mockExecutePrompt,
      isConfigured: jest.fn().mockResolvedValue(true),
      executePromptWithHistory: jest.fn(),
      getModels: jest.fn(),
    });

    useCase = new TestSavedLLMConfigurationUseCase(
      mockAccountsPort,
      mockConfigurationRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is an admin', () => {
    beforeEach(() => {
      mockAccountsPort.getUserById.mockResolvedValue(adminUser);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);
    });

    describe('when no configuration exists', () => {
      beforeEach(() => {
        mockConfigurationRepository.get.mockResolvedValue(null);
      });

      it('returns hasConfiguration as false', async () => {
        const result = await useCase.execute({ userId, organizationId });

        expect(result.hasConfiguration).toBe(false);
      });

      it('returns overallSuccess as false', async () => {
        const result = await useCase.execute({ userId, organizationId });

        expect(result.overallSuccess).toBe(false);
      });

      it('does not call createLLMService', async () => {
        await useCase.execute({ userId, organizationId });

        expect(mockedCreateLLMService).not.toHaveBeenCalled();
      });
    });

    describe('when configuration exists', () => {
      const configuredAt = new Date('2024-01-15T10:00:00Z');

      beforeEach(() => {
        mockConfigurationRepository.get.mockResolvedValue({
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'sk-test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4-mini',
          },
          configuredAt,
        });
      });

      describe('when connection test succeeds', () => {
        beforeEach(() => {
          mockExecutePrompt
            .mockResolvedValueOnce({
              success: true,
              model: 'gpt-4',
              data: 'Hello!',
            })
            .mockResolvedValueOnce({
              success: true,
              model: 'gpt-4-mini',
              data: 'Hi!',
            });
        });

        it('returns hasConfiguration as true', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.hasConfiguration).toBe(true);
        });

        it('returns overallSuccess as true', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.overallSuccess).toBe(true);
        });

        it('returns standard model success', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.standardModel.success).toBe(true);
        });

        it('returns fast model success', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.fastModel?.success).toBe(true);
        });

        it('returns the correct provider', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.provider).toBe(LLMProvider.OPENAI);
        });
      });

      describe('when connection test fails', () => {
        beforeEach(() => {
          mockExecutePrompt.mockResolvedValueOnce({
            success: false,
            model: 'gpt-4',
            data: null,
            error: 'Unauthorized (401)',
            attempts: 1,
          });
        });

        it('returns hasConfiguration as true', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.hasConfiguration).toBe(true);
        });

        it('returns overallSuccess as false', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.overallSuccess).toBe(false);
        });

        it('returns standard model failure', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.standardModel.success).toBe(false);
        });

        it('returns error message', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.standardModel.error?.message).toBe(
            'Unauthorized (401)',
          );
        });

        it('returns authentication error type', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.standardModel.error?.type).toBe('AUTHENTICATION_ERROR');
        });
      });

      describe('when connection test throws exception', () => {
        beforeEach(() => {
          mockExecutePrompt.mockRejectedValueOnce(
            new Error('Network timeout occurred'),
          );
        });

        it('returns overallSuccess as false', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.overallSuccess).toBe(false);
        });

        it('returns network error type', async () => {
          const result = await useCase.execute({ userId, organizationId });

          expect(result.standardModel.error?.type).toBe('NETWORK_ERROR');
        });
      });
    });

    describe('when same model is used for standard and fast', () => {
      beforeEach(() => {
        mockConfigurationRepository.get.mockResolvedValue({
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'sk-test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4',
          },
          configuredAt: new Date(),
        });
        mockExecutePrompt.mockResolvedValueOnce({
          success: true,
          model: 'gpt-4',
          data: 'Hello!',
        });
      });

      it('does not test fast model separately', async () => {
        const result = await useCase.execute({ userId, organizationId });

        expect(result.fastModel).toBeUndefined();
      });

      it('calls executePrompt only once', async () => {
        await useCase.execute({ userId, organizationId });

        expect(mockExecutePrompt).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when user is not an admin', () => {
    beforeEach(() => {
      mockAccountsPort.getUserById.mockResolvedValue(memberUser);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute({ userId, organizationId })).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });

    it('does not call repository', async () => {
      await expect(
        useCase.execute({ userId, organizationId }),
      ).rejects.toThrow();

      expect(mockConfigurationRepository.get).not.toHaveBeenCalled();
    });
  });
});
