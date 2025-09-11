import {
  BaseHexa,
  HexaRegistry,
  PackmindLogger,
  QueryOption,
  CaptureRecipeCommand,
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
  private readonly logger: PackmindLogger;

  constructor(
    registry: HexaRegistry,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(registry);

    this.logger = logger;
    this.logger.info('Initializing RecipesHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      const gitHexa = registry.get(GitHexa);

      // Initialize the hexagon with the shared DataSource
      this.hexa = new RecipesHexaFactory(dataSource, gitHexa, this.logger);
      this.logger.info('RecipesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RecipesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
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
   * Find a recipe by its slug
   */
  public async findRecipeBySlug(
    slug: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null> {
    return this.hexa.useCases.findRecipeBySlug(slug, opts);
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
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ): Promise<Recipe[]> {
    return this.hexa.useCases.updateRecipesFromGitHub(
      payload,
      organizationId,
      headers,
    );
  }

  /**
   * Update recipes from GitLab webhook events
   */
  public async updateRecipesFromGitLab(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ): Promise<Recipe[]> {
    return this.hexa.useCases.updateRecipesFromGitLab(
      payload,
      organizationId,
      headers,
    );
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
