import { PackmindLogger } from '@packmind/logger';
import { IRecipesPort } from '@packmind/types';
import { IRecipesUsageRepositories } from '../../domain/repositories/IRecipesUsageRepositories';
import { RecipeUsageAnalyticsService } from './RecipeUsageAnalyticsService';
import { RecipeUsageService } from './RecipeUsageService';

export class RecipesUsageServices {
  private readonly recipeUsageService: RecipeUsageService;
  private recipeUsageAnalyticsService: RecipeUsageAnalyticsService;

  constructor(
    private readonly recipesRepositories: IRecipesUsageRepositories,
    private recipesPort: IRecipesPort | undefined,
    private readonly logger: PackmindLogger,
  ) {
    this.recipeUsageService = new RecipeUsageService(
      this.recipesRepositories.getRecipeUsageRepository(),
    );
    if (this.recipesPort) {
      this.recipeUsageAnalyticsService = new RecipeUsageAnalyticsService(
        this.recipesPort,
        this.logger,
      );
    } else {
      // Create a placeholder that will be replaced when port is set
      this.recipeUsageAnalyticsService =
        null as unknown as RecipeUsageAnalyticsService;
    }
  }

  setRecipesPort(recipesPort: IRecipesPort): void {
    this.recipesPort = recipesPort;
    this.recipeUsageAnalyticsService = new RecipeUsageAnalyticsService(
      this.recipesPort,
      this.logger,
    );
  }

  getRecipeUsageService(): RecipeUsageService {
    return this.recipeUsageService;
  }

  getRecipeUsageAnalyticsService(): RecipeUsageAnalyticsService {
    if (!this.recipeUsageAnalyticsService) {
      throw new Error('RecipesPort not set. Call setRecipesPort() first.');
    }
    return this.recipeUsageAnalyticsService;
  }
}
