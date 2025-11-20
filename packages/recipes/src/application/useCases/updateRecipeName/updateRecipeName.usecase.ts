import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RecipeId,
  RecipeVersion,
  createUserId,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'UpdateRecipeNameUsecase';

export class UpdateRecipeNameUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateRecipeNameUsecase initialized');
  }

  async updateRecipeName(params: {
    recipeId: RecipeId;
    newName: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<RecipeVersion> {
    const { recipeId, newName, organizationId, userId } = params;

    this.logger.info('Updating recipe name', {
      recipeId,
      newName,
      organizationId,
      userId,
    });

    try {
      const existingRecipe = await this.recipeService.getRecipeById(recipeId);
      if (!existingRecipe) {
        this.logger.error('Recipe not found', { recipeId });
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      if (existingRecipe.name === newName) {
        this.logger.info('Name unchanged, getting current version', {
          recipeId,
          name: newName,
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
        name: newName,
        content: existingRecipe.content,
        slug: existingRecipe.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId: brandedUserId,
      });

      const newVersion = await this.recipeVersionService.addRecipeVersion({
        recipeId,
        name: newName,
        slug: existingRecipe.slug,
        content: existingRecipe.content,
        version: nextVersion,
        userId: brandedUserId,
      });

      this.logger.info('Recipe name updated successfully', {
        recipeId,
        newName,
        newVersion: nextVersion,
        versionId: newVersion.id,
      });

      return newVersion;
    } catch (error) {
      this.logger.error('Failed to update recipe name', {
        recipeId,
        newName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
