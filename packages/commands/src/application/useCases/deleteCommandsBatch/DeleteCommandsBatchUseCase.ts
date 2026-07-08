import { DeleteCommandUseCase } from '../deleteCommand/DeleteCommandUseCase';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  DeleteCommandsBatchCommand,
  DeleteCommandsBatchResponse,
  IDeleteCommandsBatchUseCase,
} from '@packmind/types';

const origin = 'DeleteRecipesBatchUseCase';

export class DeleteCommandsBatchUseCase implements IDeleteCommandsBatchUseCase {
  constructor(
    private readonly deleteCommandUseCase: DeleteCommandUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteRecipesBatchUseCase initialized');
  }

  public async execute(
    command: DeleteCommandsBatchCommand,
  ): Promise<DeleteCommandsBatchResponse> {
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
          this.deleteCommandUseCase.execute({
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
