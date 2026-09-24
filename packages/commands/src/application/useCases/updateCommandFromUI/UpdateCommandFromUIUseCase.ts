import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CommandUpdatedEvent,
  IAccountsPort,
  ISpacesPort,
  IUpdateCommandFromUIUseCase,
  UpdateCommandFromUICommand,
  UpdateCommandFromUIResponse,
} from '@packmind/types';
import {
  CommandNotFoundError,
  CommandSpaceNotAccessibleError,
} from '../../../domain/errors';
import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';

const origin = 'UpdateRecipeFromUIUseCase';

export class UpdateCommandFromUIUseCase
  extends AbstractSpaceMemberUseCase<
    UpdateCommandFromUICommand,
    UpdateCommandFromUIResponse
  >
  implements IUpdateCommandFromUIUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly commandService: CommandService,
    private readonly commandVersionService: CommandVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort, new PackmindLogger(origin));
    this.logger.info('UpdateRecipeFromUIUseCase initialized');
  }

  protected async executeForSpaceMembers(
    command: UpdateCommandFromUICommand & SpaceMemberContext,
  ): Promise<UpdateCommandFromUIResponse> {
    const { recipeId, spaceId, organizationId, name, content, userId, source } =
      command;

    this.logger.info('Starting updateRecipeFromUI process', {
      recipeId,
      spaceId,
      organizationId,
      name,
      userId,
    });

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new CommandSpaceNotAccessibleError(spaceId, organizationId);
    }

    this.logger.info('Fetching existing recipe', { recipeId });
    const existingCommand = await this.commandService.getCommandById(recipeId);

    if (!existingCommand || existingCommand.spaceId !== spaceId) {
      throw new CommandNotFoundError(recipeId, spaceId);
    }

    const nextVersion = existingCommand.version + 1;
    this.logger.info('Incrementing version number', {
      currentVersion: existingCommand.version,
      nextVersion,
    });

    const updatedCommand = await this.commandService.updateCommand(
      existingCommand.id,
      {
        name: name.trim(),
        slug: existingCommand.slug, // slug cannot be edited
        content: content.trim(),
        version: nextVersion,
        gitCommit: undefined, // No git commit for UI updates
        userId: existingCommand.userId, // Keep original owner
      },
    );

    this.logger.info('Creating new recipe version');
    const newCommandVersion =
      await this.commandVersionService.addCommandVersion({
        recipeId: existingCommand.id,
        name: name.trim(),
        slug: existingCommand.slug,
        content: content.trim(),
        version: nextVersion,
        gitCommit: undefined, // No git commit for UI updates
        userId, // Use editor's ID for the version
      });

    this.logger.info('Recipe updated successfully from UI', {
      recipeId,
      newVersion: nextVersion,
      versionId: newCommandVersion.id,
      userId,
    });

    this.eventEmitterService.emit(
      new CommandUpdatedEvent({
        id: recipeId,
        spaceId,
        newVersion: nextVersion,
        organizationId,
        userId,
        source: source ?? 'ui',
      }),
    );

    return { recipe: updatedCommand };
  }
}
