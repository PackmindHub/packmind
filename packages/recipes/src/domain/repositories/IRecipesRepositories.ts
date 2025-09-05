import { IRecipeRepository } from './IRecipeRepository';
import { IRecipeVersionRepository } from './IRecipeVersionRepository';

export interface IRecipesRepositories {
  getRecipeRepository(): IRecipeRepository;
  getRecipeVersionRepository(): IRecipeVersionRepository;
}
