import { OpenAIAPICompatibleService } from './OpenAIAPICompatibleService';
import {
  AIServiceErrorTypes,
  LLMModelPerformance,
  PromptConversationRole,
} from '@packmind/types';
import { LLMProvider } from '../../types/LLMServiceConfig';

// Helper for accessing protected methods in tests (test-only type assertion)
const getProtectedAccess = (
  service: OpenAIAPICompatibleService,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => service as any;

// Mock OpenAI
jest.mock('openai');

import OpenAI from 'openai';

const MockedOpenAI = jest.mocked(OpenAI);

describe('OpenAIAPICompatibleService', () => {
  let service: OpenAIAPICompatibleService;
  let mockOpenAIInstance: {
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: jest.MockedFunction<any>;
      };
    };
  };

  const testBaseUrl = 'https://api.example.com/v1/openai/';
  const testApiKey = 'test-api-key-123';
  const testDefaultModel = 'test-model-1';
  const testFastModel = 'test-model-fast';

  beforeEach(() => {
    // Create mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    MockedOpenAI.mockImplementation(
      () => mockOpenAIInstance as unknown as OpenAI,
    );

    service = new OpenAIAPICompatibleService({
      provider: LLMProvider.OPENAI_COMPATIBLE,
      llmEndpoint: testBaseUrl,
      llmApiKey: testApiKey,
      model: testDefaultModel,
      fastestModel: testFastModel,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    describe('when API key is provided', () => {
      it('returns true', async () => {
        const result = await service.isConfigured();

        expect(result).toBe(true);
      });
    });

    describe('when API key is empty', () => {
      it('returns false', async () => {
        const serviceWithEmptyKey = new OpenAIAPICompatibleService({
          provider: LLMProvider.OPENAI_COMPATIBLE,
          llmEndpoint: testBaseUrl,
          llmApiKey: '',
          model: testDefaultModel,
          fastestModel: testFastModel,
        });

        const result = await serviceWithEmptyKey.isConfigured();

        expect(result).toBe(false);
      });
    });
  });

  describe('initialize', () => {
    it('initializes OpenAI client with custom baseURL', async () => {
      await service.executePrompt('test');

      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: testApiKey,
        baseURL: testBaseUrl,
      });
    });

    describe('when API key is empty', () => {
      let serviceWithEmptyKey: OpenAIAPICompatibleService;

      beforeEach(() => {
        serviceWithEmptyKey = new OpenAIAPICompatibleService({
          provider: LLMProvider.OPENAI_COMPATIBLE,
          llmEndpoint: testBaseUrl,
          llmApiKey: '',
          model: testDefaultModel,
          fastestModel: testFastModel,
        });

        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: 'test' } }],
          usage: { total_tokens: 10 },
        });
      });

      it('returns failure result', async () => {
        const result = await serviceWithEmptyKey.executePrompt('test');

        expect(result.success).toBe(false);
      });

      it('returns configuration error message', async () => {
        const result = await serviceWithEmptyKey.executePrompt('test');

        expect(result.error).toBe('OpenAIAPICompatibleService not configured');
      });
    });
  });

  describe('executePrompt', () => {
    const mockPrompt = 'Test prompt for AI';
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Test AI response',
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };

    describe('when executing prompt successfully', () => {
      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns expected data content', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Test AI response');
      });

      it('tracks number of attempts', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.attempts).toBe(1);
      });

      it('returns used model name', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.model).toBe(testDefaultModel);
      });

      it('does not include error message', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.error).toBeUndefined();
      });

      it('includes token usage information', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.tokensUsed).toEqual({
          input: 10,
          output: 20,
        });
      });
    });

    describe('when response contains thinking tags', () => {
      const responseWithThinking = {
        choices: [
          {
            message: {
              content:
                '<think>First, let me analyze this... The answer should be clear.</think>The final answer is 42.',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 30,
          total_tokens: 40,
        },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          responseWithThinking,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns content without thinking tags', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('The final answer is 42.');
      });

      it('does not include opening thinking tag', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).not.toContain('<think>');
      });

      it('does not include closing thinking tag', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).not.toContain('</think>');
      });
    });

    describe('when response contains multiple thinking tag blocks', () => {
      const responseWithMultipleThinking = {
        choices: [
          {
            message: {
              content:
                '<think>Reasoning part 1...</think>Answer part 1. <think>Reasoning part 2...</think>Answer part 2.',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 40,
          total_tokens: 50,
        },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          responseWithMultipleThinking,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('removes all thinking tag blocks', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Answer part 1. Answer part 2.');
      });

      it('does not include thinking tags', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).not.toContain('<think>');
      });
    });

    describe('when response contains multiline thinking tags', () => {
      const responseWithMultilineThinking = {
        choices: [
          {
            message: {
              content: `<think>
Let me think about this step by step:
1. First consideration
2. Second consideration
3. Final reasoning
</think>

Here is the final answer.`,
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 50,
          total_tokens: 60,
        },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          responseWithMultilineThinking,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns only final answer', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Here is the final answer.');
      });

      it('does not include reasoning content', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).not.toContain('step by step');
      });
    });

    describe('when response has no thinking tags', () => {
      const normalResponse = {
        choices: [
          {
            message: {
              content: 'Normal response without any thinking tags.',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          normalResponse,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns unmodified content', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Normal response without any thinking tags.');
      });
    });

    describe('when response is JSON', () => {
      const jsonResponse = {
        choices: [
          {
            message: {
              content:
                '{"summary": "Test summary", "keywords": ["test", "ai"]}',
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      interface TestResponse {
        summary: string;
        keywords: string[];
      }

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          jsonResponse,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt<TestResponse>(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('parses JSON content correctly', async () => {
        const result = await service.executePrompt<TestResponse>(mockPrompt);

        expect(result.data).toEqual({
          summary: 'Test summary',
          keywords: ['test', 'ai'],
        });
      });

      it('tracks number of attempts', async () => {
        const result = await service.executePrompt<TestResponse>(mockPrompt);

        expect(result.attempts).toBe(1);
      });
    });

    describe('when performance option is set to FAST', () => {
      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePrompt(mockPrompt, {
          performance: LLMModelPerformance.FAST,
        });

        expect(result.success).toBe(true);
      });

      it('uses fast model name', async () => {
        const result = await service.executePrompt(mockPrompt, {
          performance: LLMModelPerformance.FAST,
        });

        expect(result.model).toBe(testFastModel);
      });

      it('calls API with fast model', async () => {
        await service.executePrompt(mockPrompt, {
          performance: LLMModelPerformance.FAST,
        });

        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            model: testFastModel,
          }),
        );
      });
    });

    describe('when API returns invalid response', () => {
      const invalidResponse = {
        choices: [],
        usage: { total_tokens: 0 },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          invalidResponse,
        );
      });

      it('returns failure status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBeNull();
      });

      it('includes invalid response error message', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.error).toContain(
          'Invalid response from OpenAIAPICompatibleService',
        );
      });
    });

    describe('when rate limit errors occur', () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);
      });

      it('returns success after retries', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns expected data', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Test AI response');
      });

      it('tracks all retry attempts', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.attempts).toBe(3);
      });

      it('calls API multiple times', async () => {
        await service.executePrompt(mockPrompt);

        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(3);
      });
    });

    describe('when authentication error occurs', () => {
      const authError = new Error('Unauthorized (401)');

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValue(authError);
      });

      it('returns failure status', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBeNull();
      });

      it('includes failure message', async () => {
        const result = await service.executePrompt(mockPrompt);

        expect(result.error).toContain('failed after 5 attempts');
      });

      it('does not retry', async () => {
        await service.executePrompt(mockPrompt);

        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(1);
      });
    });

    describe('when maximum retry attempts reached', () => {
      const networkError = new Error('Network timeout');

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockRejectedValue(
          networkError,
        );
      });

      it('returns failure status', async () => {
        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.data).toBeNull();
      });

      it('includes failure message with attempt count', async () => {
        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.error).toContain('failed after 3 attempts');
      });

      it('tracks all attempts', async () => {
        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.attempts).toBe(3);
      });

      it('calls API for each retry', async () => {
        await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('executePromptWithHistory', () => {
    const mockConversation = [
      { role: PromptConversationRole.USER, message: 'Hello' },
      { role: PromptConversationRole.ASSISTANT, message: 'Hi there!' },
      { role: PromptConversationRole.USER, message: 'How are you?' },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: 'I am doing well, thank you!',
          },
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 15,
        total_tokens: 35,
      },
    };

    describe('when executing with conversation history', () => {
      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.success).toBe(true);
      });

      it('returns expected response', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.data).toBe('I am doing well, thank you!');
      });

      it('tracks single attempt', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.attempts).toBe(1);
      });

      it('formats conversation messages correctly', async () => {
        await service.executePromptWithHistory(mockConversation);

        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hi there!' },
              { role: 'user', content: 'How are you?' },
            ],
          }),
        );
      });
    });

    describe('when history response contains thinking tags', () => {
      const responseWithThinking = {
        choices: [
          {
            message: {
              content:
                '<think>Let me consider the conversation context...</think>I am doing well, thank you!',
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 25,
          total_tokens: 45,
        },
      };

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          responseWithThinking,
        );
      });

      it('returns success status', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.success).toBe(true);
      });

      it('returns content without thinking tags', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.data).toBe('I am doing well, thank you!');
      });

      it('does not include opening thinking tag', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.data).not.toContain('<think>');
      });

      it('does not include closing thinking tag', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.data).not.toContain('</think>');
      });
    });

    it('maps SYSTEM role to system in messages', async () => {
      const conversationWithSystem = [
        {
          role: PromptConversationRole.SYSTEM,
          message: 'You are a helpful assistant',
        },
        { role: PromptConversationRole.USER, message: 'Hello' },
      ];

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      await service.executePromptWithHistory(conversationWithSystem);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello' },
          ],
        }),
      );
    });

    describe('when errors occur with retry', () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      beforeEach(() => {
        mockOpenAIInstance.chat.completions.create
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);
      });

      it('returns success after retry', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.success).toBe(true);
      });

      it('tracks retry attempts', async () => {
        const result = await service.executePromptWithHistory(mockConversation);

        expect(result.attempts).toBe(2);
      });
    });
  });

  describe('error classification', () => {
    it('classifies rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const errorType =
        getProtectedAccess(service).classifyError(rateLimitError);
      expect(errorType).toBe(AIServiceErrorTypes.RATE_LIMIT);
    });

    it('classifies authentication errors correctly', () => {
      const authError = new Error('Unauthorized access');
      const errorType = getProtectedAccess(service).classifyError(authError);
      expect(errorType).toBe(AIServiceErrorTypes.AUTHENTICATION_ERROR);
    });

    it('classifies network errors correctly', () => {
      const networkError = new Error('Network timeout occurred');
      const errorType = getProtectedAccess(service).classifyError(networkError);
      expect(errorType).toBe(AIServiceErrorTypes.NETWORK_ERROR);
    });

    it('defaults to API_ERROR for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const errorType = getProtectedAccess(service).classifyError(unknownError);
      expect(errorType).toBe(AIServiceErrorTypes.API_ERROR);
    });
  });

  describe('retry logic', () => {
    it('retries for rate limit errors', () => {
      const shouldRetry = getProtectedAccess(service).shouldRetry(
        AIServiceErrorTypes.RATE_LIMIT,
        1,
        5,
      );
      expect(shouldRetry).toBe(true);
    });

    it('does not retry for authentication errors', () => {
      const shouldRetry = getProtectedAccess(service).shouldRetry(
        AIServiceErrorTypes.AUTHENTICATION_ERROR,
        1,
        5,
      );
      expect(shouldRetry).toBe(false);
    });

    describe('when max attempts reached', () => {
      it('does not retry', () => {
        const shouldRetry = getProtectedAccess(service).shouldRetry(
          AIServiceErrorTypes.RATE_LIMIT,
          5,
          5,
        );
        expect(shouldRetry).toBe(false);
      });
    });
  });
});
