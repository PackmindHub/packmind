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
  Put,
  Req,
} from '@nestjs/common';
import {
  Recipe,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
} from '@packmind/recipes';
import { GitRepoId } from '@packmind/git';
import { TargetId } from '@packmind/shared';
import { RecipesService } from './recipes.service';
import { PackmindLogger } from '@packmind/shared';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';

const origin = 'RecipesController';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly authService: AuthService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipesController initialized');
  }

  @Get()
  async getRecipes(@Req() request: AuthenticatedRequest): Promise<Recipe[]> {
    const organizationId = request.organization.id;
    this.logger.info('GET /recipes - Fetching recipes for organization', {
      organizationId,
    });

    try {
      return await this.recipesService.getRecipesByOrganization(organizationId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /recipes - Failed to fetch recipes', {
        organizationId,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get(':id')
  async getRecipeById(@Param('id') id: RecipeId): Promise<Recipe> {
    this.logger.info('GET /recipes/:id - Fetching recipe by ID', {
      recipeId: id,
    });

    try {
      const recipe = await this.recipesService.getRecipeById(id);
      if (!recipe) {
        this.logger.warn('GET /recipes/:id - Recipe not found', {
          recipeId: id,
        });
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }
      return recipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET /recipes/:id - Failed to fetch recipe', {
        recipeId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Put()
  async addRecipe(
    @Body()
    recipe: Omit<
      RecipeVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    >,
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe> {
    this.logger.info('PUT /recipes - Adding new recipe', {
      recipeName: recipe.name,
      userId: request.user?.userId,
      organizationId: request.organization?.id,
    });

    try {
      // Extract user and organization context from authenticated request
      const organizationId = request.organization?.id;
      const userId = request.user?.userId;

      if (!organizationId || !userId) {
        this.logger.error(
          'PUT /recipes - Missing user or organization context',
          {
            userId,
            organizationId,
          },
        );
        throw new BadRequestException('User authentication required');
      }

      return await this.recipesService.addRecipe(
        recipe,
        organizationId,
        userId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('PUT /recipes - Failed to add recipe', {
        recipeName: recipe.name,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Patch(':id')
  async updateRecipe(
    @Param('id') id: RecipeId,
    @Body() updateData: { name: string; content: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Recipe> {
    this.logger.info('PATCH /recipes/:id - Updating recipe from UI', {
      recipeId: id,
      recipeName: updateData.name,
      userId: request.user?.userId,
    });

    try {
      // Extract user context from authenticated request
      const editorUserId = request.user?.userId;

      if (!editorUserId) {
        this.logger.error('PATCH /recipes/:id - Missing user context', {
          recipeId: id,
          userId: editorUserId,
        });
        throw new BadRequestException('User authentication required');
      }

      const updatedRecipe = await this.recipesService.updateRecipeFromUI(
        id,
        updateData.name,
        updateData.content,
        editorUserId,
      );

      this.logger.info('PATCH /recipes/:id - Recipe updated successfully', {
        recipeId: id,
        newVersion: updatedRecipe.version,
        userId: editorUserId,
      });

      return updatedRecipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('PATCH /recipes/:id - Failed to update recipe', {
        recipeId: id,
        recipeName: updateData.name,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Get(':id/versions')
  async getRecipeVersionsById(
    @Param('id') id: RecipeId,
  ): Promise<RecipeVersion[]> {
    this.logger.info('GET /recipes/:id/versions - Fetching recipe versions', {
      recipeId: id,
    });

    try {
      const versions = await this.recipesService.getRecipeVersionsById(id);
      if (!versions || versions.length === 0) {
        this.logger.warn('GET /recipes/:id/versions - No versions found', {
          recipeId: id,
        });
        throw new NotFoundException(
          `No versions found for recipe with id ${id}`,
        );
      }
      return versions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'GET /recipes/:id/versions - Failed to fetch recipe versions',
        { recipeId: id, error: errorMessage },
      );
      throw error;
    }
  }

  @Post('/publish')
  async publishRecipesToGit(
    @Body()
    body: {
      recipeVersionIds: RecipeVersionId[];
      targetIds: TargetId[];
    },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info('POST /recipes/publish - Publishing recipes to targets', {
      recipeVersionIds: body.recipeVersionIds,
      targetIds: body.targetIds,
    });

    try {
      // Validate request body
      if (
        !body.recipeVersionIds ||
        !Array.isArray(body.recipeVersionIds) ||
        body.recipeVersionIds.length === 0
      ) {
        this.logger.error(
          'POST /recipes/publish - Recipe Version IDs array is required',
        );
        throw new BadRequestException('Recipe Version IDs array is required');
      }

      if (
        !body.targetIds ||
        !Array.isArray(body.targetIds) ||
        body.targetIds.length === 0
      ) {
        this.logger.error(
          'POST /recipes/publish - Target IDs array is required',
        );
        throw new BadRequestException('Target IDs array is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user) {
        this.logger.error('POST /recipes/publish - User not authenticated');
        throw new BadRequestException('User not authenticated');
      }

      await this.recipesService.publishRecipeToTargets(
        body.recipeVersionIds,
        body.targetIds,
        me.user.id,
        me.user.organizationId,
      );

      this.logger.info(
        'POST /recipes/publish - Recipes published to targets successfully',
        {
          recipeVersionIds: body.recipeVersionIds,
          targetIds: body.targetIds,
          authorId: me.user.id,
          organizationId: me.user.organizationId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /recipes/publish - Failed to publish recipes to targets',
        {
          recipeVersionIds: body.recipeVersionIds,
          targetIds: body.targetIds,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Post(':versionId/publish')
  async publishRecipeToGit(
    @Param('versionId') versionId: RecipeVersionId,
    @Body() body: { repositoryId: GitRepoId },
    @Req() request: Request,
  ): Promise<void> {
    this.logger.info(
      'POST /recipes/:versionId/publish - Publishing recipe to Git',
      {
        recipeVersionId: versionId,
        repositoryId: body.repositoryId,
      },
    );

    try {
      // Validate repository ID
      if (!body.repositoryId) {
        this.logger.error(
          'POST /recipes/:versionId/publish - Repository ID is required',
          {
            recipeVersionId: versionId,
          },
        );
        throw new BadRequestException('Repository ID is required');
      }

      const accessToken = request.cookies?.auth_token;
      const me = await this.authService.getMe(accessToken);
      if (!me.authenticated || !me.user) {
        this.logger.error(
          'POST /recipes/:versionId/publish - User not authenticated',
          {
            recipeVersionId: versionId,
          },
        );
        throw new BadRequestException('User not authenticated');
      }

      await this.recipesService.publishRecipeToGit(
        [versionId],
        [body.repositoryId],
        me.user.id,
        me.user.organizationId,
      );

      this.logger.info(
        'POST /recipes/:versionId/publish - Recipe published to Git successfully',
        {
          recipeVersionId: versionId,
          repositoryId: body.repositoryId,
          authorId: me.user.id,
          organizationId: me.user.organizationId,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'POST /recipes/:versionId/publish - Failed to publish recipe to Git',
        {
          recipeVersionId: versionId,
          repositoryId: body.repositoryId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteRecipe(
    @Param('id') id: RecipeId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.info('DELETE /recipes/:id - Deleting recipe', {
      recipeId: id,
    });

    try {
      await this.recipesService.deleteRecipe(
        id,
        request.user.userId,
        request.organization.id,
      );
      this.logger.info('DELETE /recipes/:id - Recipe deleted successfully', {
        recipeId: id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('DELETE /recipes/:id - Failed to delete recipe', {
        recipeId: id,
        error: errorMessage,
      });
      throw error;
    }
  }

  @Delete()
  async deleteRecipesBatch(
    @Body() body: { recipeIds: RecipeId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    try {
      if (!body.recipeIds || !Array.isArray(body.recipeIds)) {
        throw new BadRequestException('recipeIds must be an array');
      }

      if (body.recipeIds.length === 0) {
        throw new BadRequestException('recipeIds array cannot be empty');
      }

      this.logger.info('DELETE /recipes - Deleting recipes in batch', {
        recipeIds: body.recipeIds,
        count: body.recipeIds.length,
      });

      await this.recipesService.deleteRecipesBatch(
        body.recipeIds,
        request.user.userId,
        request.organization.id,
      );
      this.logger.info(
        'DELETE /recipes - Recipes deleted successfully in batch',
        {
          count: body.recipeIds.length,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('DELETE /recipes - Failed to delete recipes in batch', {
        recipeIds: body?.recipeIds || 'undefined',
        error: errorMessage,
      });
      throw error;
    }
  }
}
