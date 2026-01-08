import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { SkillsAdapter } from './application/adapter/SkillsAdapter';
import { SkillsServices } from './application/services/SkillsServices';
import { SkillsRepositories } from './infra/repositories/SkillsRepositories';

const origin = 'SkillsHexa';

/**
 * SkillsHexa - Facade for the Skills domain following the Hexa pattern.
 *
 * This class serves as the main entry point for skills-related functionality.
 * It manages dependency injection, service instantiation, and exposes the adapter.
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export class SkillsHexa extends BaseHexa<BaseHexaOpts, SkillsAdapter> {
  public readonly skillsRepositories: SkillsRepositories;
  public readonly skillsServices: SkillsServices;
  private readonly adapter: SkillsAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SkillsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      // Instantiate repositories
      this.skillsRepositories = new SkillsRepositories(this.dataSource);

      // Instantiate services
      this.skillsServices = new SkillsServices(
        this.skillsRepositories,
        this.logger,
      );

      // Create adapter in constructor - dependencies will be injected in initialize()
      this.logger.debug('Creating SkillsAdapter');
      this.adapter = new SkillsAdapter(
        this.skillsServices,
        this.skillsRepositories,
        this.logger,
      );

      this.logger.info('SkillsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct SkillsHexa', {
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
      this.logger.debug('SkillsHexa already initialized');
      return;
    }

    this.logger.info('Initializing SkillsHexa (adapter retrieval phase)');

    try {
      // Get all required ports (let errors propagate if missing)
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

      this.logger.info('All required ports retrieved from registry');

      // Get PackmindEventEmitterService (required) - for domain event emission
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      if (!eventEmitterService) {
        throw new Error('PackmindEventEmitterService not found in registry');
      }

      // Initialize adapter with all ports and services
      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        eventEmitterService,
      });

      this.isInitialized = true;
      this.logger.info('SkillsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SkillsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the Skills adapter for cross-domain access to skills data.
   * This adapter implements ISkillsPort and can be injected into other domains.
   * The adapter is available immediately after construction.
   */
  public getAdapter(): SkillsAdapter {
    return this.adapter.getPort() as SkillsAdapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ISkillsPortName;
  }

  /**
   * Destroys the SkillsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying SkillsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('SkillsHexa destroyed');
  }
}
