import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAnalyticsPort,
  IAnalyticsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  IRecipesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { AnalyticsAdapter } from './application/adapter/AnalyticsAdapter';
import { RecipesUsageServices } from './application/services/RecipesUsageServices';
import { RecipesUsageRepositories } from './infra/repositories/RecipesUsageRepositories';

const origin = 'AnalyticsHexa';

/**
 * AnalyticsHexa - Facade for the Analytics domain following hexagonal architecture.
 *
 * This class serves as the main entry point for analytics-related functionality.
 * It handles dependency injection and exposes the adapter through a port interface.
 *
 * The constructor instantiates repositories, services, and the adapter.
 * The initialize method retrieves and sets ports from the registry.
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Integrates with Git, Recipes, and Deployments domains through port adapters.
 *
 * Exposes IAnalyticsPort for cross-domain integration.
 */
export type AnalyticsHexaOpts = BaseHexaOpts;

const baseAnalyticsHexaOpts = { logger: new PackmindLogger(origin) };

export class AnalyticsHexa extends BaseHexa<AnalyticsHexaOpts, IAnalyticsPort> {
  private readonly recipesUsageRepositories: RecipesUsageRepositories;
  private readonly recipesUsageServices: RecipesUsageServices;
  private readonly adapter: AnalyticsAdapter;

  constructor(dataSource: DataSource, opts?: Partial<AnalyticsHexaOpts>) {
    super(dataSource, { ...baseAnalyticsHexaOpts, ...opts });
    this.logger.info('Constructing AnalyticsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      // Instantiate repositories
      this.recipesUsageRepositories = new RecipesUsageRepositories(
        this.dataSource,
      );

      // Instantiate services (ports will be set in initialize())
      this.recipesUsageServices = new RecipesUsageServices(
        this.recipesUsageRepositories,
        this.logger,
      );

      // Instantiate adapter (ports will be set in initialize())
      this.adapter = new AnalyticsAdapter(
        this.recipesUsageServices,
        this.logger,
      );

      this.logger.debug(
        'Repository aggregator, service aggregator, and use cases created successfully',
      );

      this.logger.info('AnalyticsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct AnalyticsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing AnalyticsHexa (adapter retrieval phase)');

    try {
      // Retrieve required ports from registry
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      this.logger.debug('Retrieved GitAdapter from registry');

      // Retrieve optional ports from registry
      let recipesPort: IRecipesPort | undefined;
      try {
        recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
        this.logger.debug('Retrieved RecipesAdapter from registry');
      } catch (error) {
        this.logger.debug('RecipesHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let deploymentPort: IDeploymentPort | undefined;
      try {
        deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.logger.debug('Retrieved DeploymentAdapter from registry');
      } catch (error) {
        this.logger.debug('DeploymentsHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Set ports on adapter
      this.adapter.setGitPort(gitPort);

      if (recipesPort) {
        this.adapter.setRecipesPort(recipesPort);
      }

      if (deploymentPort) {
        this.adapter.setDeploymentPort(deploymentPort);
      }

      this.logger.info('AnalyticsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AnalyticsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying AnalyticsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('AnalyticsHexa destroyed');
  }

  /**
   * Returns the AnalyticsAdapter for cross-domain integration.
   */
  public getAdapter(): IAnalyticsPort {
    return this.adapter;
  }

  /**
   * Returns the port name for registry registration.
   */
  public getPortName(): string {
    return IAnalyticsPortName;
  }
}
