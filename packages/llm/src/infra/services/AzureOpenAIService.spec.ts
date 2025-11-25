import { AzureOpenAIService } from './AzureOpenAIService';
import {
  AIServiceErrorTypes,
  LLMProvider,
  PromptConversationRole,
} from '@packmind/types';

// Helper for accessing private methods in tests (test-only type assertion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateAccess = (service: AzureOpenAIService) => service as any;

// Mock Azure OpenAI
jest.mock('openai');
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

import { AzureOpenAI } from 'openai';
import { Configuration } from '@packmind/node-utils';

const MockedAzureOpenAI = jest.mocked(AzureOpenAI);
const MockedConfiguration = jest.mocked(Configuration);

describe('AzureOpenAIService', () => {
  let service: AzureOpenAIService;
  let mockAzureOpenAIInstance: {
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: jest.MockedFunction<any>;
      };
    };
  };

  beforeEach(() => {
    // Create mock Azure OpenAI instance
    mockAzureOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    MockedAzureOpenAI.mockImplementation(
      () => mockAzureOpenAIInstance as unknown as AzureOpenAI,
    );
    MockedConfiguration.getConfig.mockImplementation((key: string) => {
      if (key === 'AZURE_OPENAI_API_KEY') {
        return Promise.resolve('test-api-key');
      }
      if (key === 'AZURE_OPENAI_ENDPOINT') {
        return Promise.resolve('https://test.openai.azure.com');
      }
      return Promise.resolve(null);
    });

    service = new AzureOpenAIService({
      provider: LLMProvider.AZURE_OPENAI,
      model: 'gpt-4-deployment',
      fastestModel: 'gpt-35-turbo-deployment',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    describe('using config values', () => {
      it('uses endpoint from config over environment variable', async () => {
        const serviceWithConfig = new AzureOpenAIService({
          provider: LLMProvider.AZURE_OPENAI,
          model: 'gpt-4-deployment',
          fastestModel: 'gpt-35-turbo-deployment',
          endpoint: 'https://custom.openai.azure.com',
          apiKey: 'custom-api-key',
        });

        const result = await serviceWithConfig.isConfigured();

        expect(result).toBe(true);
        expect(MockedConfiguration.getConfig).not.toHaveBeenCalled();
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
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
    });

    it('returns the AI response data', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBe('Test AI response');
    });

    it('tracks the number of attempts', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(1);
    });

    it('includes token usage in result', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.tokensUsed).toEqual({
        input: 10,
        output: 20,
      });
    });

    it('does not return an error on success', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toBeUndefined();
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
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        jsonResponse,
      );

      interface TestResponse {
        summary: string;
        keywords: string[];
      }

      const result = await service.executePrompt<TestResponse>(mockPrompt);

      expect(result.data).toEqual({
        summary: 'Test summary',
        keywords: ['test', 'ai'],
      });
    });

    it('handles missing API key gracefully with failure status', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data if API key is missing', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message if API key is not configured', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toBe('AzureOpenAIService not configured');
    });

    it('sets attempts to 1 if API key is missing', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(1);
    });

    it('handles missing endpoint gracefully with failure status', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve('test-api-key');
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data if endpoint is missing', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve('test-api-key');
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    describe('isConfigured', () => {
      describe('with API key and endpoint available', () => {
        it('returns true', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'AZURE_OPENAI_API_KEY') {
              return Promise.resolve('test-api-key');
            }
            if (key === 'AZURE_OPENAI_ENDPOINT') {
              return Promise.resolve('https://test.openai.azure.com');
            }
            return Promise.resolve(null);
          });

          const result = await service.isConfigured();

          expect(result).toBe(true);
        });

        it('calls Configuration.getConfig with AZURE_OPENAI_API_KEY', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'AZURE_OPENAI_API_KEY') {
              return Promise.resolve('test-api-key');
            }
            if (key === 'AZURE_OPENAI_ENDPOINT') {
              return Promise.resolve('https://test.openai.azure.com');
            }
            return Promise.resolve(null);
          });

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'AZURE_OPENAI_API_KEY',
          );
        });

        it('calls Configuration.getConfig with AZURE_OPENAI_ENDPOINT', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'AZURE_OPENAI_API_KEY') {
              return Promise.resolve('test-api-key');
            }
            if (key === 'AZURE_OPENAI_ENDPOINT') {
              return Promise.resolve('https://test.openai.azure.com');
            }
            return Promise.resolve(null);
          });

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'AZURE_OPENAI_ENDPOINT',
          );
        });
      });

      describe('with API key missing', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'AZURE_OPENAI_API_KEY') {
              return Promise.resolve(null);
            }
            if (key === 'AZURE_OPENAI_ENDPOINT') {
              return Promise.resolve('https://test.openai.azure.com');
            }
            return Promise.resolve(null);
          });

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });
      });

      describe('with endpoint missing', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'AZURE_OPENAI_API_KEY') {
              return Promise.resolve('test-api-key');
            }
            if (key === 'AZURE_OPENAI_ENDPOINT') {
              return Promise.resolve(null);
            }
            return Promise.resolve(null);
          });

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });
      });

      describe('if configuration throws an error', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockRejectedValue(
            new Error('Config error'),
          );

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });
      });
    });

    it('handles invalid Azure OpenAI response with failure status', async () => {
      const invalidResponse = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data for invalid response', async () => {
      const invalidResponse = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message for invalid Azure OpenAI response', async () => {
      const invalidResponse = {
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toContain(
        'Invalid response from AzureOpenAIService',
      );
    });

    it('retries on rate limit errors immediately', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
    });

    it('returns correct data after retrying', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBe('Test AI response');
    });

    it('tracks correct number of attempts after retries', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(3);
    });

    it('calls create multiple times during retries', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      await service.executePrompt(mockPrompt);

      expect(
        mockAzureOpenAIInstance.chat.completions.create,
      ).toHaveBeenCalledTimes(3);
    });

    it('stops retrying on authentication errors', async () => {
      const authError = new Error('Unauthorized (401)');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        authError,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data on authentication failure', async () => {
      const authError = new Error('Unauthorized (401)');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        authError,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message indicating retry failure', async () => {
      const authError = new Error('Unauthorized (401)');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        authError,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toContain('failed after 5 attempts');
    });

    it('calls create only once for authentication errors', async () => {
      const authError = new Error('Unauthorized (401)');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        authError,
      );

      await service.executePrompt(mockPrompt);

      expect(
        mockAzureOpenAIInstance.chat.completions.create,
      ).toHaveBeenCalledTimes(1);
    });

    it('fails after maximum retry attempts', async () => {
      const networkError = new Error('Network timeout');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.success).toBe(false);
    });

    it('returns null data after exceeding max retries', async () => {
      const networkError = new Error('Network timeout');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.data).toBeNull();
    });

    it('provides error message about max retries', async () => {
      const networkError = new Error('Network timeout');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.error).toContain('failed after 3 attempts');
    });

    it('tracks correct attempts after exceeding max retries', async () => {
      const networkError = new Error('Network timeout');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.attempts).toBe(3);
    });

    it('calls create exact number of retry attempts', async () => {
      const networkError = new Error('Network timeout');
      mockAzureOpenAIInstance.chat.completions.create.mockRejectedValue(
        networkError,
      );

      await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(
        mockAzureOpenAIInstance.chat.completions.create,
      ).toHaveBeenCalledTimes(3);
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
        prompt_tokens: 15,
        completion_tokens: 10,
        total_tokens: 25,
      },
    };

    it('executes prompt with history successfully', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
    });

    it('returns correct data from chat with history', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.data).toBe('I am doing well, thank you!');
    });

    it('tracks attempts correctly with history', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.attempts).toBe(1);
    });

    it('includes token usage with history', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.tokensUsed).toEqual({
        input: 15,
        output: 10,
      });
    });

    it('formats conversation history correctly for Azure OpenAI', async () => {
      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockResponse,
      );

      await service.executePromptWithHistory(mockConversation);

      expect(
        mockAzureOpenAIInstance.chat.completions.create,
      ).toHaveBeenCalledWith({
        model: expect.any(String),
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      });
    });

    it('handles missing API key gracefully with history', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(false);
    });

    it('returns null data if API key missing with history', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.data).toBeNull();
    });

    it('provides error message for missing API key with history', async () => {
      MockedConfiguration.getConfig.mockImplementation((key: string) => {
        if (key === 'AZURE_OPENAI_API_KEY') {
          return Promise.resolve(null);
        }
        if (key === 'AZURE_OPENAI_ENDPOINT') {
          return Promise.resolve('https://test.openai.azure.com');
        }
        return Promise.resolve(null);
      });

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.error).toBe('AzureOpenAIService not configured');
    });

    it('retries on rate limit errors with history', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
    });

    it('tracks attempts correctly after retries with history', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockAzureOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.attempts).toBe(2);
    });

    it('handles invalid response with history', async () => {
      const invalidResponse = {
        choices: [],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 0,
          total_tokens: 15,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(false);
    });

    it('provides error message for invalid response with history', async () => {
      const invalidResponse = {
        choices: [],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 0,
          total_tokens: 15,
        },
      };

      mockAzureOpenAIInstance.chat.completions.create.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.error).toContain(
        'Invalid response from AzureOpenAIService',
      );
    });
  });

  describe('error classification', () => {
    let service: AzureOpenAIService;

    beforeEach(() => {
      service = new AzureOpenAIService({
        provider: LLMProvider.AZURE_OPENAI,
        model: 'gpt-4-deployment',
        fastestModel: 'gpt-35-turbo-deployment',
      });
    });

    it('classifies rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      const errorType = getPrivateAccess(service).classifyError(rateLimitError);
      expect(errorType).toBe(AIServiceErrorTypes.RATE_LIMIT);
    });

    it('classifies authentication errors correctly', () => {
      const authError = new Error('Unauthorized access');
      const errorType = getPrivateAccess(service).classifyError(authError);
      expect(errorType).toBe(AIServiceErrorTypes.AUTHENTICATION_ERROR);
    });

    it('classifies network errors correctly', () => {
      const networkError = new Error('Network timeout occurred');
      const errorType = getPrivateAccess(service).classifyError(networkError);
      expect(errorType).toBe(AIServiceErrorTypes.NETWORK_ERROR);
    });

    it('defaults to API_ERROR for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const errorType = getPrivateAccess(service).classifyError(unknownError);
      expect(errorType).toBe(AIServiceErrorTypes.API_ERROR);
    });
  });

  describe('retry logic', () => {
    let service: AzureOpenAIService;

    beforeEach(() => {
      service = new AzureOpenAIService({
        provider: LLMProvider.AZURE_OPENAI,
        model: 'gpt-4-deployment',
        fastestModel: 'gpt-35-turbo-deployment',
      });
    });

    it('retries for rate limit errors', () => {
      const shouldRetry = getPrivateAccess(service).shouldRetry(
        AIServiceErrorTypes.RATE_LIMIT,
        1,
        5,
      );
      expect(shouldRetry).toBe(true);
    });

    it('does not retry for authentication errors', () => {
      const shouldRetry = getPrivateAccess(service).shouldRetry(
        AIServiceErrorTypes.AUTHENTICATION_ERROR,
        1,
        5,
      );
      expect(shouldRetry).toBe(false);
    });

    describe('after max attempts reached', () => {
      it('does not retry', () => {
        const shouldRetry = getPrivateAccess(service).shouldRetry(
          AIServiceErrorTypes.RATE_LIMIT,
          5,
          5,
        );
        expect(shouldRetry).toBe(false);
      });
    });
  });
});
