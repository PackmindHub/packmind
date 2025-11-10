import { OrganizationId } from '@packmind/accounts';
import { GitHexa, GitRepoId } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { RecipeId, RecipesHexa } from '@packmind/recipes';
import {
  IDeploymentPort,
  IGitPort,
  IRecipesPort,
  TargetId,
} from '@packmind/types';
import { AnalyticsHexaFactory } from './AnalyticsHexaFactory';
import { RecipeUsage } from './domain/entities/RecipeUsage';
import { TimePeriod } from './domain/entities/RecipeUsageAnalytics';
import { TrackRecipeUsageCommand } from './domain/useCases/ITrackRecipeUsage';

const origin = 'AnalyticsHexa';

/**
 * AnalyticsHexa - Facade for the Analytics domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for analytics-related functionality.
 * It holds the AnalyticsHexaFactory instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - AnalyticsHexaFactory: Handles dependency injection and service instantiation
 * - AnalyticsHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Integrates with Git and Recipes domains through port adapters.
 */
export class AnalyticsHexa extends BaseHexa {
  private readonly hexa: AnalyticsHexaFactory;
  private _deploymentPort: IDeploymentPort | undefined | null = undefined;
  private readonly gitHexa: GitHexa;
  private readonly recipesHexa: RecipesHexa;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);

    this.logger.info(`Initializing ${origin}`);

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      this.gitHexa = registry.get(GitHexa);
      this.recipesHexa = registry.get(RecipesHexa);

      // Get adapters - RecipesHexa might not be initialized yet, so handle gracefully
      let gitPort: IGitPort;
      let recipesPort: IRecipesPort | undefined;

      try {
        gitPort = this.gitHexa.getGitAdapter();
      } catch (error) {
        this.logger.error(
          `Failed to get Git adapter: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }

      try {
        recipesPort = this.recipesHexa.getRecipesAdapter();
      } catch {
        // RecipesHexa not initialized yet - will be set later via setRecipesPort
        this.logger.debug(
          'RecipesHexa adapter not available yet, will be set after initialization',
        );
        recipesPort = undefined;
      }

      // Initialize the hexagon with the shared DataSource
      // RecipesPort and DeploymentPort will be resolved lazily to avoid circular dependencies
      this.hexa = new AnalyticsHexaFactory(
        dataSource,
        recipesPort,
        gitPort,
        this.logger,
      );
      this.logger.info(`${origin} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${origin}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the recipes port after initialization to avoid circular dependencies
   */
  public setRecipesPort(recipesPort: IRecipesPort): void {
    this.hexa.setRecipesPort(recipesPort);
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   */
  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this._deploymentPort = deploymentPort;
    // Update the use cases with the new deployment port
    this.hexa.setDeploymentPort(deploymentPort);
  }

  /**
   * Destroys the RecipesHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying RecipesHexa');
    // Add any cleanup logic here if needed
    this.logger.info('RecipesHexa destroyed');
  }

  // ===========================
  // USAGE ANALYTICS
  // ===========================

  /**
   * Track recipe usage by AI agents
   */
  public async trackRecipeUsage(
    command: TrackRecipeUsageCommand,
  ): Promise<RecipeUsage[]> {
    return this.hexa.useCases.trackRecipeUsage(command);
  }

  /**
   * Get usage records for a specific recipe
   */
  public async getUsageByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]> {
    return this.hexa.useCases.getUsageByRecipeId(recipeId);
  }

  /**
   * Get all usage records for an organization
   */
  public async getUsageByOrganization(
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]> {
    return this.hexa.useCases.getUsageByOrganization(organizationId);
  }

  /**
   * Get all usage records for a repository
   */
  public async getUsageByRepository(
    repositoryId: GitRepoId,
  ): Promise<RecipeUsage[]> {
    return this.hexa.useCases.getUsageByRepository(repositoryId);
  }

  /**
   * Get aggregated usage analytics for an organization or repository
   */
  public async getRecipeUsageAnalytics(params: {
    organizationId?: OrganizationId;
    repositoryId?: GitRepoId;
    targetId?: TargetId;
    timePeriod?: TimePeriod;
  }) {
    return this.hexa.useCases.getRecipeUsageAnalytics(params);
  }

  /**
   * Get aggregated usage analytics for a target
   */
  public async getTargetUsageAnalytics(
    targetId: TargetId,
    timePeriod?: TimePeriod,
  ) {
    return this.hexa.useCases.getTargetUsageAnalytics(targetId, timePeriod);
  }
}
