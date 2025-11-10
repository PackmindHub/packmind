import { RecipeUsageService } from './services/RecipeUsageService';
import { RecipeUsageAnalyticsService } from './services/RecipeUsageAnalyticsService';
import { IRecipesPort } from '@packmind/types';

export interface IRecipesUsageServices {
  getRecipeUsageService(): RecipeUsageService;
  getRecipeUsageAnalyticsService(): RecipeUsageAnalyticsService;
  setRecipesPort(recipesPort: IRecipesPort): void;
}
