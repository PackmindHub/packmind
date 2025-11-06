import { RecipeService } from '../../services/RecipeService';
import { Recipe, RecipeId } from '../../../domain/entities/Recipe';
import { PackmindLogger } from '@packmind/logger';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from '@packmind/shared';
import { ISpacesPort } from '@packmind/types';
import {
  GetRecipeByIdCommand,
  GetRecipeByIdResponse,
  IGetRecipeByIdUseCase,
} from '@packmind/types';

const origin = 'GetRecipeByIdUsecase';

export class GetRecipeByIdUsecase
  extends AbstractMemberUseCase<GetRecipeByIdCommand, GetRecipeByIdResponse>
  implements IGetRecipeByIdUseCase
{
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    private readonly recipeService: RecipeService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
    this.logger.info('GetRecipeByIdUsecase initialized');
  }

  async executeForMembers(
    command: GetRecipeByIdCommand & MemberContext,
  ): Promise<GetRecipeByIdResponse> {
    this.logger.info('Getting recipe by ID', {
      id: command.recipeId,
      spaceId: command.spaceId,
    });

    try {
      // Verify the space belongs to the organization
      if (!this.spacesPort) {
        this.logger.error('SpacesPort not available for space validation');
        throw new Error('SpacesPort not available');
      }

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

      const recipe = await this.recipeService.getRecipeById(command.recipeId);

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
   * Legacy method for internal use (UpdateRecipeFromUI, RecipeUsageAnalytics)
   * This bypasses access control and should only be used internally
   */
  public async getRecipeById(id: RecipeId): Promise<Recipe | null> {
    this.logger.info('Getting recipe by ID (internal)', { id });
    return this.recipeService.getRecipeById(id);
  }
}
