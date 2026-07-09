import { RecipeService } from './RecipeService';
import { RecipeVersionService } from './RecipeVersionService';
import { IRecipesRepositories } from '../../domain/repositories/IRecipesRepositories';

export class RecipesServices {
  private readonly recipeService: RecipeService;
  private readonly recipeVersionService: RecipeVersionService;

  constructor(private readonly recipesRepositories: IRecipesRepositories) {
    this.recipeService = new RecipeService(
      this.recipesRepositories.getRecipeRepository(),
      this.recipesRepositories.getRecipeVersionRepository(),
    );
    this.recipeVersionService = new RecipeVersionService(
      this.recipesRepositories.getRecipeVersionRepository(),
    );
  }

  getRecipeService(): RecipeService {
    return this.recipeService;
  }

  getRecipeVersionService(): RecipeVersionService {
    return this.recipeVersionService;
  }
}
