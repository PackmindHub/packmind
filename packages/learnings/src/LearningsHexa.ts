import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { ILearningsPort, ILearningsPortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { LearningsAdapter } from './application/adapter/LearningsAdapter';

const origin = 'LearningsHexa';

/**
 * LearningsHexa - Facade for the Learnings domain following the Hexa pattern.
 *
 * This class serves as the main entry point for learnings-related functionality.
 * It exposes use cases through the adapter and manages the lifecycle of the domain.
 *
 * Phase 1: Basic structure with no repositories or services yet.
 * These will be added in Phase 2 when we create the Topic entity and use cases.
 */
export class LearningsHexa extends BaseHexa<BaseHexaOpts, ILearningsPort> {
  private readonly adapter: LearningsAdapter;
  private isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing LearningsHexa');

    try {
      // Phase 1: No repositories or services needed yet
      // These will be added in Phase 2

      // Create adapter in constructor - dependencies will be injected in initialize()
      this.logger.debug('Creating LearningsAdapter');
      this.adapter = new LearningsAdapter(this.logger);

      this.logger.info('LearningsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LearningsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   *
   * Phase 1: No dependencies needed yet.
   * Phase 2: Will retrieve StandardsPort, RecipesPort, etc. from registry.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('LearningsHexa already initialized');
      return;
    }

    this.logger.info('Initializing LearningsHexa (adapter retrieval phase)');

    try {
      // Phase 1: No ports or services needed yet
      // Initialize adapter with empty dependencies
      await this.adapter.initialize();

      this.isInitialized = true;
      this.logger.info('LearningsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LearningsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the LearningsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying LearningsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('LearningsHexa destroyed');
  }

  /**
   * Get the Learnings adapter for cross-domain access to learnings data.
   * This adapter implements ILearningsPort and can be injected into other domains.
   */
  public getAdapter(): ILearningsPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ILearningsPortName;
  }
}
