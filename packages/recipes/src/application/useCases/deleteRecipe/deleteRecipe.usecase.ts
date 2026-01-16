import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteRecipeCommand,
  DeleteRecipeResponse,
  IDeleteRecipeUseCase,
  CommandDeletedEvent,
  UserId,
} from '@packmind/types';

const origin = 'DeleteRecipeUsecase';

export class DeleteRecipeUsecase implements IDeleteRecipeUseCase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
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
    const {
      recipeId,
      spaceId,
      userId,
      organizationId,
      source = 'ui',
    } = command;
    this.logger.info('Starting deleteRecipe process', {
      recipeId,
      spaceId,
      userId,
      organizationId,
    });

    try {
      // Get existing recipe to validate space ownership
      this.logger.info('Fetching recipe to validate space ownership', {
        recipeId,
      });
      const existingRecipe = await this.recipeService.getRecipeById(recipeId);

      if (!existingRecipe) {
        this.logger.error('Recipe not found', { recipeId });
        throw new Error(`Recipe ${recipeId} not found`);
      }

      // Security validation: ensure recipe belongs to the specified space
      if (existingRecipe.spaceId !== spaceId) {
        this.logger.error('Recipe does not belong to specified space', {
          recipeId,
          recipeSpaceId: existingRecipe.spaceId,
          requestedSpaceId: spaceId,
        });
        throw new Error(
          `Recipe ${recipeId} does not belong to space ${spaceId}`,
        );
      }

      // Delete the recipe itself
      this.logger.info('Deleting recipe', { recipeId });
      await this.recipeService.deleteRecipe(recipeId, userId as UserId);

      // Then delete all recipe versions for this recipe
      this.logger.info('Deleting all recipe versions for recipe', { recipeId });
      await this.recipeVersionService.deleteRecipeVersionsForRecipe(
        recipeId,
        userId,
      );

      // Emit event to notify other domains
      const event = new CommandDeletedEvent({
        id: recipeId,
        spaceId,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
        source,
      });
      this.eventEmitterService.emit(event);
      this.logger.info('RecipeDeletedEvent emitted', {
        recipeId,
        spaceId,
      });

      this.logger.info('Recipe deletion completed successfully', { recipeId });
      return {};
    } catch (error) {
      this.logger.error('Failed to delete recipe', {
        recipeId,
        spaceId,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
