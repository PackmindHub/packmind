import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { ICodingAgentPort, ICodingAgentPortName } from '@packmind/types';
import { CodingAgentHexaFactory } from './CodingAgentHexaFactory';

const origin = 'CodingAgentHexa';

/**
 * CodingAgentHexa - Facade for the CodingAgent domain following the Hexa pattern.
 *
 * This class serves as the main entry point for coding agent deployment functionality.
 * It handles the preparation of file updates for deploying recipes and standards
 * across multiple coding agent platforms (like Packmind, etc.).
 *
 * The Hexa pattern separates concerns:
 * - CodingAgentHexaFactory: Handles dependency injection and service instantiation
 * - CodingAgentHexa: Serves as use case facade and integration point with other domains
 *
 * The class aggregates deployment logic from multiple coding agents and provides
 * unified file updates for git operations.
 */
export class CodingAgentHexa extends BaseHexa<BaseHexaOpts, ICodingAgentPort> {
  private readonly hexa: CodingAgentHexaFactory;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing CodingAgentHexa');

    try {
      // Initialize the hexagon factory
      // Adapter retrieval will be done in initialize(registry)
      this.hexa = new CodingAgentHexaFactory(this.logger);
      this.logger.info('CodingAgentHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing CodingAgentHexa (adapter retrieval phase)');

    try {
      this.hexa.initialize(registry);
      this.logger.info('CodingAgentHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the CodingAgentHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying CodingAgentHexa');
    // Add any cleanup logic here if needed
    this.logger.info('CodingAgentHexa destroyed');
  }

  /**
   * Gets the coding agent deployer registry for direct access to deployers
   */
  public getCodingAgentDeployerRegistry() {
    return this.hexa.getDeployerRegistry();
  }

  /**
   * Get the CodingAgent adapter for cross-domain access
   * Following DDD monorepo architecture standard
   */
  public getAdapter(): ICodingAgentPort {
    return this.hexa.adapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ICodingAgentPortName;
  }
}
