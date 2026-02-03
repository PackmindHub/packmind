import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import { ISpacesPort, ISpacesPortName } from '@packmind/types';
import { SpacesAdapter } from './application/adapters/SpacesAdapter';
import { SpacesRepositories } from './infra/repositories/SpacesRepositories';
import { SpacesServices } from './application/services/SpacesServices';
import { SpaceService } from './application/services/SpaceService';
import { ISpaceRepository } from './domain/repositories/ISpaceRepository';

const origin = 'SpacesHexa';

/**
 * SpacesHexa - Facade for the Spaces domain following the Port/Adapter pattern
 *
 * This class serves as the main entry point for spaces-related functionality.
 * It exposes the Spaces adapter for cross-domain access following DDD standards.
 *
 * The Hexa pattern:
 * - Constructor: Instantiates repositories, services, and adapter
 * - initialize(): Retrieves and sets ports from registry
 * - getAdapter(): Exposes the domain adapter for cross-domain access
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export class SpacesHexa extends BaseHexa<BaseHexaOpts, ISpacesPort> {
  private readonly spacesRepositories: SpacesRepositories;
  private readonly spacesServices: SpacesServices;
  private readonly spacesAdapter: SpacesAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SpacesHexa');

    try {
      // Instantiate repositories and services
      this.spacesRepositories = new SpacesRepositories(this.dataSource);
      this.spacesServices = new SpacesServices(this.spacesRepositories);

      // Instantiate adapter
      this.spacesAdapter = new SpacesAdapter(this);

      this.logger.info('SpacesHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct SpacesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(_registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing SpacesHexa (adapter retrieval phase)');

    try {
      // SpacesAdapter has no port dependencies, initialize with empty ports
      this.spacesAdapter.initialize({});

      this.logger.info('SpacesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SpacesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying SpacesHexa');
    // Add any cleanup logic here if needed
    this.logger.info('SpacesHexa destroyed');
  }

  /**
   * Get the Spaces adapter for cross-domain access
   * Following DDD monorepo architecture standard
   */
  public getAdapter(): ISpacesPort {
    return this.spacesAdapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ISpacesPortName;
  }

  /**
   * Get the space service instance
   */
  public getSpaceService(): SpaceService {
    return this.spacesServices.getSpaceService();
  }

  /**
   * Get the space repository instance
   */
  public getSpaceRepository(): ISpaceRepository {
    return this.spacesRepositories.getSpaceRepository();
  }
}
