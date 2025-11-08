import { DataSource } from 'typeorm';
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
export class SpacesHexa extends BaseHexa<BaseHexaOpts, ISpacesPort> {
  private readonly hexa: SpacesHexaFactory;
  private readonly spacesAdapter: SpacesAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SpacesHexa');

    try {
      // Initialize the factory and adapter
      this.hexa = new SpacesHexaFactory(this.dataSource, this.logger);
      this.spacesAdapter = new SpacesAdapter(this.hexa);

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
    // SpacesHexa doesn't need any adapters from registry
    this.logger.info('SpacesHexa initialized successfully');
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
    return this.spacesAdapter;
  }
}
