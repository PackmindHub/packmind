import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISaveLLMConfigurationUseCase,
  OrganizationId,
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse,
} from '@packmind/types';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';

const origin = 'SaveLLMConfigurationUseCase';

export class SaveLLMConfigurationUseCase
  extends AbstractAdminUseCase<
    SaveLLMConfigurationCommand,
    SaveLLMConfigurationResponse
  >
  implements ISaveLLMConfigurationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly configurationRepository: ILLMConfigurationRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: SaveLLMConfigurationCommand & AdminContext,
  ): Promise<SaveLLMConfigurationResponse> {
    const { organizationId, config } = command;

    this.logger.info('Saving LLM configuration', {
      organizationId,
      provider: config.provider,
    });

    await this.configurationRepository.save(
      organizationId as OrganizationId,
      config,
    );

    return {
      success: true,
      message: 'LLM configuration saved successfully',
    };
  }
}
