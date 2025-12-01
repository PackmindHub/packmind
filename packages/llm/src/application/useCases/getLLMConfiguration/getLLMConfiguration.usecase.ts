import { PackmindLogger } from '@packmind/logger';
import {
  DEFAULT_OPENAI_MODELS,
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse,
  IGetLLMConfigurationUseCase,
  LLMConfigurationDTO,
  LLMProvider,
  LLMServiceConfig,
  OrganizationId,
} from '@packmind/types';
import {
  IAIProviderRepository,
  StoredAIProvider,
} from '../../../domain/repositories/IAIProviderRepository';
import { isPackmindProviderAvailable } from '../utils';

const origin = 'GetLLMConfigurationUseCase';

export class GetLLMConfigurationUseCase implements IGetLLMConfigurationUseCase {
  constructor(
    private readonly configurationRepository: IAIProviderRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetLLMConfigurationCommand,
  ): Promise<GetLLMConfigurationResponse> {
    const { organizationId } = command;

    this.logger.info('Getting LLM configuration', {
      organizationId,
    });

    const storedConfig = await this.configurationRepository.get(
      organizationId as OrganizationId,
    );

    if (!storedConfig) {
      return this.handleNoStoredConfiguration();
    }

    const configDTO = this.toDTO(storedConfig);

    return {
      configuration: configDTO,
      hasConfiguration: true,
    };
  }

  private async handleNoStoredConfiguration(): Promise<GetLLMConfigurationResponse> {
    const packmindProviderAvailable = await isPackmindProviderAvailable();
    if (packmindProviderAvailable) {
      this.logger.info(
        'No configuration found, falling back to Packmind provider',
      );
      return {
        configuration: this.getPackmindFallbackConfiguration(),
        hasConfiguration: false,
      };
    }

    return {
      configuration: null,
      hasConfiguration: false,
    };
  }

  private getPackmindFallbackConfiguration(): LLMConfigurationDTO {
    return {
      provider: LLMProvider.PACKMIND,
      model: DEFAULT_OPENAI_MODELS.model,
      fastestModel: DEFAULT_OPENAI_MODELS.fastestModel,
    };
  }

  /**
   * Convert stored configuration to DTO, stripping secrets.
   */
  private toDTO(storedConfig: StoredAIProvider): LLMConfigurationDTO {
    const { config, configuredAt } = storedConfig;

    return {
      provider: config.provider,
      model: this.getModel(config),
      fastestModel: this.getFastestModel(config),
      endpoint: this.getEndpoint(config),
      apiVersion: this.getApiVersion(config),
      configuredAt,
    };
  }

  private getModel(config: LLMServiceConfig): string {
    if ('model' in config && config.model) {
      return config.model;
    }
    return '';
  }

  private getFastestModel(config: LLMServiceConfig): string {
    if ('fastestModel' in config && config.fastestModel) {
      return config.fastestModel;
    }
    return '';
  }

  private getEndpoint(config: LLMServiceConfig): string | undefined {
    if ('endpoint' in config && config.endpoint) {
      return config.endpoint;
    }
    if ('llmEndpoint' in config && config.llmEndpoint) {
      return config.llmEndpoint;
    }
    return undefined;
  }

  private getApiVersion(config: LLMServiceConfig): string | undefined {
    if ('apiVersion' in config && config.apiVersion) {
      return config.apiVersion;
    }
    return undefined;
  }
}
