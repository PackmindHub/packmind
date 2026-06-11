import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  HexaRegistry,
  BaseHexaOpts,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesManagementPort,
  ISpacesManagementPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { SpacesManagementAdapter } from './application/adapters/SpacesManagementAdapter';

const origin = 'SpacesManagementHexa';

/**
 * SpacesManagementHexa - Facade for the Spaces Management domain following the Port/Adapter pattern
 *
 * This class serves as the main entry point for spaces-management functionality
 * (e.g., moving artifacts between spaces).
 * It exposes the SpacesManagement adapter for cross-domain access following DDD standards.
 *
 * The Hexa pattern:
 * - Constructor: Instantiates the adapter
 * - initialize(): Retrieves and sets ports from registry
 * - getAdapter(): Exposes the domain adapter for cross-domain access
 */
export class SpacesManagementHexa extends BaseHexa<
  BaseHexaOpts,
  ISpacesManagementPort
> {
  private readonly spacesManagementAdapter: SpacesManagementAdapter;
  private spacesPort!: ISpacesPort;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SpacesManagementHexa');

    try {
      this.spacesManagementAdapter = new SpacesManagementAdapter();
      this.logger.info('SpacesManagementHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct SpacesManagementHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info(
      'Initializing SpacesManagementHexa (adapter retrieval phase)',
    );

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      this.spacesPort = spacesPort;
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
      const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      await this.spacesManagementAdapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        [IStandardsPortName]: standardsPort,
        [ISkillsPortName]: skillsPort,
        [IRecipesPortName]: recipesPort,
        eventEmitterService,
      });

      this.logger.info('SpacesManagementHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SpacesManagementHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying SpacesManagementHexa');
    this.logger.info('SpacesManagementHexa destroyed');
  }

  /**
   * Get the SpacesManagement adapter for cross-domain access
   * Following DDD monorepo architecture standard
   */
  public getAdapter(): ISpacesManagementPort {
    return this.spacesManagementAdapter.getPort();
  }

  /**
   * Get the Spaces port for accessing space data.
   * This is used by the service layer to delegate space operations.
   */
  public getSpacesPort(): ISpacesPort {
    if (!this.spacesPort) {
      throw new Error('SpacesPort not initialized. Call initialize() first.');
    }
    return this.spacesPort;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return ISpacesManagementPortName;
  }
}
