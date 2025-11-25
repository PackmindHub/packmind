import { createOrganizationId, LLMProvider } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { TestLLMConnectionUseCase } from './testLLMConnection.usecase';
import { createLLMService } from '../../../factories/createLLMService';

jest.mock('../../../factories/createLLMService');

const mockedCreateLLMService = createLLMService as jest.MockedFunction<
  typeof createLLMService
>;

describe('TestLLMConnectionUseCase', () => {
  let useCase: TestLLMConnectionUseCase;
  let mockExecutePrompt: jest.Mock;

  beforeEach(() => {
    useCase = new TestLLMConnectionUseCase();
    mockExecutePrompt = jest.fn();

    mockedCreateLLMService.mockReturnValue({
      executePrompt: mockExecutePrompt,
      isConfigured: jest.fn().mockResolvedValue(true),
      executePromptWithHistory: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when both models test successfully', () => {
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

      it('returns overall success true', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4-mini',
          },
        });

        expect(result.overallSuccess).toBe(true);
      });

      it('returns standard model success', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4-mini',
          },
        });

        expect(result.standardModel.success).toBe(true);
      });

      it('returns fast model success', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4-mini',
          },
        });

        expect(result.fastModel?.success).toBe(true);
      });
    });

    describe('when fast model is same as standard model', () => {
      it('does not test fast model separately', async () => {
        mockExecutePrompt.mockResolvedValueOnce({
          success: true,
          model: 'gpt-4',
          data: 'Hello!',
        });

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4',
          },
        });

        expect(result.fastModel).toBeUndefined();
      });
    });

    describe('when fast model is undefined', () => {
      it('does not test fast model', async () => {
        mockExecutePrompt.mockResolvedValueOnce({
          success: true,
          model: 'claude-sonnet-4-5-20250929',
          data: 'Hello!',
        });

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.ANTHROPIC,
            apiKey: 'test-key',
            model: 'claude-sonnet-4-5-20250929',
          },
        });

        expect(result.fastModel).toBeUndefined();
      });
    });

    describe('when authentication fails', () => {
      beforeEach(() => {
        mockExecutePrompt.mockResolvedValueOnce({
          success: false,
          model: 'gpt-4',
          data: null,
          error: 'Unauthorized (401)',
          attempts: 1,
        });
      });

      it('returns overall failure', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'invalid-key',
          },
        });

        expect(result.overallSuccess).toBe(false);
      });

      it('returns authentication error type', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'invalid-key',
          },
        });

        expect(result.standardModel.error?.type).toBe('AUTHENTICATION_ERROR');
      });

      it('returns error message', async () => {
        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'invalid-key',
          },
        });

        expect(result.standardModel.error?.message).toBe('Unauthorized (401)');
      });
    });

    describe('when rate limit is exceeded', () => {
      it('returns rate limit error type', async () => {
        mockExecutePrompt.mockResolvedValueOnce({
          success: false,
          model: 'gpt-4',
          data: null,
          error: 'Rate limit exceeded (429)',
          attempts: 2,
        });

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.standardModel.error?.type).toBe('RATE_LIMIT');
      });
    });

    describe('when network timeout occurs', () => {
      it('returns network error type', async () => {
        mockExecutePrompt.mockResolvedValueOnce({
          success: false,
          model: 'gpt-4',
          data: null,
          error: 'Network timeout occurred',
          attempts: 2,
        });

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.standardModel.error?.type).toBe('NETWORK_ERROR');
      });
    });

    describe('when exception has status property', () => {
      it('extracts status code from error object', async () => {
        const testError = {
          message: 'API Error',
          status: 503,
        };
        mockExecutePrompt.mockRejectedValueOnce(testError);

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        });

        expect(result.standardModel.error?.statusCode).toBe(503);
      });
    });

    describe('when standard model succeeds but fast model fails', () => {
      it('returns overall failure', async () => {
        mockExecutePrompt
          .mockResolvedValueOnce({
            success: true,
            model: 'gpt-4',
            data: 'Hello!',
          })
          .mockResolvedValueOnce({
            success: false,
            model: 'gpt-4-mini',
            data: null,
            error: 'Model not available',
            attempts: 2,
          });

        const result = await useCase.execute({
          userId: 'user-123',
          organizationId: createOrganizationId(uuidv4()),
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
            model: 'gpt-4',
            fastestModel: 'gpt-4-mini',
          },
        });

        expect(result.overallSuccess).toBe(false);
      });
    });
  });
});
