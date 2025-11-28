import { createOrganizationId, LLMProvider } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';
import { GetAiServiceForOrganizationUseCase } from './getAiServiceForOrganization.usecase';
import { PackmindService } from '../../../infra/services/PackmindService';
import { OpenAIService } from '../../../infra/services/OpenAIService';
import { AnthropicService } from '../../../infra/services/AnthropicService';
import * as utils from '../utils';

jest.mock('../utils');

describe('GetAiServiceForOrganizationUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());

  let useCase: GetAiServiceForOrganizationUseCase;
  let mockConfigurationRepository: jest.Mocked<ILLMConfigurationRepository>;

  beforeEach(() => {
    mockConfigurationRepository = {
      save: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };

    useCase = new GetAiServiceForOrganizationUseCase(
      mockConfigurationRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when in proprietary mode (Packmind available)', () => {
      beforeEach(() => {
        jest
          .spyOn(utils, 'isPackmindProviderAvailable')
          .mockResolvedValue(true);
      });

      describe('when organization has no configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue(null);
        });

        it('returns a PackmindService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(PackmindService);
        });

        it('queries the repository with the organization ID', async () => {
          await useCase.execute({ organizationId });

          expect(mockConfigurationRepository.get).toHaveBeenCalledWith(
            organizationId,
          );
        });
      });

      describe('when organization has OpenAI configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.OPENAI,
              apiKey: 'sk-test-key',
              model: 'gpt-4',
              fastestModel: 'gpt-4-mini',
            },
            configuredAt: new Date(),
          });
        });

        it('returns an OpenAIService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(OpenAIService);
        });
      });

      describe('when organization has Anthropic configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.ANTHROPIC,
              apiKey: 'anthropic-test-key',
              model: 'claude-3-opus-20240229',
              fastestModel: 'claude-3-haiku-20240307',
            },
            configuredAt: new Date(),
          });
        });

        it('returns an AnthropicService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(AnthropicService);
        });
      });

      describe('when organization has Packmind configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.PACKMIND,
            },
            configuredAt: new Date(),
          });
        });

        it('returns a PackmindService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(PackmindService);
        });
      });

      it('returns a new instance on each call', async () => {
        mockConfigurationRepository.get.mockResolvedValue(null);

        const result1 = await useCase.execute({ organizationId });
        const result2 = await useCase.execute({ organizationId });

        expect(result1.aiService).not.toBe(result2.aiService);
      });
    });

    describe('when in OSS mode (Packmind not available)', () => {
      beforeEach(() => {
        jest
          .spyOn(utils, 'isPackmindProviderAvailable')
          .mockResolvedValue(false);
      });

      describe('when organization has no configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue(null);
        });

        it('returns undefined aiService', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeUndefined();
        });
      });

      describe('when organization has Packmind configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.PACKMIND,
            },
            configuredAt: new Date(),
          });
        });

        it('returns undefined aiService', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeUndefined();
        });
      });

      describe('when organization has OpenAI configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.OPENAI,
              apiKey: 'sk-test-key',
              model: 'gpt-4',
              fastestModel: 'gpt-4-mini',
            },
            configuredAt: new Date(),
          });
        });

        it('returns an OpenAIService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(OpenAIService);
        });
      });

      describe('when organization has Anthropic configuration', () => {
        beforeEach(() => {
          mockConfigurationRepository.get.mockResolvedValue({
            config: {
              provider: LLMProvider.ANTHROPIC,
              apiKey: 'anthropic-test-key',
              model: 'claude-3-opus-20240229',
              fastestModel: 'claude-3-haiku-20240307',
            },
            configuredAt: new Date(),
          });
        });

        it('returns an AnthropicService instance', async () => {
          const result = await useCase.execute({ organizationId });

          expect(result.aiService).toBeInstanceOf(AnthropicService);
        });
      });
    });
  });
});
