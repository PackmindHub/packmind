import { RecipeVersionService } from '../../services/RecipeVersionService';
import { RecipeVersion } from '../../../domain/entities/RecipeVersion';
import { LogLevel, PackmindLogger } from '@packmind/shared';

import { RecipeId } from '../../../domain/entities/Recipe';

const origin = 'ListRecipeVersionsUsecase';

export class ListRecipeVersionsUsecase {
  constructor(
    private readonly recipeVersionService: RecipeVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListRecipeVersionsUsecase initialized');
  }

  public async listRecipeVersions(
    recipeId: RecipeId,
  ): Promise<RecipeVersion[]> {
    this.logger.info('Listing recipe versions', { recipeId });

    try {
      const versions =
        await this.recipeVersionService.listRecipeVersions(recipeId);
      this.logger.info('Recipe versions listed successfully', {
        recipeId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list recipe versions', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
