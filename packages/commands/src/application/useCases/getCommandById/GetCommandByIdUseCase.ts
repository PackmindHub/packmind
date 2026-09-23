import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  GetCommandByIdCommand,
  GetCommandByIdResponse,
  IAccountsPort,
  IGetCommandByIdUseCase,
  ISpacesPort,
  Command,
  CommandId,
} from '@packmind/types';
import { CommandSpaceNotAccessibleError } from '../../../domain/errors';
import { CommandService } from '../../services/CommandService';

const origin = 'GetRecipeByIdUseCase';

export class GetCommandByIdUseCase
  extends AbstractSpaceMemberUseCase<
    GetCommandByIdCommand,
    GetCommandByIdResponse
  >
  implements IGetCommandByIdUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly commandService: CommandService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('GetRecipeByIdUseCase initialized');
  }

  async executeForSpaceMembers(
    command: GetCommandByIdCommand & SpaceMemberContext,
  ): Promise<GetCommandByIdResponse> {
    this.logger.info('Getting recipe by ID', {
      id: command.recipeId,
      spaceId: command.spaceId,
    });

    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new CommandSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const recipe = await this.commandService.getCommandById(command.recipeId);

    if (!recipe || recipe.spaceId !== command.spaceId) {
      this.logger.info('Recipe not found', { id: command.recipeId });
      return { recipe: null };
    }

    this.logger.info('Recipe retrieved successfully', {
      id: command.recipeId,
    });
    return { recipe };
  }

  /**
   * Bypasses the space and organization checks executeForSpaceMembers applies.
   */
  public async getCommandById(id: CommandId): Promise<Command | null> {
    this.logger.info('Getting recipe by ID (internal)', { id });
    return this.commandService.getCommandById(id);
  }
}
