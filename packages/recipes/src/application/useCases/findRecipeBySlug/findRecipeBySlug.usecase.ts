import { RecipeService } from '../../services/RecipeService';
import { Recipe } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { QueryOption } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

const origin = 'FindRecipeBySlugUsecase';

export class FindRecipeBySlugUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('FindRecipeBySlugUsecase initialized');
  }

  public async findRecipeBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null> {
    this.logger.info('Finding recipe by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const recipe = await this.recipeService.findRecipeBySlug(
        slug,
        organizationId,
        opts,
      );
      this.logger.info('Recipe search by slug and organization completed', {
        slug,
        organizationId,
        found: !!recipe,
      });
      return recipe;
    } catch (error) {
      this.logger.error('Failed to find recipe by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
