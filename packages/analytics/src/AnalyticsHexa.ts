import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  IRecipesPort,
  IRecipesPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { RecipesUsageServices } from './application/services/RecipesUsageServices';
import { RecipeUsageUseCases } from './application/useCases';
import { RecipesUsageRepositories } from './infra/repositories/RecipesUsageRepositories';

const origin = 'AnalyticsHexa';

/**
 * AnalyticsHexa - Facade for the Analytics domain following hexagonal architecture.
 *
 * This class serves as the main entry point for analytics-related functionality.
 * It handles dependency injection and exposes use cases.
 *
 * The constructor instantiates repositories, services, and use cases.
 * The initialize method retrieves and sets ports from the registry.
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Integrates with Git, Recipes, and Deployments domains through port adapters.
 *
 * Note: Analytics does not expose a port interface (second type parameter is void).
 */
export type AnalyticsHexaOpts = BaseHexaOpts;

const baseAnalyticsHexaOpts = { logger: new PackmindLogger(origin) };

export class AnalyticsHexa extends BaseHexa<AnalyticsHexaOpts, void> {
  private readonly recipesUsageRepositories: RecipesUsageRepositories;
  private readonly recipesUsageServices: RecipesUsageServices;
  public readonly useCases: RecipeUsageUseCases;

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

      // Instantiate services (without ports - they'll be set in initialize())
      this.recipesUsageServices = new RecipesUsageServices(
        this.recipesUsageRepositories,
        undefined, // recipesPort will be set in initialize()
        this.logger,
      );

      // Instantiate use cases (without ports - they'll be set in initialize())
      this.useCases = new RecipeUsageUseCases(
        this.recipesUsageServices,
        undefined, // recipesPort will be set in initialize()
        undefined as unknown as IGitPort, // gitPort will be set in initialize() - use unknown cast for required param
        undefined, // deploymentPort (optional) will be set in initialize()
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

      // Set ports on services and use cases
      this.useCases.setGitPort(gitPort);

      if (recipesPort) {
        this.useCases.setRecipesPort(recipesPort);
      }

      if (deploymentPort) {
        this.useCases.setDeploymentPort(deploymentPort);
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
   * AnalyticsHexa does not expose an adapter.
   * Analytics functionality is accessed through the NestJS module.
   */
  public getAdapter(): void {
    throw new Error('AnalyticsHexa does not expose an adapter');
  }

  /**
   * AnalyticsHexa does not expose a port.
   */
  public getPortName(): string {
    throw new Error('AnalyticsHexa does not expose a port');
  }
}
