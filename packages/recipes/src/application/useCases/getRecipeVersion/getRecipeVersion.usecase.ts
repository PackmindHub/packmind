import { RecipeVersionService } from '../../services/RecipeVersionService';
import { RecipeVersion } from '../../../domain/entities/RecipeVersion';
import { LogLevel, PackmindLogger } from '@packmind/shared';

import { RecipeId } from '../../../domain/entities/Recipe';

const origin = 'GetRecipeVersionUsecase';

export class GetRecipeVersionUsecase {
  constructor(
    private readonly recipeVersionService: RecipeVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRecipeVersionUsecase initialized');
  }

  public async getRecipeVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null> {
    this.logger.info('Getting recipe version', { recipeId, version });

    try {
      const recipeVersion = await this.recipeVersionService.getRecipeVersion(
        recipeId,
        version,
      );
      this.logger.info('Recipe version retrieved successfully', {
        recipeId,
        version,
        found: !!recipeVersion,
      });
      return recipeVersion;
    } catch (error) {
      this.logger.error('Failed to get recipe version', {
        recipeId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
