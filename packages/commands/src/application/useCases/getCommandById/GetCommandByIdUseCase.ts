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

    try {
      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: command.spaceId });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      const recipe = await this.commandService.getCommandById(command.recipeId);

      if (!recipe) {
        this.logger.info('Recipe not found', { id: command.recipeId });
        return { recipe: null };
      }

      // Verify the recipe belongs to the space
      // Recipes are now always space-specific (spaceId is never null)
      // Organization membership is verified through the space
      if (recipe.spaceId !== command.spaceId) {
        this.logger.warn('Recipe does not belong to space', {
          recipeId: command.recipeId,
          recipeSpaceId: recipe.spaceId,
          requestSpaceId: command.spaceId,
        });
        throw new Error(
          `Recipe ${command.recipeId} does not belong to space ${command.spaceId}`,
        );
      }

      this.logger.info('Recipe retrieved successfully', {
        id: command.recipeId,
      });
      return { recipe };
    } catch (error) {
      this.logger.error('Failed to get recipe by ID', {
        id: command.recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Legacy method for internal use (UpdateRecipeFromUI)
   * This bypasses access control and should only be used internally
   */
  public async getCommandById(id: CommandId): Promise<Command | null> {
    this.logger.info('Getting recipe by ID (internal)', { id });
    return this.commandService.getCommandById(id);
  }
}
