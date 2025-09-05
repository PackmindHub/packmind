import { RecipeService } from '../../services/RecipeService';
import { Recipe } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

const origin = 'ListRecipesByOrganizationUsecase';

export class ListRecipesByOrganizationUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListRecipesByOrganizationUsecase initialized');
  }

  public async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    this.logger.info('Listing recipes by organization', { organizationId });

    try {
      const recipes =
        await this.recipeService.listRecipesByOrganization(organizationId);
      this.logger.info('Recipes listed by organization successfully', {
        organizationId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to list recipes by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
