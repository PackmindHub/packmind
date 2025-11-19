import { IRagLabConfigurationRepository } from '../../domain/repositories/IRagLabConfigurationRepository';
import { RagLabConfigurationSchema } from '../schemas/RagLabConfigurationSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { RagLabConfiguration, OrganizationId } from '@packmind/types';

const origin = 'RagLabConfigurationRepository';

export class RagLabConfigurationRepository
  extends AbstractRepository<RagLabConfiguration>
  implements IRagLabConfigurationRepository
{
  constructor(
    repository: Repository<RagLabConfiguration> = localDataSource.getRepository<RagLabConfiguration>(
      RagLabConfigurationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('ragLabConfiguration', repository, logger, RagLabConfigurationSchema);
    this.logger.info('RagLabConfigurationRepository initialized');
  }

  protected override loggableEntity(
    entity: RagLabConfiguration,
  ): Partial<RagLabConfiguration> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      embeddingModel: entity.embeddingModel,
      embeddingDimensions: entity.embeddingDimensions,
    };
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RagLabConfiguration | null> {
    this.logger.info('Finding RAG Lab configuration by organization ID', {
      organizationId,
    });

    try {
      const configuration = await this.repository
        .createQueryBuilder('ragLabConfiguration')
        .where('ragLabConfiguration.organization_id = :organizationId', {
          organizationId,
        })
        .getOne();

      if (configuration) {
        this.logger.info('RAG Lab configuration found', {
          organizationId,
          configId: configuration.id,
        });
      } else {
        this.logger.info('No RAG Lab configuration found for organization', {
          organizationId,
        });
      }

      return configuration;
    } catch (error) {
      this.logger.error(
        'Failed to find RAG Lab configuration by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
