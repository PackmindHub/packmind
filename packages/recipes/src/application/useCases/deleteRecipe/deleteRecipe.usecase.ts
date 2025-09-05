import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import { UserId } from '@packmind/accounts';
import {
  DeleteRecipeCommand,
  DeleteRecipeResponse,
  IDeleteRecipeUseCase,
} from '../../../domain/useCases/IDeleteRecipeUseCase';

const origin = 'DeleteRecipeUsecase';

export class DeleteRecipeUsecase implements IDeleteRecipeUseCase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteRecipeUsecase initialized');
  }

  public async execute(
    command: DeleteRecipeCommand,
  ): Promise<DeleteRecipeResponse> {
    const { recipeId, userId, organizationId } = command;
    this.logger.info('Starting deleteRecipe process', {
      recipeId,
      userId,
      organizationId,
    });

    try {
      // First, delete the recipe itself
      this.logger.info('Deleting recipe', { recipeId });
      await this.recipeService.deleteRecipe(recipeId, userId as UserId);

      // Then delete all recipe versions for this recipe
      this.logger.info('Deleting all recipe versions for recipe', { recipeId });
      await this.recipeVersionService.deleteRecipeVersionsForRecipe(
        recipeId,
        userId,
      );

      this.logger.info('Recipe deletion completed successfully', { recipeId });
      return {};
    } catch (error) {
      this.logger.error('Failed to delete recipe', {
        recipeId,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
