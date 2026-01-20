import {
  createOrganizationId,
  createUserId,
  LLMProvider,
  IAccountsPort,
  GetModelsCommand,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { GetModelsUseCase } from './getModels.usecase';
import { createLLMService } from '../../../factories/createLLMService';

jest.mock('../../../factories/createLLMService');

const mockedCreateLLMService = createLLMService as jest.MockedFunction<
  typeof createLLMService
>;

describe('GetModelsUseCase', () => {
  let useCase: GetModelsUseCase;
  let mockGetModels: jest.Mock;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    stubbedLogger = stubLogger();

    useCase = new GetModelsUseCase(mockAccountsPort, stubbedLogger);
    mockGetModels = jest.fn();

    mockedCreateLLMService.mockReturnValue({
      getModels: mockGetModels,
      isConfigured: jest.fn().mockResolvedValue(true),
      executePrompt: jest.fn(),
      executePromptWithHistory: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    const userId = createUserId('user-123');
    const organizationId = createOrganizationId('org-456');
    const user = userFactory({ id: userId });
    const organization = organizationFactory({ id: organizationId });
    const membership = {
      userId,
      organizationId,
      role: 'member' as const,
    };

    const createValidCommand = (
      configOverrides?: Partial<GetModelsCommand['config']>,
    ): GetModelsCommand & MemberContext => ({
      userId: String(userId),
      organizationId,
      user,
      organization,
      membership,
      config: {
        provider: LLMProvider.OPENAI,
        apiKey: 'test-key',
        ...configOverrides,
      },
    });

    describe('when models are successfully retrieved', () => {
      beforeEach(() => {
        mockGetModels.mockResolvedValue([
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ]);
      });

      it('returns success true', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.success).toBe(true);
      });

      it('returns the list of model IDs', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.models).toEqual([
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ]);
      });

      it('returns the provider', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.provider).toBe(LLMProvider.OPENAI);
      });

      it('does not include error', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.error).toBeUndefined();
      });
    });

    describe('when no models are available', () => {
      let result: Awaited<ReturnType<typeof useCase.executeForMembers>>;

      beforeEach(async () => {
        mockGetModels.mockResolvedValue([]);
        result = await useCase.executeForMembers(
          createValidCommand({ provider: LLMProvider.ANTHROPIC }),
        );
      });

      it('returns success true', () => {
        expect(result.success).toBe(true);
      });

      it('returns empty array', () => {
        expect(result.models).toEqual([]);
      });
    });

    describe('when getModels throws an error', () => {
      beforeEach(() => {
        mockGetModels.mockRejectedValue(
          new Error('Network error: Failed to fetch'),
        );
      });

      it('returns success false', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.success).toBe(false);
      });

      it('returns empty models array', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.models).toEqual([]);
      });

      it('includes error details', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.error?.message).toBe('Network error: Failed to fetch');
      });

      it('classifies error type correctly', async () => {
        const result = await useCase.executeForMembers(createValidCommand());

        expect(result.error?.type).toBe('NETWORK_ERROR');
      });
    });

    describe('when authentication fails', () => {
      beforeEach(() => {
        mockGetModels.mockRejectedValue(
          new Error('Unauthorized (401): Invalid API key'),
        );
      });

      it('classifies error as authentication error', async () => {
        const result = await useCase.executeForMembers(
          createValidCommand({
            provider: LLMProvider.ANTHROPIC,
            apiKey: 'invalid-key',
          }),
        );

        expect(result.error?.type).toBe('AUTHENTICATION_ERROR');
      });
    });

    describe('when rate limited', () => {
      beforeEach(() => {
        mockGetModels.mockRejectedValue(new Error('Rate limit exceeded (429)'));
      });

      it('classifies error as rate limit', async () => {
        const result = await useCase.executeForMembers(
          createValidCommand({ provider: LLMProvider.GEMINI }),
        );

        expect(result.error?.type).toBe('RATE_LIMIT');
      });
    });

    describe('when using Packmind provider', () => {
      let result: Awaited<ReturnType<typeof useCase.executeForMembers>>;

      beforeEach(async () => {
        mockGetModels.mockResolvedValue([]);
        result = await useCase.executeForMembers(
          createValidCommand({ provider: LLMProvider.PACKMIND }),
        );
      });

      it('returns success true', () => {
        expect(result.success).toBe(true);
      });

      it('returns empty array', () => {
        expect(result.models).toEqual([]);
      });
    });

    describe('when using Azure OpenAI provider', () => {
      let result: Awaited<ReturnType<typeof useCase.executeForMembers>>;

      beforeEach(async () => {
        mockGetModels.mockRejectedValue(
          new Error(
            'Method not implemented for this Provider. Azure OpenAI deployment names must be configured manually from Azure Portal.',
          ),
        );
        result = await useCase.executeForMembers(
          createValidCommand({
            provider: LLMProvider.AZURE_OPENAI,
            model: 'my-deployment',
            fastestModel: 'my-fast-deployment',
          }),
        );
      });

      it('returns success false', () => {
        expect(result.success).toBe(false);
      });

      it('includes error message indicating method not implemented', () => {
        expect(result.error?.message).toContain('Method not implemented');
      });
    });
  });
});
