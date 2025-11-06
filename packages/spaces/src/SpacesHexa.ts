import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
import { ISpacesPort } from '@packmind/types';
import { SpacesHexaFactory } from './SpacesHexaFactory';
import { SpacesAdapter } from './application/adapters/SpacesAdapter';

const origin = 'SpacesHexa';

/**
 * SpacesHexa - Facade for the Spaces domain following the Port/Adapter pattern
 *
 * This class serves as the main entry point for spaces-related functionality.
 * It exposes the Spaces adapter for cross-domain access following DDD standards.
 *
 * The Hexa pattern separates concerns:
 * - SpacesHexaFactory: Handles dependency injection and service instantiation
 * - SpacesAdapter: Implements ISpacesPort for cross-domain access
 * - SpacesHexa: Serves as the main facade and integration point
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export class SpacesHexa extends BaseHexa {
  private readonly hexa: SpacesHexaFactory;
  private readonly spacesAdapter: SpacesAdapter;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);
    this.logger.info('Initializing SpacesHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the factory and adapter
      this.hexa = new SpacesHexaFactory(dataSource, this.logger);
      this.spacesAdapter = new SpacesAdapter(this.hexa);

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
  public getSpacesAdapter(): ISpacesPort {
    return this.spacesAdapter;
  }
}
