import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListRecipesBySpaceUseCase,
  ISpacesPort,
  ListRecipesBySpaceCommand,
  ListRecipesBySpaceResponse,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';

const origin = 'ListRecipesBySpaceUsecase';

export class ListRecipesBySpaceUsecase
  extends AbstractMemberUseCase<
    ListRecipesBySpaceCommand,
    ListRecipesBySpaceResponse
  >
  implements IListRecipesBySpaceUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly recipeService: RecipeService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('ListRecipesBySpaceUsecase initialized');
  }

  async executeForMembers(
    command: ListRecipesBySpaceCommand & MemberContext,
  ): Promise<ListRecipesBySpaceResponse> {
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
      const recipes = await this.recipeService.listRecipesBySpace(
        command.spaceId,
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
