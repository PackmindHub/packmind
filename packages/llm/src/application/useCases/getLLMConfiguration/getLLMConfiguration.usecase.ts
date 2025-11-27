import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse,
  IAccountsPort,
  IGetLLMConfigurationUseCase,
  LLMConfigurationDTO,
  LLMServiceConfig,
  OrganizationId,
} from '@packmind/types';
import {
  ILLMConfigurationRepository,
  StoredLLMConfiguration,
} from '../../../domain/repositories/ILLMConfigurationRepository';

const origin = 'GetLLMConfigurationUseCase';

export class GetLLMConfigurationUseCase
  extends AbstractAdminUseCase<
    GetLLMConfigurationCommand,
    GetLLMConfigurationResponse
  >
  implements IGetLLMConfigurationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly configurationRepository: ILLMConfigurationRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: GetLLMConfigurationCommand & AdminContext,
  ): Promise<GetLLMConfigurationResponse> {
    const { organizationId } = command;

    this.logger.info('Getting LLM configuration', {
      organizationId,
    });

    const storedConfig = await this.configurationRepository.get(
      organizationId as OrganizationId,
    );

    if (!storedConfig) {
      return {
        configuration: null,
        hasConfiguration: false,
      };
    }

    const configDTO = this.toDTO(storedConfig);

    return {
      configuration: configDTO,
      hasConfiguration: true,
    };
  }

  /**
   * Convert stored configuration to DTO, stripping secrets.
   */
  private toDTO(storedConfig: StoredLLMConfiguration): LLMConfigurationDTO {
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
