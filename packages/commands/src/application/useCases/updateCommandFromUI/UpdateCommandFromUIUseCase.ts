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

    // Verify the space belongs to the organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      this.logger.warn('Space not found', { spaceId });
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== organizationId) {
      this.logger.warn('Space does not belong to organization', {
        spaceId,
        spaceOrganizationId: space.organizationId,
        requestOrganizationId: organizationId,
      });
      throw new Error(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    }

    // Get the existing recipe and validate it belongs to the specified space
    this.logger.info('Fetching existing recipe', { recipeId });
    const existingCommand = await this.commandService.getCommandById(recipeId);

    if (!existingCommand) {
      this.logger.error('Recipe not found', { recipeId });
      throw new Error(`Recipe with id ${recipeId} not found`);
    }

    // Security validation: ensure recipe belongs to the specified space
    if (existingCommand.spaceId !== spaceId) {
      this.logger.error('Recipe does not belong to specified space', {
        recipeId,
        recipeSpaceId: existingCommand.spaceId,
        requestedSpaceId: spaceId,
      });
      throw new Error(`Recipe ${recipeId} does not belong to space ${spaceId}`);
    }

    // Business logic: Increment version number (same as Git flow)
    const nextVersion = existingCommand.version + 1;
    this.logger.info('Incrementing version number', {
      currentVersion: existingCommand.version,
      nextVersion,
    });

    // Update the recipe entity (no gitCommit for UI updates)
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

    // Create new recipe version with editor's userId
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
