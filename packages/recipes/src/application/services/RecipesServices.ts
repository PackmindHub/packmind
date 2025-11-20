import { RecipeService } from './RecipeService';
import { RecipeVersionService } from './RecipeVersionService';
import { RecipeSummaryService } from './RecipeSummaryService';
import { IRecipesRepositories } from '../../domain/repositories/IRecipesRepositories';
import { PackmindLogger } from '@packmind/logger';
import type { ILlmPort } from '@packmind/types';

export class RecipesServices {
  private readonly recipeService: RecipeService;
  private readonly recipeVersionService: RecipeVersionService;
  private recipeSummaryService: RecipeSummaryService;

  constructor(
    private readonly recipesRepositories: IRecipesRepositories,
    private readonly logger: PackmindLogger,
    private llmPort?: ILlmPort,
  ) {
    this.recipeService = new RecipeService(
      this.recipesRepositories.getRecipeRepository(),
      this.logger,
    );
    this.recipeVersionService = new RecipeVersionService(
      this.recipesRepositories.getRecipeVersionRepository(),
    );
    // RecipeSummaryService created with llmPort (may be undefined initially)
    this.recipeSummaryService = new RecipeSummaryService(
      this.logger,
      this.llmPort,
    );
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

  setLlmPort(port: ILlmPort): void {
    this.llmPort = port;
    // Recreate RecipeSummaryService with the llmPort
    this.recipeSummaryService = new RecipeSummaryService(
      this.logger,
      this.llmPort,
    );
  }
}
