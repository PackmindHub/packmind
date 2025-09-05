import { DeleteRecipeUsecase } from '../deleteRecipe/deleteRecipe.usecase';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import {
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse,
  IDeleteRecipesBatchUseCase,
} from '../../../domain/useCases/IDeleteRecipeUseCase';

const origin = 'DeleteRecipesBatchUsecase';

export class DeleteRecipesBatchUsecase implements IDeleteRecipesBatchUseCase {
  constructor(
    private readonly deleteRecipeUsecase: DeleteRecipeUsecase,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteRecipesBatchUsecase initialized');
  }

  public async execute(
    command: DeleteRecipesBatchCommand,
  ): Promise<DeleteRecipesBatchResponse> {
    const { recipeIds, userId, organizationId } = command;
    this.logger.info('Deleting recipes batch', {
      count: recipeIds.length,
      userId,
      organizationId,
    });

    try {
      await Promise.all(
        recipeIds.map((recipeId) =>
          this.deleteRecipeUsecase.execute({
            recipeId,
            userId,
            organizationId,
          }),
        ),
      );
      this.logger.info('Recipes batch deleted successfully', {
        count: recipeIds.length,
      });
      return {};
    } catch (error) {
      this.logger.error('Failed to delete recipes batch', {
        count: recipeIds.length,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
