import { Repository } from 'typeorm';
import { OrganizationId } from '@packmind/accounts';
import {
  AbstractRepository,
  PackmindLogger,
  localDataSource,
  RenderModeConfiguration,
} from '@packmind/shared';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';
import { RenderModeConfigurationSchema } from '../schemas/RenderModeConfigurationSchema';

const origin = 'RenderModeConfigurationRepository';

export class RenderModeConfigurationRepository
  extends AbstractRepository<RenderModeConfiguration>
  implements IRenderModeConfigurationRepository
{
  constructor(
    repository: Repository<RenderModeConfiguration> = localDataSource.getRepository<RenderModeConfiguration>(
      RenderModeConfigurationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(
      'renderModeConfiguration',
      repository,
      logger,
      RenderModeConfigurationSchema,
    );
    this.logger.info('RenderModeConfigurationRepository initialized');
  }

  protected override loggableEntity(
    entity: RenderModeConfiguration,
  ): Partial<RenderModeConfiguration> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      activeRenderModes: entity.activeRenderModes,
    };
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<RenderModeConfiguration | null> {
    this.logger.info('Finding render mode configuration by organization ID', {
      organizationId,
    });

    try {
      const configuration = await this.repository.findOne({
        where: { organizationId },
      });

      if (configuration) {
        this.logger.info('Render mode configuration found by organization ID', {
          organizationId,
        });
      } else {
        this.logger.info(
          'No render mode configuration found by organization ID',
          {
            organizationId,
          },
        );
      }

      return configuration;
    } catch (error) {
      this.logger.error(
        'Failed to find render mode configuration by organization ID',
        {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async upsert(
    configuration: RenderModeConfiguration,
  ): Promise<RenderModeConfiguration> {
    this.logger.info('Upserting render mode configuration', {
      organizationId: configuration.organizationId,
      activeRenderModes: configuration.activeRenderModes,
    });

    try {
      const existing = await this.findByOrganizationId(
        configuration.organizationId,
      );

      if (existing) {
        const updatedConfiguration = await this.repository.save({
          ...existing,
          activeRenderModes: configuration.activeRenderModes,
        });

        this.logger.info('Render mode configuration updated successfully', {
          organizationId: updatedConfiguration.organizationId,
        });

        return updatedConfiguration;
      }

      const createdConfiguration = await this.add(configuration);

      this.logger.info('Render mode configuration created successfully', {
        organizationId: createdConfiguration.organizationId,
      });

      return createdConfiguration;
    } catch (error) {
      this.logger.error('Failed to upsert render mode configuration', {
        organizationId: configuration.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
