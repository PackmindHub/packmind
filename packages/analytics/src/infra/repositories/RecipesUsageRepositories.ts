import { DataSource } from 'typeorm';
import { IRecipeUsageRepository } from '../../domain/repositories/IRecipeUsageRepository';
import { RecipeUsageRepository } from './RecipeUsageRepository';
import { RecipeUsageSchema } from '../schemas';
import { RecipeUsage } from '../../domain/entities/RecipeUsage';
import { IRecipesUsageRepositories } from '../../domain/repositories/IRecipesUsageRepositories';

export class RecipesUsageRepositories implements IRecipesUsageRepositories {
  private readonly recipeUsageRepository: IRecipeUsageRepository;

  constructor(private readonly dataSource: DataSource) {
    this.recipeUsageRepository = new RecipeUsageRepository(
      this.dataSource.getRepository<RecipeUsage>(RecipeUsageSchema),
    );
  }
  getRecipeUsageRepository(): IRecipeUsageRepository {
    return this.recipeUsageRepository;
  }
}
