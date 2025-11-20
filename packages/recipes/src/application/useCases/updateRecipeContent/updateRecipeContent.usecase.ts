import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RecipeId,
  RecipeVersion,
  createUserId,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'UpdateRecipeContentUsecase';

export class UpdateRecipeContentUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateRecipeContentUsecase initialized');
  }

  async updateRecipeContent(params: {
    recipeId: RecipeId;
    newContent: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<RecipeVersion> {
    const { recipeId, newContent, organizationId, userId } = params;

    this.logger.info('Updating recipe content', {
      recipeId,
      organizationId,
      userId,
    });

    try {
      const existingRecipe = await this.recipeService.getRecipeById(recipeId);
      if (!existingRecipe) {
        this.logger.error('Recipe not found', { recipeId });
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      if (existingRecipe.content === newContent) {
        this.logger.info('Content unchanged, getting current version', {
          recipeId,
        });
        const currentVersion = await this.recipeVersionService.getRecipeVersion(
          recipeId,
          existingRecipe.version,
        );
        if (!currentVersion) {
          throw new Error(
            `Version ${existingRecipe.version} not found for recipe ${recipeId}`,
          );
        }
        return currentVersion;
      }

      const nextVersion = existingRecipe.version + 1;
      const brandedUserId = createUserId(userId);

      await this.recipeService.updateRecipe(recipeId, {
        name: existingRecipe.name,
        content: newContent,
        slug: existingRecipe.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId: brandedUserId,
      });

      const newVersion = await this.recipeVersionService.addRecipeVersion({
        recipeId,
        name: existingRecipe.name,
        slug: existingRecipe.slug,
        content: newContent,
        version: nextVersion,
        userId: brandedUserId,
      });

      this.logger.info('Recipe content updated successfully', {
        recipeId,
        newVersion: nextVersion,
        versionId: newVersion.id,
      });

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to update recipe content', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
