import { createOrganizationId, LLMProvider } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';
import { GetLLMConfigurationUseCase } from './getLLMConfiguration.usecase';
import * as utils from '../utils';

jest.mock('../utils');

describe('GetLLMConfigurationUseCase', () => {
  const organizationId = createOrganizationId('org-123');

  let useCase: GetLLMConfigurationUseCase;
  let mockConfigurationRepository: jest.Mocked<ILLMConfigurationRepository>;
  let mockIsPackmindProviderAvailable: jest.MockedFunction<
    typeof utils.isPackmindProviderAvailable
  >;

  beforeEach(() => {
    mockConfigurationRepository = {
      save: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };

    mockIsPackmindProviderAvailable =
      utils.isPackmindProviderAvailable as jest.MockedFunction<
        typeof utils.isPackmindProviderAvailable
      >;
    mockIsPackmindProviderAvailable.mockResolvedValue(false);

    useCase = new GetLLMConfigurationUseCase(
      mockConfigurationRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when configuration exists', () => {
    const configuredAt = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      mockConfigurationRepository.get.mockResolvedValue({
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: 'sk-secret-api-key-12345',
          model: 'gpt-4',
          fastestModel: 'gpt-4-mini',
        },
        configuredAt,
      });
    });

    it('returns hasConfiguration as true', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.hasConfiguration).toBe(true);
    });

    it('returns configuration provider', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.provider).toBe(LLMProvider.OPENAI);
    });

    it('returns configuration model', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.model).toBe('gpt-4');
    });

    it('returns configuration fastestModel', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.fastestModel).toBe('gpt-4-mini');
    });

    it('returns configuration configuredAt', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.configuredAt).toEqual(configuredAt);
    });

    it('does not include apiKey in response', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration).not.toHaveProperty('apiKey');
    });
  });

  describe('when Azure OpenAI configuration exists', () => {
    const configuredAt = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      mockConfigurationRepository.get.mockResolvedValue({
        config: {
          provider: LLMProvider.AZURE_OPENAI,
          endpoint: 'https://my-azure.openai.azure.com',
          apiKey: 'azure-secret-key',
          apiVersion: '2024-02-15-preview',
          model: 'gpt-4-deployment',
          fastestModel: 'gpt-35-turbo-deployment',
        },
        configuredAt,
      });
    });

    it('returns endpoint in DTO', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.endpoint).toBe(
        'https://my-azure.openai.azure.com',
      );
    });

    it('returns apiVersion in DTO', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.apiVersion).toBe('2024-02-15-preview');
    });

    it('does not include apiKey in response', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration).not.toHaveProperty('apiKey');
    });
  });

  describe('when OpenAI-compatible configuration exists', () => {
    const configuredAt = new Date('2024-01-15T10:00:00Z');

    beforeEach(() => {
      mockConfigurationRepository.get.mockResolvedValue({
        config: {
          provider: LLMProvider.OPENAI_COMPATIBLE,
          llmEndpoint: 'https://custom-llm.example.com',
          llmApiKey: 'custom-secret-key',
          model: 'custom-model',
          fastestModel: 'custom-fast-model',
        },
        configuredAt,
      });
    });

    it('returns llmEndpoint as endpoint in DTO', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration?.endpoint).toBe(
        'https://custom-llm.example.com',
      );
    });

    it('does not include llmApiKey in response', async () => {
      const result = await useCase.execute({ organizationId });

      expect(result.configuration).not.toHaveProperty('llmApiKey');
    });
  });

  describe('when no configuration exists', () => {
    beforeEach(() => {
      mockConfigurationRepository.get.mockResolvedValue(null);
    });

    describe('when Packmind provider is available', () => {
      beforeEach(() => {
        mockIsPackmindProviderAvailable.mockResolvedValue(true);
      });

      it('returns hasConfiguration as false', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.hasConfiguration).toBe(false);
      });

      it('returns Packmind fallback configuration', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.configuration?.provider).toBe(LLMProvider.PACKMIND);
      });

      it('returns default model in fallback configuration', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.configuration?.model).toBe('gpt-5.1');
      });

      it('returns default fastestModel in fallback configuration', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.configuration?.fastestModel).toBe('gpt-4.1-mini');
      });

      it('does not include configuredAt in fallback configuration', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.configuration?.configuredAt).toBeUndefined();
      });
    });

    describe('when Packmind provider is not available', () => {
      beforeEach(() => {
        mockIsPackmindProviderAvailable.mockResolvedValue(false);
      });

      it('returns hasConfiguration as false', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.hasConfiguration).toBe(false);
      });

      it('returns null configuration', async () => {
        const result = await useCase.execute({ organizationId });

        expect(result.configuration).toBeNull();
      });
    });
  });
});
