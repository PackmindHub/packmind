import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  OrganizationId,
  Recipe,
  RecipeId,
  RecipeVersion,
  SpaceId,
} from '@packmind/types';
import { RecipesService } from './recipes.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';

const origin = 'OrganizationsSpacesRecipesController';

/**
 * Controller for space-scoped recipe routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/recipes (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped recipe endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /recipes path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/recipes
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard ensure proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard, SpaceAccessGuard)
export class OrganizationsSpacesRecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesRecipesController initialized');
  }

  /**
   * Get all recipes for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Get()
  async getRecipes(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes - Fetching recipes',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      return await this.recipesService.getRecipesBySpace(
        spaceId,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/recipes - Failed to fetch recipes',
        {
          organizationId,
          spaceId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get a recipe by ID within a space
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Get(':id')
  async getRecipeById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:id - Fetching recipe by ID',
      {
        organizationId,
        spaceId,
        recipeId: id,
      },
    );

    try {
      const recipe = await this.recipesService.getRecipeById(
        id,
        organizationId,
        spaceId,
        userId,
      );
      if (!recipe) {
        this.logger.warn(
          'GET /organizations/:orgId/spaces/:spaceId/recipes/:id - Recipe not found',
          {
            organizationId,
            spaceId,
            recipeId: id,
          },
        );
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }
      return recipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/recipes/:id - Failed to fetch recipe',
        {
          organizationId,
          spaceId,
          recipeId: id,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Create a new recipe within a space
   * POST /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Post()
  async createRecipe(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    recipe: Omit<
      RecipeVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    >,
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/recipes - Creating recipe',
      {
        organizationId,
        spaceId,
        recipeName: recipe.name,
        userId,
      },
    );

    try {
      return await this.recipesService.addRecipe(
        recipe,
        organizationId,
        userId,
        spaceId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /organizations/:orgId/spaces/:spaceId/recipes - Failed to create recipe',
        {
          organizationId,
          spaceId,
          recipeName: recipe.name,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Update a recipe within a space
   * PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Patch(':id')
  async updateRecipe(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: RecipeId,
    @Body()
    updateData: {
      name: string;
      slug?: string;
      content: string;
      summary?: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe> {
    const userId = request.user.userId;

    this.logger.info(
      'PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id - Updating recipe',
      {
        organizationId,
        spaceId,
        recipeId: id,
        recipeName: updateData.name,
        userId,
      },
    );

    try {
      const updatedRecipe = await this.recipesService.updateRecipeFromUI(
        id,
        spaceId,
        organizationId,
        updateData.name,
        updateData.slug || '',
        updateData.content,
        userId,
        updateData.summary,
      );

      this.logger.info(
        'PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id - Recipe updated successfully',
        {
          organizationId,
          spaceId,
          recipeId: id,
          newVersion: updatedRecipe.version,
          userId,
        },
      );

      return updatedRecipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id - Failed to update recipe',
        {
          organizationId,
          spaceId,
          recipeId: id,
          recipeName: updateData.name,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Delete multiple recipes within a space (batch delete)
   * DELETE /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Delete()
  async deleteRecipesBatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { recipeIds: RecipeId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    if (!body.recipeIds || !Array.isArray(body.recipeIds)) {
      throw new BadRequestException('recipeIds must be an array');
    }

    if (body.recipeIds.length === 0) {
      throw new BadRequestException('recipeIds array cannot be empty');
    }

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes - Deleting recipes in batch',
      {
        organizationId,
        spaceId,
        recipeIds: body.recipeIds,
        count: body.recipeIds.length,
        userId,
      },
    );

    try {
      await this.recipesService.deleteRecipesBatch(
        body.recipeIds,
        spaceId,
        userId,
        organizationId,
      );

      this.logger.info(
        'DELETE /organizations/:orgId/spaces/:spaceId/recipes - Recipes deleted successfully in batch',
        {
          organizationId,
          spaceId,
          count: body.recipeIds.length,
          userId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/spaces/:spaceId/recipes - Failed to delete recipes in batch',
        {
          organizationId,
          spaceId,
          recipeIds: body.recipeIds,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Delete a recipe within a space
   * DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Delete(':id')
  async deleteRecipe(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id - Deleting recipe',
      {
        organizationId,
        spaceId,
        recipeId: id,
        userId,
      },
    );

    try {
      await this.recipesService.deleteRecipe(
        id,
        spaceId,
        organizationId,
        userId,
      );

      this.logger.info(
        'DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id - Recipe deleted successfully',
        {
          organizationId,
          spaceId,
          recipeId: id,
          userId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id - Failed to delete recipe',
        {
          organizationId,
          spaceId,
          recipeId: id,
          userId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Get all versions of a recipe within a space
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions
   */
  @Get(':id/versions')
  async getRecipeVersionsById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: RecipeId,
  ): Promise<RecipeVersion[]> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions - Fetching recipe versions',
      {
        organizationId,
        spaceId,
        recipeId: id,
      },
    );

    try {
      const versions = await this.recipesService.getRecipeVersionsById(id);
      if (!versions || versions.length === 0) {
        this.logger.warn(
          'GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions - No versions found',
          {
            organizationId,
            spaceId,
            recipeId: id,
          },
        );
        throw new NotFoundException(
          `No versions found for recipe with id ${id}`,
        );
      }
      return versions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions - Failed to fetch recipe versions',
        {
          organizationId,
          spaceId,
          recipeId: id,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
