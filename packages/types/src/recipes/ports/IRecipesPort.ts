import { OrganizationId } from '../../accounts/Organization';
import {
  CaptureRecipeCommand,
  DeleteRecipeCommand,
  DeleteRecipeResponse,
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse,
  GetRecipeByIdCommand,
  ListRecipesBySpaceCommand,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitLabCommand,
} from '../contracts';
import { Recipe } from '../Recipe';
import { RecipeId } from '../RecipeId';
import { RecipeVersion, RecipeVersionId } from '../RecipeVersion';
import { SpaceId } from '../../spaces/SpaceId';

// QueryOption is now exported from @packmind/types/database/types
import type { QueryOption } from '../../database/types';

export const IRecipesPortName = 'IRecipesPort' as const;

/**
 * Port interface for the Recipes domain.
 * Defines all public methods that can be consumed by other domains.
 */
export interface IRecipesPort {
  // ===========================
  // CORE RECIPE MANAGEMENT
  // ===========================

  /**
   * Capture a new recipe with initial content
   */
  captureRecipe(command: CaptureRecipeCommand): Promise<Recipe>;

  /**
   * Delete a recipe and all its versions
   */
  deleteRecipe(command: DeleteRecipeCommand): Promise<DeleteRecipeResponse>;

  /**
   * Delete multiple recipes in batch
   */
  deleteRecipesBatch(
    command: DeleteRecipesBatchCommand,
  ): Promise<DeleteRecipesBatchResponse>;

  /**
   * Get a recipe by its ID (public API - with access control)
   */
  getRecipeById(command: GetRecipeByIdCommand): Promise<Recipe | null>;

  /**
   * Get a recipe by its ID (internal use - no access control)
   * Used by UpdateRecipeFromUI and RecipeUsageAnalytics
   */
  getRecipeByIdInternal(id: RecipeId): Promise<Recipe | null>;

  /**
   * Find a recipe by its slug within an organization
   */
  findRecipeBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null>;

  /**
   * List all recipes for an organization
   */
  listRecipesByOrganization(organizationId: OrganizationId): Promise<Recipe[]>;

  /**
   * List recipes by space (public API - with access control)
   */
  listRecipesBySpace(command: ListRecipesBySpaceCommand): Promise<Recipe[]>;

  // ===========================
  // RECIPE VERSION MANAGEMENT
  // ===========================

  /**
   * List all versions of a recipe
   */
  listRecipeVersions(recipeId: RecipeId): Promise<RecipeVersion[]>;

  /**
   * Get a specific version of a recipe
   */
  getRecipeVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null>;

  /**
   * Get a recipe version by its ID
   */
  getRecipeVersionById(id: string): Promise<RecipeVersion | null>;

  // ===========================
  // GIT INTEGRATION
  // ===========================

  /**
   * Update recipes from GitHub webhook events
   */
  updateRecipesFromGitHub(
    command: UpdateRecipesFromGitHubCommand,
  ): Promise<Recipe[]>;

  /**
   * Update recipes from GitLab webhook events
   */
  updateRecipesFromGitLab(
    command: UpdateRecipesFromGitLabCommand,
  ): Promise<Recipe[]>;

  /**
   * Update a recipe from UI with new content (creates new version)
   */
  updateRecipeFromUI(
    command: UpdateRecipeFromUICommand,
  ): Promise<UpdateRecipeFromUIResponse>;

  // ===========================
  // EMBEDDING METHODS
  // ===========================

  /**
   * Update embedding for a recipe version
   */
  updateRecipeVersionEmbedding(
    versionId: RecipeVersionId,
    embedding: number[],
  ): Promise<void>;

  /**
   * Find latest recipe versions without embeddings
   */
  findLatestRecipeVersionsWithoutEmbedding(
    spaceId?: SpaceId,
  ): Promise<RecipeVersion[]>;

  /**
   * Find all latest recipe versions
   */
  findAllLatestRecipeVersions(spaceId?: SpaceId): Promise<RecipeVersion[]>;

  /**
   * Find similar recipes by embedding vector
   */
  findSimilarRecipesByEmbedding(
    embedding: number[],
    spaceId?: SpaceId,
    threshold?: number,
  ): Promise<Array<RecipeVersion & { similarity: number }>>;
}
