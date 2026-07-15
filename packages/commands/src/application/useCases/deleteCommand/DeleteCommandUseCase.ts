import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteCommandCommand,
  DeleteCommandResponse,
  IAccountsPort,
  IDeleteCommandUseCase,
  ISpacesPort,
  CommandDeletedEvent,
  UserId,
} from '@packmind/types';

const origin = 'DeleteRecipeUseCase';

export class DeleteCommandUseCase
  extends AbstractSpaceMemberUseCase<
    DeleteCommandCommand,
    DeleteCommandResponse
  >
  implements IDeleteCommandUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly commandService: CommandService,
    private readonly commandVersionService: CommandVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('DeleteRecipeUseCase initialized');
  }

  protected async executeForSpaceMembers(
    command: DeleteCommandCommand & SpaceMemberContext,
  ): Promise<DeleteCommandResponse> {
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
      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space) {
        this.logger.error('Space not found', { spaceId });
        throw new Error(`Space with id ${spaceId} not found`);
      }

      if (space.organizationId !== organizationId) {
        this.logger.error('Space does not belong to organization', {
          spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: organizationId,
        });
        throw new Error(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      }

      // Get existing recipe to validate space ownership
      this.logger.info('Fetching recipe to validate space ownership', {
        recipeId,
      });
      const existingCommand =
        await this.commandService.getCommandById(recipeId);

      if (!existingCommand) {
        this.logger.error('Recipe not found', { recipeId });
        throw new Error(`Recipe ${recipeId} not found`);
      }

      // Security validation: ensure recipe belongs to the specified space
      if (existingCommand.spaceId !== spaceId) {
        this.logger.error('Recipe does not belong to specified space', {
          recipeId,
          recipeSpaceId: existingCommand.spaceId,
          requestedSpaceId: spaceId,
        });
        throw new Error(
          `Recipe ${recipeId} does not belong to space ${spaceId}`,
        );
      }

      // Delete the recipe itself
      this.logger.info('Deleting recipe', { recipeId });
      await this.commandService.deleteCommand(recipeId, userId as UserId);

      // Then delete all recipe versions for this recipe
      this.logger.info('Deleting all recipe versions for recipe', { recipeId });
      await this.commandVersionService.deleteCommandVersionsForCommand(
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
