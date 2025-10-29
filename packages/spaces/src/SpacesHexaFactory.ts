import { DataSource } from 'typeorm';
import { SpaceRepository } from './infra/repositories/SpaceRepository';
import { SpaceService } from './application/services/SpaceService';
import { PackmindLogger } from '@packmind/shared';
import { SpaceSchema } from './infra/schemas/SpaceSchema';

const origin = 'SpacesHexaFactory';

/**
 * SpacesHexaFactory - Handles dependency injection for the Spaces domain
 * Separates instantiation concerns from the main hexa facade
 */
export class SpacesHexaFactory {
  private readonly spaceRepository: SpaceRepository;
  private readonly spaceService: SpaceService;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing SpacesHexaFactory');

    try {
      this.spaceRepository = new SpaceRepository(
        this.dataSource.getRepository(SpaceSchema),
        this.logger,
      );
      this.spaceService = new SpaceService(this.spaceRepository, this.logger);
      this.logger.info('SpacesHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SpacesHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getSpaceService(): SpaceService {
    return this.spaceService;
  }

  public getSpaceRepository(): SpaceRepository {
    return this.spaceRepository;
  }
}
