import { RecipeService } from './services/RecipeService';
import { RecipeVersionService } from './services/RecipeVersionService';
import { RecipeSummaryService } from './services/RecipeSummaryService';

export interface IRecipesServices {
  getRecipeService(): RecipeService;
  getRecipeVersionService(): RecipeVersionService;
  getRecipeSummaryService(): RecipeSummaryService;
}
