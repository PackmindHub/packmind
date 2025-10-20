import {
  BaseHexa,
  HexaRegistry,
  PackmindLogger,
  QueryOption,
  CaptureRecipeCommand,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
  IDeploymentPort,
  BaseHexaOpts,
} from '@packmind/shared';
import { RecipesHexaFactory } from './RecipesHexaFactory';
import { Recipe, RecipeId } from './domain/entities/Recipe';
import {
  RecipeVersion,
  RecipeVersionId,
} from './domain/entities/RecipeVersion';
import { OrganizationId, UserId } from '@packmind/accounts';
import { GitHexa } from '@packmind/git';

import {
  DeleteRecipeCommand,
  DeleteRecipeResponse,
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse,
} from './domain/useCases/IDeleteRecipeUseCase';

const origin = 'RecipesHexa';

/**
 * RecipesHexa - Facade for the Recipes domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for recipes-related functionality.
 * It holds the RecipesHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - RecipesHexaFactory: Handles dependency injection and service instantiation
 * - RecipesHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 * Also integrates with GitHexa for git-related recipe operations.
 */
export class RecipesHexa extends BaseHexa {
  private readonly hexa: RecipesHexaFactory;
  private _deploymentPort: IDeploymentPort | undefined | null = undefined;
  private isInitialized = false;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);

    this.logger.info('Constructing RecipesHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      const gitHexa = registry.get(GitHexa);

      // Initialize the hexagon with the shared DataSource
      // DeploymentPort will be resolved lazily to avoid circular dependencies
      this.hexa = new RecipesHexaFactory(
        dataSource,
        registry,
        gitHexa,
        undefined,
        this.logger,
      );
      this.logger.info('RecipesHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction.
   * This initializes delayed jobs and async dependencies.
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('RecipesHexa already initialized');
      return;
    }

    this.logger.info('Initializing RecipesHexa (async phase)');

    try {
      // Set RecipesHexa reference in the factory to enable webhook use cases access to delayed jobs
      this.hexa.setRecipesHexa(this);

      await this.hexa.initialize();
      this.isInitialized = true;
      this.logger.info('RecipesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'RecipesHexa not initialized. Call initialize() before using delayed jobs.',
      );
    }
  }

  /**
   * Get the delayed jobs for accessing job queues
   */
  public getRecipesDelayedJobs() {
    this.ensureInitialized();
    return this.hexa.getRecipesDelayedJobs();
  }

  /**
   * Set the deployment port after initialization to avoid circular dependencies
   * This will trigger async initialization if not already initialized
   */
  public async setDeploymentPort(
    deploymentPort: IDeploymentPort,
  ): Promise<void> {
    this._deploymentPort = deploymentPort;
    // Update the use cases with the new deployment port
    this.hexa.updateDeploymentPort(deploymentPort);

    // Initialize delayed jobs if not already initialized
    if (!this.isInitialized) {
      this.logger.info(
        'Deployment port set, triggering RecipesHexa initialization',
      );
      await this.initialize();
    }
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
  // CORE RECIPE MANAGEMENT
  // ===========================

  /**
   * Capture a new recipe with initial content
   */
  public async captureRecipe(command: CaptureRecipeCommand): Promise<Recipe> {
    return this.hexa.useCases.captureRecipe(command);
  }

  /**
   * Delete a recipe and all its versions
   */
  public async deleteRecipe(
    command: DeleteRecipeCommand,
  ): Promise<DeleteRecipeResponse> {
    return this.hexa.useCases.deleteRecipe(command);
  }

  /**
   * Delete multiple recipes in batch
   */
  public async deleteRecipesBatch(
    command: DeleteRecipesBatchCommand,
  ): Promise<DeleteRecipesBatchResponse> {
    return this.hexa.useCases.deleteRecipesBatch(command);
  }

  /**
   * Get a recipe by its ID
   */
  public async getRecipeById(id: RecipeId): Promise<Recipe | null> {
    return this.hexa.useCases.getRecipeById(id);
  }

  /**
   * Find a recipe by its slug within an organization
   */
  public async findRecipeBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null> {
    return this.hexa.useCases.findRecipeBySlug(slug, organizationId, opts);
  }

  /**
   * List all recipes for an organization
   */
  public async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    return this.hexa.useCases.listRecipesByOrganization(organizationId);
  }

  // ===========================
  // RECIPE VERSION MANAGEMENT
  // ===========================

  /**
   * List all versions of a recipe
   */
  public async listRecipeVersions(
    recipeId: RecipeId,
  ): Promise<RecipeVersion[]> {
    return this.hexa.useCases.listRecipeVersions(recipeId);
  }

  /**
   * Get a specific version of a recipe
   */
  public async getRecipeVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null> {
    return this.hexa.useCases.getRecipeVersion(recipeId, version);
  }

  /**
   * Get a recipe version by its ID
   */
  public async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    return this.hexa.recipesServices
      .getRecipeVersionService()
      .getRecipeVersionById(id);
  }

  // ===========================
  // GIT INTEGRATION
  // ===========================

  /**
   * Update recipes from GitHub webhook events
   */
  public async updateRecipesFromGitHub(
    command: UpdateRecipesFromGitHubCommand,
  ): Promise<Recipe[]> {
    return this.hexa.useCases.updateRecipesFromGitHub(command);
  }

  /**
   * Update recipes from GitLab webhook events
   */
  public async updateRecipesFromGitLab(
    command: UpdateRecipesFromGitLabCommand,
  ): Promise<Recipe[]> {
    return this.hexa.useCases.updateRecipesFromGitLab(command);
  }

  /**
   * Update a recipe from UI with new content (creates new version)
   */
  public async updateRecipeFromUI(params: {
    recipeId: RecipeId;
    name: string;
    content: string;
    editorUserId: UserId;
  }): Promise<Recipe> {
    return this.hexa.useCases.updateRecipeFromUI(params);
  }
}
