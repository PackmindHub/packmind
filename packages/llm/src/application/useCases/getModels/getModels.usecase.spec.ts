import { createOrganizationId, LLMProvider } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GetModelsUseCase } from './getModels.usecase';
import { createLLMService } from '../../../factories/createLLMService';

jest.mock('../../../factories/createLLMService');

const mockedCreateLLMService = createLLMService as jest.MockedFunction<
  typeof createLLMService
>;

describe('GetModelsUseCase', () => {
  let useCase: GetModelsUseCase;
  let mockGetModels: jest.Mock;

  beforeEach(() => {
    useCase = new GetModelsUseCase();
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

  describe('execute', () => {
    describe('when models are successfully retrieved', () => {
      beforeEach(() => {
        mockGetModels.mockResolvedValue([
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ]);
      });

      it('returns success true', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.success).toBe(true);
      });

      it('returns the list of model IDs', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.models).toEqual([
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ]);
      });

      it('returns the provider', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.provider).toBe(LLMProvider.OPENAI);
      });

      it('does not include error', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.error).toBeUndefined();
      });
    });

    describe('when no models are available', () => {
      beforeEach(() => {
        mockGetModels.mockResolvedValue([]);
      });

      it('returns success true with empty array', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.ANTHROPIC,
            apiKey: 'test-key',
          },
        });

        expect(result.success).toBe(true);
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
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.success).toBe(false);
      });

      it('returns empty models array', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.models).toEqual([]);
      });

      it('includes error details', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Network error: Failed to fetch');
      });

      it('classifies error type correctly', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

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
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.ANTHROPIC,
            apiKey: 'invalid-key',
          },
        });

        expect(result.error?.type).toBe('AUTHENTICATION_ERROR');
      });
    });

    describe('when rate limited', () => {
      beforeEach(() => {
        mockGetModels.mockRejectedValue(new Error('Rate limit exceeded (429)'));
      });

      it('classifies error as rate limit', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.GEMINI,
            apiKey: 'test-key',
          },
        });

        expect(result.error?.type).toBe('RATE_LIMIT');
      });
    });

    describe('when using Packmind provider', () => {
      beforeEach(() => {
        mockGetModels.mockResolvedValue([]);
      });

      it('returns empty array', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.PACKMIND,
          },
        });

        expect(result.success).toBe(true);
        expect(result.models).toEqual([]);
      });
    });
  });
});
