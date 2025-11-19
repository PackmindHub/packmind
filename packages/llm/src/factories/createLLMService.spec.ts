import { createLLMService } from './createLLMService';
import { OpenAIService } from '../infra/services/OpenAIService';
import { AnthropicService } from '../infra/services/AnthropicService';
import { OpenAIAPICompatibleService } from '../infra/services/OpenAIAPICompatibleService';
import { LLMProvider, LLMServiceConfig } from '../types/LLMServiceConfig';

describe('createLLMService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when provider is openai', () => {
    it('creates OpenAIService instance', () => {
      const service = createLLMService({ provider: LLMProvider.OPENAI });

      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('creates OpenAIService with custom models', () => {
      const service = createLLMService({
        provider: LLMProvider.OPENAI,
        model: 'gpt-4o',
        fastestModel: 'gpt-4o-mini',
      });

      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('when provider is anthropic', () => {
    it('creates AnthropicService instance', () => {
      const service = createLLMService({ provider: LLMProvider.ANTHROPIC });

      expect(service).toBeInstanceOf(AnthropicService);
    });

    it('creates AnthropicService with custom models', () => {
      const service = createLLMService({
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-opus-4',
        fastestModel: 'claude-haiku-4',
      });

      expect(service).toBeInstanceOf(AnthropicService);
    });
  });

  describe('when provider is openai-compatible', () => {
    it('creates OpenAIAPICompatibleService instance', () => {
      const service = createLLMService({
        provider: LLMProvider.OPENAI_COMPATIBLE,
        llmEndpoint: 'https://api.example.com/v1',
        llmApiKey: 'test-key',
        model: 'test-model',
        fastestModel: 'test-model-fast',
      });

      expect(service).toBeInstanceOf(OpenAIAPICompatibleService);
    });
  });

  describe('when provider is unknown', () => {
    it('throws an error', () => {
      expect(() =>
        createLLMService({
          provider: 'unknown',
        } as unknown as LLMServiceConfig),
      ).toThrow('Unknown provider: unknown');
    });
  });
});
