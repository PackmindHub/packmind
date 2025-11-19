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
      it('does not create client', async () => {
        const serviceWithEmptyKey = new OpenAIAPICompatibleService({
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

        const result = await serviceWithEmptyKey.executePrompt('test');

        expect(result.success).toBe(false);
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

    it('executes prompt successfully and returns string result', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Test AI response');
      expect(result.attempts).toBe(1);
      expect(result.model).toBe(testDefaultModel);
      expect(result.error).toBeUndefined();
      expect(result.tokensUsed).toEqual({
        input: 10,
        output: 20,
      });
    });

    it('executes prompt successfully and returns parsed JSON object', async () => {
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

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        jsonResponse,
      );

      interface TestResponse {
        summary: string;
        keywords: string[];
      }

      const result = await service.executePrompt<TestResponse>(mockPrompt);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        summary: 'Test summary',
        keywords: ['test', 'ai'],
      });
      expect(result.attempts).toBe(1);
    });

    it('uses fast model when performance option is set to FAST', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt, {
        performance: LLMModelPerformance.FAST,
      });

      expect(result.success).toBe(true);
      expect(result.model).toBe(testFastModel);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: testFastModel,
        }),
      );
    });

    it('handles invalid response from API', async () => {
      const invalidResponse = {
        choices: [],
        usage: { total_tokens: 0 },
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain(
        'Invalid response from OpenAIAPICompatibleService',
      );
    });

    it('retries on rate limit errors immediately', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Test AI response');
      expect(result.attempts).toBe(3);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
        3,
      );
    });

    it('stops retrying on authentication errors', async () => {
      const authError = new Error('Unauthorized (401)');
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(authError);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('failed after 5 attempts');
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
        1,
      );
    });

    it('fails after maximum retry attempts', async () => {
      const networkError = new Error('Network timeout');
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('failed after 3 attempts');
      expect(result.attempts).toBe(3);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
        3,
      );
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

    it('executes prompt with history successfully', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('I am doing well, thank you!');
      expect(result.attempts).toBe(1);
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

    it('handles errors with retry logic', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
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
