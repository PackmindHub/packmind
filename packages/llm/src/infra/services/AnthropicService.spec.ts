import { AnthropicService } from './AnthropicService';
import { AIServiceErrorTypes } from '@packmind/types';
import { LLMProvider } from '../../types/LLMServiceConfig';

// Helper for accessing private methods in tests (test-only type assertion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateAccess = (service: AnthropicService) => service as any;

// Mock Anthropic
jest.mock('@anthropic-ai/sdk');
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

import Anthropic from '@anthropic-ai/sdk';
import { Configuration } from '@packmind/node-utils';

const MockedAnthropic = jest.mocked(Anthropic);
const MockedConfiguration = jest.mocked(Configuration);

describe('AnthropicService', () => {
  let service: AnthropicService;
  let mockAnthropicInstance: {
    messages: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: jest.MockedFunction<any>;
    };
  };

  beforeEach(() => {
    // Create mock Anthropic instance
    mockAnthropicInstance = {
      messages: {
        create: jest.fn(),
      },
    };

    MockedAnthropic.mockImplementation(
      () => mockAnthropicInstance as unknown as Anthropic,
    );
    MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

    service = new AnthropicService({ provider: LLMProvider.ANTHROPIC });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executePrompt', () => {
    const mockPrompt = 'Test prompt for AI';
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: 'Test AI response',
        },
      ],
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    };

    it('executes prompt successfully and returns string result', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(true);
    });

    it('returns the AI response data', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBe('Test AI response');
    });

    it('tracks the number of attempts', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.attempts).toBe(1);
    });

    it('does not return an error on success', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toBeUndefined();
    });

    it('executes prompt successfully and returns parsed JSON object', async () => {
      const jsonResponse = {
        content: [
          {
            type: 'text' as const,
            text: '{"summary": "Test summary", "keywords": ["test", "ai"]}',
          },
        ],
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(jsonResponse);

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

    describe('when API key is missing', () => {
      it('handles missing API key gracefully with failure status', async () => {
        MockedConfiguration.getConfig.mockResolvedValue(null);

        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        MockedConfiguration.getConfig.mockResolvedValue(null);

        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBeNull();
      });

      it('provides error message', async () => {
        MockedConfiguration.getConfig.mockResolvedValue(null);

        const result = await service.executePrompt(mockPrompt);

        expect(result.error).toBe('Anthropic API key not configured');
      });

      it('sets attempts to 1', async () => {
        MockedConfiguration.getConfig.mockResolvedValue(null);

        const result = await service.executePrompt(mockPrompt);

        expect(result.attempts).toBe(1);
      });
    });

    describe('isConfigured', () => {
      describe('when API key is available', () => {
        it('returns true', async () => {
          MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

          const result = await service.isConfigured();

          expect(result).toBe(true);
        });

        it('calls Configuration.getConfig with ANTHROPIC_API_KEY', async () => {
          MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'ANTHROPIC_API_KEY',
          );
        });
      });

      describe('when API key is missing', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockResolvedValue(null);

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });

        it('calls Configuration.getConfig with ANTHROPIC_API_KEY', async () => {
          MockedConfiguration.getConfig.mockResolvedValue(null);

          await service.isConfigured();

          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'ANTHROPIC_API_KEY',
          );
        });
      });

      describe('when configuration throws an error', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockRejectedValue(
            new Error('Config error'),
          );

          const result = await service.isConfigured();

          expect(result).toBe(false);
        });
      });
    });

    it('handles invalid Anthropic response with failure status', async () => {
      const invalidResponse = {
        content: [],
        usage: { input_tokens: 0, output_tokens: 0 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(invalidResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
    });

    it('returns null data for invalid response', async () => {
      const invalidResponse = {
        content: [],
        usage: { input_tokens: 0, output_tokens: 0 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(invalidResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.data).toBeNull();
    });

    it('provides error message for invalid Anthropic response', async () => {
      const invalidResponse = {
        content: [],
        usage: { input_tokens: 0, output_tokens: 0 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(invalidResponse);

      const result = await service.executePrompt(mockPrompt);

      expect(result.error).toContain('Invalid response from Anthropic');
    });

    describe('when retrying on rate limit errors', () => {
      it('retries immediately', async () => {
        const rateLimitError = new Error('Rate limit exceeded (429)');

        mockAnthropicInstance.messages.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);

        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(true);
      });

      it('returns correct data after retrying', async () => {
        const rateLimitError = new Error('Rate limit exceeded (429)');

        mockAnthropicInstance.messages.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);

        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBe('Test AI response');
      });

      it('tracks correct number of attempts after retries', async () => {
        const rateLimitError = new Error('Rate limit exceeded (429)');

        mockAnthropicInstance.messages.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);

        const result = await service.executePrompt(mockPrompt);

        expect(result.attempts).toBe(3);
      });

      it('calls create method multiple times', async () => {
        const rateLimitError = new Error('Rate limit exceeded (429)');

        mockAnthropicInstance.messages.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);

        await service.executePrompt(mockPrompt);

        expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
      });
    });

    describe('when authentication fails', () => {
      it('stops retrying on authentication errors', async () => {
        const authError = new Error('Unauthorized (401)');
        mockAnthropicInstance.messages.create.mockRejectedValue(authError);

        const result = await service.executePrompt(mockPrompt);

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        const authError = new Error('Unauthorized (401)');
        mockAnthropicInstance.messages.create.mockRejectedValue(authError);

        const result = await service.executePrompt(mockPrompt);

        expect(result.data).toBeNull();
      });

      it('provides error message indicating retry failure', async () => {
        const authError = new Error('Unauthorized (401)');
        mockAnthropicInstance.messages.create.mockRejectedValue(authError);

        const result = await service.executePrompt(mockPrompt);

        expect(result.error).toContain('failed after 5 attempts');
      });

      it('calls create only once for authentication errors', async () => {
        const authError = new Error('Unauthorized (401)');
        mockAnthropicInstance.messages.create.mockRejectedValue(authError);

        await service.executePrompt(mockPrompt);

        expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(1);
      });
    });

    describe('when max retries exceeded', () => {
      it('fails after maximum retry attempts', async () => {
        const networkError = new Error('Network timeout');
        mockAnthropicInstance.messages.create.mockRejectedValue(networkError);

        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.success).toBe(false);
      });

      it('returns null data', async () => {
        const networkError = new Error('Network timeout');
        mockAnthropicInstance.messages.create.mockRejectedValue(networkError);

        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.data).toBeNull();
      });

      it('provides error message about max retries', async () => {
        const networkError = new Error('Network timeout');
        mockAnthropicInstance.messages.create.mockRejectedValue(networkError);

        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.error).toContain('failed after 3 attempts');
      });

      it('tracks correct attempts', async () => {
        const networkError = new Error('Network timeout');
        mockAnthropicInstance.messages.create.mockRejectedValue(networkError);

        const result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(result.attempts).toBe(3);
      });

      it('calls create exact number of retry attempts', async () => {
        const networkError = new Error('Network timeout');
        mockAnthropicInstance.messages.create.mockRejectedValue(networkError);

        await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });

        expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('error classification', () => {
    let service: AnthropicService;

    beforeEach(() => {
      service = new AnthropicService({ provider: LLMProvider.ANTHROPIC });
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
    let service: AnthropicService;

    beforeEach(() => {
      service = new AnthropicService({ provider: LLMProvider.ANTHROPIC });
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
