import { PackmindLogger } from '@packmind/logger';
import {
  IUpdateRagLabConfigurationUseCase,
  UpdateRagLabConfigurationCommand,
  RagLabConfiguration,
  createRagLabConfigurationId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IRagLabConfigurationRepository } from '../../../domain/repositories/IRagLabConfigurationRepository';

const origin = 'UpdateRagLabConfigurationUseCase';

/**
 * Use case for updating RAG Lab configuration for an organization.
 * Creates a new configuration if none exists for the organization.
 */
export class UpdateRagLabConfigurationUseCase
  implements IUpdateRagLabConfigurationUseCase
{
  constructor(
    private readonly ragLabConfigurationRepository: IRagLabConfigurationRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async execute(
    command: UpdateRagLabConfigurationCommand,
  ): Promise<RagLabConfiguration> {
    const organizationId = createOrganizationId(command.organizationId);

    this.logger.info('Updating RAG Lab configuration', {
      organizationId: command.organizationId,
      userId: command.userId,
      embeddingModel: command.embeddingModel,
      embeddingDimensions: command.embeddingDimensions,
    });

    // Check if configuration exists
    const existing =
      await this.ragLabConfigurationRepository.findByOrganizationId(
        organizationId,
      );

    let configuration: RagLabConfiguration;

    if (existing) {
      // Update existing configuration
      configuration = {
        ...existing,
        embeddingModel: command.embeddingModel,
        embeddingDimensions: command.embeddingDimensions,
        includeCodeBlocks: command.includeCodeBlocks,
        maxTextLength: command.maxTextLength,
      };

      this.logger.info('RAG Lab configuration updated', {
        organizationId: command.organizationId,
        configId: configuration.id,
      });
    } else {
      // Create new configuration
      configuration = {
        id: createRagLabConfigurationId(uuidv4()),
        organizationId,
        embeddingModel: command.embeddingModel,
        embeddingDimensions: command.embeddingDimensions,
        includeCodeBlocks: command.includeCodeBlocks,
        maxTextLength: command.maxTextLength,
      };

      this.logger.info('RAG Lab configuration created', {
        organizationId: command.organizationId,
        configId: configuration.id,
      });
    }

    // Save configuration (handles both insert and update)
    await this.ragLabConfigurationRepository.add(configuration);

    return configuration;
  }
}
