import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IListCommandsBySpaceUseCase,
  ISpacesPort,
  ListCommandsBySpaceCommand,
  ListCommandsBySpaceResponse,
} from '@packmind/types';
import { CommandSpaceNotAccessibleError } from '../../../domain/errors';
import { CommandService } from '../../services/CommandService';

const origin = 'ListRecipesBySpaceUseCase';

export class ListCommandsBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListCommandsBySpaceCommand,
    ListCommandsBySpaceResponse
  >
  implements IListCommandsBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly commandService: CommandService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('ListRecipesBySpaceUseCase initialized');
  }

  async executeForSpaceMembers(
    command: ListCommandsBySpaceCommand & SpaceMemberContext,
  ): Promise<ListCommandsBySpaceResponse> {
    this.logger.info('Listing recipes by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new CommandSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const recipes = await this.commandService.listCommandsBySpace(
      command.spaceId,
      { includeDeleted: command.includeDeleted },
    );

    this.logger.info('Recipes listed by space successfully', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
      count: recipes.length,
    });

    return { recipes };
  }
}
