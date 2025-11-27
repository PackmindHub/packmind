import { IRecipeUsageRepository } from './IRecipeUsageRepository';

export interface IRecipesUsageRepositories {
  getRecipeUsageRepository(): IRecipeUsageRepository;
}
