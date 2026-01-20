import { OpenAIService } from './OpenAIService';
import { AIServiceErrorTypes, LLMProvider } from '@packmind/types';

// Helper for accessing private methods in tests (test-only type assertion)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPrivateAccess = (service: OpenAIService) => service as any;

// Mock OpenAI
jest.mock('openai');

import OpenAI from 'openai';

const MockedOpenAI = jest.mocked(OpenAI);

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockOpenAIInstance: {
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: jest.MockedFunction<any>;
      };
    };
  };

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

    service = new OpenAIService({
      provider: LLMProvider.OPENAI,
      apiKey: 'test-api-key',
    });
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

    describe('when executing prompt successfully with string result', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          mockResponse,
        );
        result = await service.executePrompt(mockPrompt);
      });

      it('returns success true', () => {
        expect(result.success).toBe(true);
      });

      it('returns the AI response as data', () => {
        expect(result.data).toBe('Test AI response');
      });

      it('records one attempt', () => {
        expect(result.attempts).toBe(1);
      });

      it('does not return an error', () => {
        expect(result.error).toBeUndefined();
      });
    });

    describe('when executing prompt successfully with JSON response', () => {
      interface TestResponse {
        summary: string;
        keywords: string[];
      }

      let result: {
        success: boolean;
        data: TestResponse | null;
        attempts: number;
      };

      beforeEach(async () => {
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

        result = await service.executePrompt<TestResponse>(mockPrompt);
      });

      it('returns success true', () => {
        expect(result.success).toBe(true);
      });

      it('returns parsed JSON object as data', () => {
        expect(result.data).toEqual({
          summary: 'Test summary',
          keywords: ['test', 'ai'],
        });
      });

      it('records one attempt', () => {
        expect(result.attempts).toBe(1);
      });
    });

    describe('when API key is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        const serviceWithoutKey = new OpenAIService({
          provider: LLMProvider.OPENAI,
          apiKey: '',
        });
        result = await serviceWithoutKey.executePrompt(mockPrompt);
      });

      it('returns success false', () => {
        expect(result.success).toBe(false);
      });

      it('returns null data', () => {
        expect(result.data).toBeNull();
      });

      it('returns configuration error message', () => {
        expect(result.error).toBe('OpenAIService not configured');
      });

      it('records one attempt', () => {
        expect(result.attempts).toBe(1);
      });
    });

    describe('isConfigured', () => {
      describe('when API key is available', () => {
        it('returns true', async () => {
          const result = await service.isConfigured();

          expect(result).toBe(true);
        });
      });

      describe('when API key is missing', () => {
        it('returns false', async () => {
          const serviceWithoutKey = new OpenAIService({
            provider: LLMProvider.OPENAI,
            apiKey: '',
          });

          const result = await serviceWithoutKey.isConfigured();

          expect(result).toBe(false);
        });
      });
    });

    describe('when OpenAI returns invalid response', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        const invalidResponse = {
          choices: [],
          usage: { total_tokens: 0 },
        };

        mockOpenAIInstance.chat.completions.create.mockResolvedValue(
          invalidResponse,
        );

        result = await service.executePrompt(mockPrompt);
      });

      it('returns success false', () => {
        expect(result.success).toBe(false);
      });

      it('returns null data', () => {
        expect(result.data).toBeNull();
      });

      it('returns invalid response error message', () => {
        expect(result.error).toContain('Invalid response from OpenAI');
      });
    });

    describe('when rate limit error occurs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        const rateLimitError = new Error('Rate limit exceeded (429)');

        mockOpenAIInstance.chat.completions.create
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValue(mockResponse);

        result = await service.executePrompt(mockPrompt);
      });

      it('returns success true after retries', () => {
        expect(result.success).toBe(true);
      });

      it('returns the AI response as data', () => {
        expect(result.data).toBe('Test AI response');
      });

      it('records three attempts', () => {
        expect(result.attempts).toBe(3);
      });

      it('calls OpenAI API three times', () => {
        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(3);
      });
    });

    describe('when authentication error occurs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        const authError = new Error('Unauthorized (401)');
        mockOpenAIInstance.chat.completions.create.mockRejectedValue(authError);

        result = await service.executePrompt(mockPrompt);
      });

      it('returns success false', () => {
        expect(result.success).toBe(false);
      });

      it('returns null data', () => {
        expect(result.data).toBeNull();
      });

      it('returns the authorization error message', () => {
        expect(result.error).toBe('Unauthorized (401)');
      });

      it('calls OpenAI API only once without retrying', () => {
        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(1);
      });
    });

    describe('when maximum retry attempts are exhausted', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      beforeEach(async () => {
        const networkError = new Error('Network timeout');
        mockOpenAIInstance.chat.completions.create.mockRejectedValue(
          networkError,
        );

        result = await service.executePrompt(mockPrompt, {
          retryAttempts: 3,
        });
      });

      it('returns success false', () => {
        expect(result.success).toBe(false);
      });

      it('returns null data', () => {
        expect(result.data).toBeNull();
      });

      it('returns the network error message', () => {
        expect(result.error).toBe('Network timeout');
      });

      it('records all retry attempts', () => {
        expect(result.attempts).toBe(3);
      });

      it('calls OpenAI API for each retry attempt', () => {
        expect(
          mockOpenAIInstance.chat.completions.create,
        ).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('error classification', () => {
    let service: OpenAIService;

    beforeEach(() => {
      service = new OpenAIService({
        provider: LLMProvider.OPENAI,
        apiKey: 'test-api-key',
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
    let service: OpenAIService;

    beforeEach(() => {
      service = new OpenAIService({
        provider: LLMProvider.OPENAI,
        apiKey: 'test-api-key',
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
