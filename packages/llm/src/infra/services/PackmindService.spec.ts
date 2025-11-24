import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  AIPromptOptions,
  AIPromptResult,
  AIService,
  LLMModelPerformance,
  PromptConversation,
  PromptConversationRole,
} from '@packmind/types';
import { PackmindService } from './PackmindService';
import { LLMProvider } from '../../types/LLMServiceConfig';
import { OpenAIService } from './OpenAIService';
import { AnthropicService } from './AnthropicService';
import { GeminiService } from './GeminiService';

jest.mock('@packmind/node-utils');
jest.mock('./OpenAIService');
jest.mock('./AnthropicService');
jest.mock('./GeminiService');

describe('PackmindService', () => {
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockGetConfig: jest.MockedFunction<typeof Configuration.getConfig>;

  beforeEach(() => {
    mockLogger = stubLogger();

    mockGetConfig = Configuration.getConfig as jest.MockedFunction<
      typeof Configuration.getConfig
    >;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    describe('when PACKMIND_DEFAULT_PROVIDER is not set', () => {
      it('returns configured status', async () => {
        mockGetConfig.mockResolvedValue(undefined);

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const result = await service.isConfigured();

        expect(result).toBe(true);
      });

      it('uses OpenAI as default provider', async () => {
        mockGetConfig.mockResolvedValue(undefined);

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(OpenAIService).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
        });
      });
    });

    describe('when PACKMIND_DEFAULT_PROVIDER is set to openai', () => {
      it('uses OpenAI provider', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(OpenAIService).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
        });
      });
    });

    describe('when PACKMIND_DEFAULT_PROVIDER is set to anthropic', () => {
      it('uses Anthropic provider', async () => {
        mockGetConfig.mockResolvedValue('anthropic');

        const mockAnthropicService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          AnthropicService as jest.MockedClass<typeof AnthropicService>
        ).mockImplementation(() => mockAnthropicService as AnthropicService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(AnthropicService).toHaveBeenCalledWith({
          provider: LLMProvider.ANTHROPIC,
        });
      });
    });

    describe('when PACKMIND_DEFAULT_PROVIDER is set to gemini', () => {
      it('uses Gemini provider', async () => {
        mockGetConfig.mockResolvedValue('gemini');

        const mockGeminiService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          GeminiService as jest.MockedClass<typeof GeminiService>
        ).mockImplementation(() => mockGeminiService as GeminiService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(GeminiService).toHaveBeenCalledWith({
          provider: LLMProvider.GEMINI,
        });
      });
    });

    describe('when PACKMIND_DEFAULT_PROVIDER is set to packmind', () => {
      it('defaults to OpenAI to avoid infinite loop', async () => {
        mockGetConfig.mockResolvedValue('packmind');

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(OpenAIService).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
        });
      });
    });

    describe('when PACKMIND_DEFAULT_PROVIDER is set to invalid value', () => {
      it('defaults to OpenAI provider', async () => {
        mockGetConfig.mockResolvedValue('invalid-provider');

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(OpenAIService).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
        });
      });
    });

    describe('when Configuration.getConfig throws an error', () => {
      it('defaults to OpenAI provider', async () => {
        mockGetConfig.mockRejectedValue(new Error('Config error'));

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        await service.isConfigured();

        expect(OpenAIService).toHaveBeenCalledWith({
          provider: LLMProvider.OPENAI,
        });
      });
    });
  });

  describe('isConfigured', () => {
    describe('when underlying service is configured', () => {
      it('returns true', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const result = await service.isConfigured();

        expect(result).toBe(true);
      });
    });

    describe('when underlying service is not configured', () => {
      it('returns false', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(false),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const result = await service.isConfigured();

        expect(result).toBe(false);
      });
    });

    describe('when underlying service creation fails', () => {
      it('returns false', async () => {
        mockGetConfig.mockResolvedValue('openai');
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => {
          throw new Error('Service creation failed');
        });

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const result = await service.isConfigured();

        expect(result).toBe(false);
      });
    });
  });

  describe('executePrompt', () => {
    describe('when underlying service executes successfully', () => {
      it('delegates to underlying service', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Test response',
          attempts: 1,
          model: 'gpt-4',
          tokensUsed: { input: 10, output: 20 },
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePrompt: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const options: AIPromptOptions = {
          maxTokens: 100,
          temperature: 0.7,
        };
        const result = await service.executePrompt('test prompt', options);

        expect(result).toEqual(mockResult);
      });

      it('calls underlying service with correct arguments', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Test response',
          attempts: 1,
          model: 'gpt-4',
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePrompt: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const options: AIPromptOptions = {
          maxTokens: 100,
          temperature: 0.7,
        };
        await service.executePrompt('test prompt', options);

        expect(mockOpenAIService.executePrompt).toHaveBeenCalledWith(
          'test prompt',
          options,
        );
      });
    });

    describe('when underlying service creation fails', () => {
      it('returns error result', async () => {
        mockGetConfig.mockResolvedValue('openai');
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => {
          throw new Error('Service creation failed');
        });

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const result = await service.executePrompt('test prompt');

        expect(result.success).toBe(false);
      });
    });

    describe('with performance option', () => {
      it('passes options to underlying service', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Fast response',
          attempts: 1,
          model: 'gpt-3.5-turbo',
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePrompt: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const options: AIPromptOptions = {
          performance: LLMModelPerformance.FAST,
        };
        await service.executePrompt('test prompt', options);

        expect(mockOpenAIService.executePrompt).toHaveBeenCalledWith(
          'test prompt',
          options,
        );
      });
    });
  });

  describe('executePromptWithHistory', () => {
    describe('when underlying service executes successfully', () => {
      it('delegates to underlying service', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Response with history',
          attempts: 1,
          model: 'gpt-4',
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePromptWithHistory: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const conversationHistory: PromptConversation[] = [
          { role: PromptConversationRole.USER, message: 'Hello' },
          { role: PromptConversationRole.ASSISTANT, message: 'Hi there!' },
          { role: PromptConversationRole.USER, message: 'How are you?' },
        ];

        const result =
          await service.executePromptWithHistory(conversationHistory);

        expect(result).toEqual(mockResult);
      });

      it('calls underlying service with correct arguments', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Response with history',
          attempts: 1,
          model: 'gpt-4',
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePromptWithHistory: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const conversationHistory: PromptConversation[] = [
          { role: PromptConversationRole.USER, message: 'Hello' },
        ];

        await service.executePromptWithHistory(conversationHistory);

        expect(mockOpenAIService.executePromptWithHistory).toHaveBeenCalledWith(
          conversationHistory,
          undefined,
        );
      });
    });

    describe('when underlying service creation fails', () => {
      it('returns error result', async () => {
        mockGetConfig.mockResolvedValue('openai');
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => {
          throw new Error('Service creation failed');
        });

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const conversationHistory: PromptConversation[] = [
          { role: PromptConversationRole.USER, message: 'Test' },
        ];

        const result =
          await service.executePromptWithHistory(conversationHistory);

        expect(result.success).toBe(false);
      });
    });

    describe('with options', () => {
      it('passes options to underlying service', async () => {
        mockGetConfig.mockResolvedValue('openai');

        const mockResult: AIPromptResult<string> = {
          success: true,
          data: 'Response',
          attempts: 1,
          model: 'gpt-4',
        };

        const mockOpenAIService = {
          isConfigured: jest.fn().mockResolvedValue(true),
          executePromptWithHistory: jest.fn().mockResolvedValue(mockResult),
        } as unknown as AIService;
        (
          OpenAIService as jest.MockedClass<typeof OpenAIService>
        ).mockImplementation(() => mockOpenAIService as OpenAIService);

        const service = new PackmindService(
          { provider: LLMProvider.PACKMIND },
          mockLogger,
        );

        const conversationHistory: PromptConversation[] = [
          { role: PromptConversationRole.USER, message: 'Test' },
        ];
        const options: AIPromptOptions = {
          maxTokens: 200,
          temperature: 0.5,
        };

        await service.executePromptWithHistory(conversationHistory, options);

        expect(mockOpenAIService.executePromptWithHistory).toHaveBeenCalledWith(
          conversationHistory,
          options,
        );
      });
    });
  });

  describe('initialization is lazy', () => {
    it('does not initialize until first method call', async () => {
      mockGetConfig.mockResolvedValue('openai');

      const mockOpenAIService = {
        isConfigured: jest.fn().mockResolvedValue(true),
      } as unknown as AIService;
      (
        OpenAIService as jest.MockedClass<typeof OpenAIService>
      ).mockImplementation(() => mockOpenAIService as OpenAIService);

      new PackmindService({ provider: LLMProvider.PACKMIND }, mockLogger);

      expect(mockGetConfig).not.toHaveBeenCalled();
    });

    it('initializes only once across multiple calls', async () => {
      mockGetConfig.mockResolvedValue('openai');

      const mockOpenAIService = {
        isConfigured: jest.fn().mockResolvedValue(true),
        executePrompt: jest.fn().mockResolvedValue({
          success: true,
          data: 'test',
          attempts: 1,
          model: 'gpt-4',
        }),
      } as unknown as AIService;
      (
        OpenAIService as jest.MockedClass<typeof OpenAIService>
      ).mockImplementation(() => mockOpenAIService as OpenAIService);

      const service = new PackmindService(
        { provider: LLMProvider.PACKMIND },
        mockLogger,
      );

      await service.isConfigured();
      await service.executePrompt('test');
      await service.executePrompt('test2');

      expect(mockGetConfig).toHaveBeenCalledTimes(1);
    });
  });
});
