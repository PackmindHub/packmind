import { DataSource } from 'typeorm';
import { SpacesRepositories } from './infra/repositories/SpacesRepositories';
import { SpacesServices } from './application/services/SpacesServices';
import { PackmindLogger } from '@packmind/logger';

const origin = 'SpacesHexaFactory';

/**
 * SpacesHexaFactory - Handles dependency injection for the Spaces domain
 * Separates instantiation concerns from the main hexa facade
 */
export class SpacesHexaFactory {
  private readonly spacesRepositories: SpacesRepositories;
  private readonly spacesServices: SpacesServices;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing SpacesHexaFactory');

    try {
      this.spacesRepositories = new SpacesRepositories(
        this.dataSource,
        this.logger,
      );
      this.spacesServices = new SpacesServices(
        this.spacesRepositories,
        this.logger,
      );
      this.logger.info('SpacesHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SpacesHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getSpaceService() {
    return this.spacesServices.getSpaceService();
  }

  public getSpaceRepository() {
    return this.spacesRepositories.getSpaceRepository();
  }
}
