import { GeminiService } from './GeminiService';
import { AIServiceErrorTypes, PromptConversationRole } from '@packmind/types';
import { LLMProvider } from '../../types/LLMServiceConfig';

// Helper for accessing private methods in tests (test-only type assertion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateAccess = (service: GeminiService) => service as any;

// Mock Google Generative AI
jest.mock('@google/genai');
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

import { GoogleGenAI } from '@google/genai';
import { Configuration } from '@packmind/node-utils';

const MockedGoogleGenAI = jest.mocked(GoogleGenAI);
const MockedConfiguration = jest.mocked(Configuration);

describe('GeminiService', () => {
  let service: GeminiService;
  let mockGeminiInstance: {
    models: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generateContent: jest.MockedFunction<any>;
    };
  };

  beforeEach(() => {
    // Create mock Gemini instance
    mockGeminiInstance = {
      models: {
        generateContent: jest.fn(),
      },
    };

    MockedGoogleGenAI.mockImplementation(
      () => mockGeminiInstance as unknown as GoogleGenAI,
    );
    MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

    service = new GeminiService({ provider: LLMProvider.GEMINI });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executePrompt', () => {
    const mockPrompt = 'Test prompt for AI';
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Test AI response' }],
          },
        },
      ],
    };

    it('executes prompt successfully and returns string result', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
    });

    it('returns the AI response data', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBe('Test AI response');
    });

    it('tracks the number of attempts', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(1);
    });

    it('does not return an error on success', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toBeUndefined();
    });

    it('executes prompt successfully and returns parsed JSON object', async () => {
      const jsonResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"summary": "Test summary", "keywords": ["test", "ai"]}',
                },
              ],
            },
          },
        ],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(jsonResponse);

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
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data if API key is missing', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message if API key is not configured', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toBe('Gemini API key not configured');
    });

    it('sets attempts to 1 if API key is missing', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(1);
    });

    describe('isConfigured', () => {
      describe('with API key available', () => {
        it('returns true', async () => {
          MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

          const result = await service.isConfigured();

          expect(result).toBe(true);
        });

        it('calls Configuration.getConfig with GEMINI_API_KEY', async () => {
          MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'GEMINI_API_KEY',
          );
        });
      });

      describe('with API key missing', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockResolvedValue(null);

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });

        it('calls Configuration.getConfig with GEMINI_API_KEY', async () => {
          MockedConfiguration.getConfig.mockResolvedValue(null);

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'GEMINI_API_KEY',
          );
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

    it('handles invalid Gemini response with failure status', async () => {
      const invalidResponse = {
        candidates: [],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data for invalid response', async () => {
      const invalidResponse = {
        candidates: [],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message for invalid Gemini response', async () => {
      const invalidResponse = {
        candidates: [],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toContain('Invalid response from Gemini');
    });

    it('retries on rate limit errors immediately', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
    });

    it('returns correct data after retrying', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBe('Test AI response');
    });

    it('tracks correct number of attempts after retries', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(3);
    });

    it('calls generateContent multiple times during retries', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      await service.executePrompt(mockPrompt);

      expect(mockGeminiInstance.models.generateContent).toHaveBeenCalledTimes(
        3,
      );
    });

    it('stops retrying on authentication errors', async () => {
      const authError = new Error('Unauthorized (401)');
      mockGeminiInstance.models.generateContent.mockRejectedValue(authError);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data on authentication failure', async () => {
      const authError = new Error('Unauthorized (401)');
      mockGeminiInstance.models.generateContent.mockRejectedValue(authError);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message indicating retry failure', async () => {
      const authError = new Error('Unauthorized (401)');
      mockGeminiInstance.models.generateContent.mockRejectedValue(authError);

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toContain('failed after 5 attempts');
    });

    it('calls generateContent only once for authentication errors', async () => {
      const authError = new Error('Unauthorized (401)');
      mockGeminiInstance.models.generateContent.mockRejectedValue(authError);

      await service.executePrompt(mockPrompt);

      expect(mockGeminiInstance.models.generateContent).toHaveBeenCalledTimes(
        1,
      );
    });

    it('fails after maximum retry attempts', async () => {
      const networkError = new Error('Network timeout');
      mockGeminiInstance.models.generateContent.mockRejectedValue(networkError);

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.success).toBe(false);
    });

    it('returns null data after exceeding max retries', async () => {
      const networkError = new Error('Network timeout');
      mockGeminiInstance.models.generateContent.mockRejectedValue(networkError);

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.data).toBeNull();
    });

    it('provides error message about max retries', async () => {
      const networkError = new Error('Network timeout');
      mockGeminiInstance.models.generateContent.mockRejectedValue(networkError);

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.error).toContain('failed after 3 attempts');
    });

    it('tracks correct attempts after exceeding max retries', async () => {
      const networkError = new Error('Network timeout');
      mockGeminiInstance.models.generateContent.mockRejectedValue(networkError);

      const result = await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(result.attempts).toBe(3);
    });

    it('calls generateContent exact number of retry attempts', async () => {
      const networkError = new Error('Network timeout');
      mockGeminiInstance.models.generateContent.mockRejectedValue(networkError);

      await service.executePrompt(mockPrompt, {
        retryAttempts: 3,
      });

      expect(mockGeminiInstance.models.generateContent).toHaveBeenCalledTimes(
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
      candidates: [
        {
          content: {
            parts: [{ text: 'I am doing well, thank you!' }],
          },
        },
      ],
    };

    it('executes prompt with history successfully', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
    });

    it('returns correct data from chat with history', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.data).toBe('I am doing well, thank you!');
    });

    it('tracks attempts correctly with history', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.attempts).toBe(1);
    });

    it('formats conversation history correctly for Gemini', async () => {
      mockGeminiInstance.models.generateContent.mockResolvedValue(mockResponse);

      await service.executePromptWithHistory(mockConversation);

      expect(mockGeminiInstance.models.generateContent).toHaveBeenCalledWith({
        model: expect.any(String),
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi there!' }] },
          { role: 'user', parts: [{ text: 'How are you?' }] },
        ],
      });
    });

    it('handles missing API key gracefully with history', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(false);
    });

    it('returns null data if API key missing with history', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.data).toBeNull();
    });

    it('provides error message for missing API key with history', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.error).toBe('Gemini API key not configured');
    });

    it('retries on rate limit errors with history', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(true);
    });

    it('tracks attempts correctly after retries with history', async () => {
      const rateLimitError = new Error('Rate limit exceeded (429)');

      mockGeminiInstance.models.generateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockResponse);

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.attempts).toBe(2);
    });

    it('handles invalid response with history', async () => {
      const invalidResponse = {
        candidates: [],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.success).toBe(false);
    });

    it('provides error message for invalid response with history', async () => {
      const invalidResponse = {
        candidates: [],
      };

      mockGeminiInstance.models.generateContent.mockResolvedValue(
        invalidResponse,
      );

      const result = await service.executePromptWithHistory(mockConversation);

      expect(result.error).toContain('Invalid response from Gemini');
    });
  });

  describe('error classification', () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ provider: LLMProvider.GEMINI });
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
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ provider: LLMProvider.GEMINI });
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

    describe('when max attempts reached', () => {
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
