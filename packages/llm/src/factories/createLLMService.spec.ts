import { createLLMService } from './createLLMService';
import { OpenAIService } from '../infra/services/OpenAIService';
import { AnthropicService } from '../infra/services/AnthropicService';
import { GeminiService } from '../infra/services/GeminiService';
import { OpenAIAPICompatibleService } from '../infra/services/OpenAIAPICompatibleService';
import { AzureOpenAIService } from '../infra/services/AzureOpenAIService';
import { PackmindService } from '../infra/services/PackmindService';
import { LLMProvider } from '@packmind/types';
import { LLMServiceConfig } from '../types/LLMServiceConfig';

describe('createLLMService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when provider is openai', () => {
    it('creates OpenAIService instance', () => {
      const service = createLLMService({
        provider: LLMProvider.OPENAI,
        apiKey: 'test-api-key',
      });

      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('creates OpenAIService with custom models', () => {
      const service = createLLMService({
        provider: LLMProvider.OPENAI,
        apiKey: 'test-api-key',
        model: 'gpt-4o',
        fastestModel: 'gpt-4o-mini',
      });

      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('when provider is anthropic', () => {
    it('creates AnthropicService instance', () => {
      const service = createLLMService({
        provider: LLMProvider.ANTHROPIC,
        apiKey: 'test-api-key',
      });

      expect(service).toBeInstanceOf(AnthropicService);
    });

    it('creates AnthropicService with custom models', () => {
      const service = createLLMService({
        provider: LLMProvider.ANTHROPIC,
        apiKey: 'test-api-key',
        model: 'claude-opus-4',
        fastestModel: 'claude-haiku-4',
      });

      expect(service).toBeInstanceOf(AnthropicService);
    });
  });

  describe('when provider is gemini', () => {
    it('creates GeminiService instance', () => {
      const service = createLLMService({
        provider: LLMProvider.GEMINI,
        apiKey: 'test-api-key',
      });

      expect(service).toBeInstanceOf(GeminiService);
    });

    it('creates GeminiService with custom models', () => {
      const service = createLLMService({
        provider: LLMProvider.GEMINI,
        apiKey: 'test-api-key',
        model: 'gemini-2.0-flash',
        fastestModel: 'gemini-1.5-flash',
      });

      expect(service).toBeInstanceOf(GeminiService);
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

  describe('when provider is azure-openai', () => {
    it('creates AzureOpenAIService instance', () => {
      const service = createLLMService({
        provider: LLMProvider.AZURE_OPENAI,
        model: 'gpt-4-deployment',
        fastestModel: 'gpt-35-turbo-deployment',
      });

      expect(service).toBeInstanceOf(AzureOpenAIService);
    });

    it('creates AzureOpenAIService with explicit endpoint and API key', () => {
      const service = createLLMService({
        provider: LLMProvider.AZURE_OPENAI,
        model: 'gpt-4-deployment',
        fastestModel: 'gpt-35-turbo-deployment',
        endpoint: 'https://my-resource.openai.azure.com',
        apiKey: 'my-api-key',
      });

      expect(service).toBeInstanceOf(AzureOpenAIService);
    });
  });

  describe('when provider is packmind', () => {
    it('creates PackmindService instance', () => {
      const service = createLLMService({ provider: LLMProvider.PACKMIND });

      expect(service).toBeInstanceOf(PackmindService);
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
