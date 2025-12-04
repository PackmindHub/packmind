import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import { RecipeDeletedEvent, StandardDeletedEvent } from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';

const origin = 'DeploymentsListener';

export class DeploymentsListener extends PackmindListener<IPackageRepository> {
  private readonly logger: PackmindLogger;

  constructor(adapter: IPackageRepository) {
    super(adapter);
    this.logger = new PackmindLogger(origin);
  }

  protected registerHandlers(): void {
    this.subscribe(RecipeDeletedEvent, this.handleRecipeDeleted);
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
  }

  private handleRecipeDeleted = async (
    event: RecipeDeletedEvent,
  ): Promise<void> => {
    const { recipeId } = event.payload;
    this.logger.info('Handling RecipeDeletedEvent', { recipeId });

    try {
      await this.adapter.removeRecipeFromAllPackages(recipeId);
      this.logger.info('Recipe removed from all packages successfully', {
        recipeId,
      });
    } catch (error) {
      this.logger.error('Failed to remove recipe from packages', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw to ensure the error is not silently swallowed
      throw error;
    }
  };

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { standardId } = event.payload;
    this.logger.info('Handling StandardDeletedEvent', { standardId });

    try {
      await this.adapter.removeStandardFromAllPackages(standardId);
      this.logger.info('Standard removed from all packages successfully', {
        standardId,
      });
    } catch (error) {
      this.logger.error('Failed to remove standard from packages', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw to ensure the error is not silently swallowed
      throw error;
    }
  };
}
