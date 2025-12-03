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
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  IRecipesPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DeploymentsAdapter } from './application/adapter/DeploymentsAdapter';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { DeploymentsRepositories } from './infra/repositories/DeploymentsRepositories';

const origin = 'DeploymentsHexa';

export type DeploymentsHexaOpts = BaseHexaOpts;

/**
 * DeploymentsHexa - Facade for the Deployments domain following the Hexa pattern.
 *
 * This class serves as the main entry point for deployment functionality.
 * It handles the deployment of recipes and standards to git repositories
 * and tracks deployment history.
 */
export class DeploymentsHexa extends BaseHexa<
  DeploymentsHexaOpts,
  IDeploymentPort
> {
  private readonly repositories: DeploymentsRepositories;
  private readonly services: DeploymentsServices;
  private readonly adapter: DeploymentsAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<DeploymentsHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing DeploymentsHexa');

    try {
      // Initialize repositories aggregator
      this.repositories = new DeploymentsRepositories(
        this.dataSource,
        this.logger,
      );

      // Initialize services (no longer depends on GitPort)
      this.services = new DeploymentsServices(this.repositories, this.logger);

      // Create adapter in constructor - ports will be set during initialize()
      this.adapter = new DeploymentsAdapter(
        this.services,
        this.repositories.getStandardsDeploymentRepository(),
        this.repositories.getRecipesDeploymentRepository(),
        this.repositories.getPackagesDeploymentRepository(),
        this.repositories.getDistributionRepository(),
        this.repositories.getDistributedPackageRepository(),
      );

      this.logger.info('DeploymentsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing DeploymentsHexa (adapter retrieval phase)');

    try {
      // Get all required ports - let errors propagate
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
      const codingAgentPort =
        registry.getAdapter<ICodingAgentPort>(ICodingAgentPortName);
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      // Initialize adapter with all ports
      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IRecipesPortName]: recipesPort,
        [ICodingAgentPortName]: codingAgentPort,
        [IStandardsPortName]: standardsPort,
        [ISpacesPortName]: spacesPort,
        [IAccountsPortName]: accountsPort,
        eventEmitterService,
      });

      this.logger.info('DeploymentsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the DeploymentsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying DeploymentsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('DeploymentsHexa destroyed');
  }

  /**
   * Get the Deployments adapter for cross-domain access to deployments data.
   * This adapter implements IDeploymentPort and can be injected into other domains.
   */
  public getAdapter(): IDeploymentPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IDeploymentPortName;
  }
}
