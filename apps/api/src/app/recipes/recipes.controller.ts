import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { GitRepoId } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { RecipeId, RecipeVersion, RecipeVersionId } from '@packmind/recipes';
import { SpaceId, TargetId } from '@packmind/types';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { RecipesService } from './recipes.service';

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
      if (!me.authenticated || !me.user || !me.organization) {
        this.logger.error('POST /recipes/publish - User not authenticated');
        throw new BadRequestException('User not authenticated');
      }

      await this.recipesService.publishRecipeToTargets(
        body.recipeVersionIds,
        body.targetIds,
        me.user.id,
        me.organization.id,
      );

      this.logger.info(
        'POST /recipes/publish - Recipes published to targets successfully',
        {
          recipeVersionIds: body.recipeVersionIds,
          targetIds: body.targetIds,
          authorId: me.user.id,
          organizationId: me.organization.id,
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
      if (!me.authenticated || !me.user || !me.organization) {
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
        me.organization.id,
      );

      this.logger.info(
        'POST /recipes/:versionId/publish - Recipe published to Git successfully',
        {
          recipeVersionId: versionId,
          repositoryId: body.repositoryId,
          authorId: me.user.id,
          organizationId: me.organization.id,
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

  @Delete()
  async deleteRecipesBatch(
    @Body() body: { recipeIds: RecipeId[]; spaceId: SpaceId },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    try {
      if (!body.recipeIds || !Array.isArray(body.recipeIds)) {
        throw new BadRequestException('recipeIds must be an array');
      }

      if (body.recipeIds.length === 0) {
        throw new BadRequestException('recipeIds array cannot be empty');
      }

      if (!body.spaceId) {
        throw new BadRequestException('spaceId is required');
      }

      this.logger.info('DELETE /recipes - Deleting recipes in batch', {
        recipeIds: body.recipeIds,
        spaceId: body.spaceId,
        count: body.recipeIds.length,
      });

      await this.recipesService.deleteRecipesBatch(
        body.recipeIds,
        body.spaceId,
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
        spaceId: body?.spaceId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
