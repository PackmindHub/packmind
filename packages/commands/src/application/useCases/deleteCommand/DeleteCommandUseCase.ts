import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';
import { PackmindLogger } from '@packmind/logger';
import {
  CommandNotFoundError,
  CommandSpaceNotAccessibleError,
} from '../../../domain/errors';
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

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new CommandSpaceNotAccessibleError(spaceId, organizationId);
    }

    this.logger.info('Fetching recipe to validate space ownership', {
      recipeId,
    });
    const existingCommand = await this.commandService.getCommandById(recipeId);

    if (!existingCommand || existingCommand.spaceId !== spaceId) {
      throw new CommandNotFoundError(recipeId, spaceId);
    }

    this.logger.info('Deleting recipe', { recipeId });
    await this.commandService.deleteCommand(recipeId, userId as UserId);

    this.logger.info('Deleting all recipe versions for recipe', { recipeId });
    await this.commandVersionService.deleteCommandVersionsForCommand(
      recipeId,
      userId,
    );

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
  }
}
