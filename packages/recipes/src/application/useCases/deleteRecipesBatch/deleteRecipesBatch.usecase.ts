import { DeleteRecipeUsecase } from '../deleteRecipe/deleteRecipe.usecase';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse,
  IDeleteRecipesBatchUseCase,
} from '@packmind/shared';

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
    const { recipeIds, spaceId, userId, organizationId } = command;
    this.logger.info('Deleting recipes batch', {
      count: recipeIds.length,
      spaceId,
      userId,
      organizationId,
    });

    try {
      await Promise.all(
        recipeIds.map((recipeId) =>
          this.deleteRecipeUsecase.execute({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recipeId: recipeId as any,
            spaceId,
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
        spaceId,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
