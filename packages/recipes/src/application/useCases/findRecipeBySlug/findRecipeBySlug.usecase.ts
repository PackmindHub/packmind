import { RecipeService } from '../../services/RecipeService';
import { Recipe } from '../../../domain/entities/Recipe';
import { LogLevel, PackmindLogger, QueryOption } from '@packmind/shared';

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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null> {
    this.logger.info('Finding recipe by slug', { slug });

    try {
      const recipe = await this.recipeService.findRecipeBySlug(slug, opts);
      this.logger.info('Recipe search by slug completed', {
        slug,
        found: !!recipe,
      });
      return recipe;
    } catch (error) {
      this.logger.error('Failed to find recipe by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
