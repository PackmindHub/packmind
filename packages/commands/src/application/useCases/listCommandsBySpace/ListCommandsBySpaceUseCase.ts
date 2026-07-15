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

    try {
      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', {
          spaceId: command.spaceId,
        });
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

      // Get recipes in the specified space
      // Recipes are now always space-specific, no organization-level recipes
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
    } catch (error) {
      this.logger.error('Failed to list recipes by space', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
