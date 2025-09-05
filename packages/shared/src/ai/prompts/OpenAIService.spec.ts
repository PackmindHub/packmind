import { OpenAIService } from './OpenAIService';
import { AIServiceErrorTypes } from './types';
import { PackmindLogger } from '../../logger/PackmindLogger';
import { stubLogger } from '../../../test/logger/stubLogger';

// Helper for accessing private methods in tests (test-only type assertion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateAccess = (service: OpenAIService) => service as any;

// Mock OpenAI
jest.mock('openai');
jest.mock('../../config/config/Configuration');

import OpenAI from 'openai';
import { Configuration } from '../../config/config/Configuration';

const MockedOpenAI = jest.mocked(OpenAI);
const MockedConfiguration = jest.mocked(Configuration);

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockOpenAIInstance: {
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: jest.MockedFunction<any>;
      };
    };
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = stubLogger();

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
    MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

    service = new OpenAIService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        total_tokens: 50000,
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
      expect(result.model).toBe('gpt-4o-mini');
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
        usage: { total_tokens: 30 },
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

    it('handles missing API key gracefully', async () => {
      MockedConfiguration.getConfig.mockResolvedValue(null);

      const result = await service.executePrompt(mockPrompt);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('OpenAI API key not configured');
      expect(result.attempts).toBe(1);
    });

    describe('isConfigured', () => {
      describe('when API key is available', () => {
        it('returns true', async () => {
          MockedConfiguration.getConfig.mockResolvedValue('test-api-key');

          const result = await service.isConfigured();

          expect(result).toBe(true);
          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'OPENAI_API_KEY',
          );
        });
      });

      describe(' when API key is missing', () => {
        it('returns false', async () => {
          MockedConfiguration.getConfig.mockResolvedValue(null);

          const result = await service.isConfigured();

          expect(result).toBe(false);
          expect(MockedConfiguration.getConfig).toHaveBeenCalledWith(
            'OPENAI_API_KEY',
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

    it('handles invalid OpenAI response', async () => {
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
      expect(result.error).toContain('Invalid response from OpenAI');
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

    describe('when custom options are provided', () => {
      it('uses custom options', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );

        const options = {
          maxTokens: 1000,
          temperature: 0.7,
        };

        await service.executePrompt(mockPrompt, options);

        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
          {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: mockPrompt }],
            max_tokens: 1000,
            temperature: 0.7,
          },
        );
      });
    });

    describe('when none provided', () => {
      it('uses default options', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );

        await service.executePrompt(mockPrompt);

        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
          {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: mockPrompt }],
            max_tokens: 50000,
            temperature: 0.5,
          },
        );
      });
    });
  });

  describe('error classification', () => {
    let service: OpenAIService;

    beforeEach(() => {
      service = new OpenAIService(mockLogger);
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
    let service: OpenAIService;

    beforeEach(() => {
      service = new OpenAIService(mockLogger);
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
