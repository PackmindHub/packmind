import { RecipeService } from '../../services/RecipeService';
import { Recipe, RecipeId } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger } from '@packmind/shared';

const origin = 'GetRecipeByIdUsecase';

export class GetRecipeByIdUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRecipeByIdUsecase initialized');
  }

  public async getRecipeById(id: RecipeId): Promise<Recipe | null> {
    this.logger.info('Getting recipe by ID', { id });

    try {
      const recipe = await this.recipeService.getRecipeById(id);
      this.logger.info('Recipe retrieved successfully', {
        id,
        found: !!recipe,
      });
      return recipe;
    } catch (error) {
      this.logger.error('Failed to get recipe by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
