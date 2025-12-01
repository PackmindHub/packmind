import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ILlmPort,
  ILlmPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { LlmAdapter } from './application/adapter/LlmAdapter';

const origin = 'LlmHexa';

/**
 * LlmHexa - Hexagonal architecture facade for the LLM domain.
 *
 * This class serves as the main entry point for LLM-related functionality.
 * It manages dependency injection, service instantiation, and exposes the adapter.
 *
 * Currently provides OpenAIService as the default LLM provider.
 * Future: Will support organization-specific LLM configurations stored in the database.
 */
export class LlmHexa extends BaseHexa<BaseHexaOpts, ILlmPort> {
  private readonly adapter: LlmAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing LlmHexa');

    try {
      this.logger.debug('Creating LlmAdapter');
      this.adapter = new LlmAdapter(this.dataSource, this.logger);

      this.logger.info('LlmHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LlmHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('LlmHexa already initialized');
      return;
    }

    this.logger.info('Initializing LlmHexa (adapter retrieval phase)');

    try {
      // Get required ports from registry
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);

      this.logger.info('Required ports retrieved from registry');

      // Initialize adapter with ports
      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
      });

      this.isInitialized = true;
      this.logger.info('LlmHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LlmHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the LLM adapter for cross-domain access to LLM services.
   * This adapter implements ILlmPort and can be injected into other domains.
   * The adapter is available immediately after construction.
   */
  public getAdapter(): ILlmPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ILlmPortName;
  }

  /**
   * Destroys the LlmHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying LlmHexa');
    // Add any cleanup logic here if needed
    this.logger.info('LlmHexa destroyed');
  }
}
