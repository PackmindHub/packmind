import { PackmindLogger } from '@packmind/logger';
import {
  IGetRagLabConfigurationUseCase,
  GetRagLabConfigurationCommand,
  GetRagLabConfigurationResult,
  DEFAULT_RAG_LAB_CONFIGURATION,
  createRagLabConfigurationId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IRagLabConfigurationRepository } from '../../../domain/repositories/IRagLabConfigurationRepository';

const origin = 'GetRagLabConfigurationUseCase';

/**
 * Use case for retrieving RAG Lab configuration for an organization.
 * If no configuration exists, returns default configuration.
 */
export class GetRagLabConfigurationUseCase
  implements IGetRagLabConfigurationUseCase
{
  constructor(
    private readonly ragLabConfigurationRepository: IRagLabConfigurationRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async execute(
    command: GetRagLabConfigurationCommand,
  ): Promise<GetRagLabConfigurationResult> {
    const organizationId = createOrganizationId(command.organizationId);

    this.logger.info('Getting RAG Lab configuration', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const configuration =
      await this.ragLabConfigurationRepository.findByOrganizationId(
        organizationId,
      );

    if (configuration) {
      this.logger.info('RAG Lab configuration found', {
        organizationId: command.organizationId,
        configId: configuration.id,
      });

      return { configuration };
    }

    this.logger.info(
      'No RAG Lab configuration found, returning default configuration',
      {
        organizationId: command.organizationId,
      },
    );

    // Return default configuration if none exists
    // Note: id will be generated when configuration is first saved
    return {
      configuration: {
        id: createRagLabConfigurationId(uuidv4()), // Temporary ID that won't be saved
        organizationId,
        ...DEFAULT_RAG_LAB_CONFIGURATION,
      },
    };
  }
}
