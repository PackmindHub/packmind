import { IRecipesServices } from '../IRecipesServices';
import { RecipeService } from './RecipeService';
import { RecipeVersionService } from './RecipeVersionService';
import { RecipeSummaryService } from './RecipeSummaryService';
import { IRecipesRepositories } from '../../domain/repositories/IRecipesRepositories';
import { PackmindLogger } from '@packmind/shared';

export class RecipesServices implements IRecipesServices {
  private readonly recipeService: RecipeService;
  private readonly recipeVersionService: RecipeVersionService;
  private readonly recipeSummaryService: RecipeSummaryService;

  constructor(
    private readonly recipesRepositories: IRecipesRepositories,
    private readonly logger: PackmindLogger,
  ) {
    this.recipeService = new RecipeService(
      this.recipesRepositories.getRecipeRepository(),
      this.logger,
    );
    this.recipeVersionService = new RecipeVersionService(
      this.recipesRepositories.getRecipeVersionRepository(),
    );
    this.recipeSummaryService = new RecipeSummaryService(this.logger);
  }

  getRecipeService(): RecipeService {
    return this.recipeService;
  }

  getRecipeVersionService(): RecipeVersionService {
    return this.recipeVersionService;
  }

  getRecipeSummaryService(): RecipeSummaryService {
    return this.recipeSummaryService;
  }
}
