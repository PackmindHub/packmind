import { DataSource } from 'typeorm';
import { IRecipesRepositories } from '../../domain/repositories/IRecipesRepositories';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { RecipeRepository } from './RecipeRepository';
import { RecipeVersionRepository } from './RecipeVersionRepository';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';

export class RecipesRepositories implements IRecipesRepositories {
  private readonly recipeRepository: IRecipeRepository;
  private readonly recipeVersionRepository: IRecipeVersionRepository;

  constructor(private readonly dataSource: DataSource) {
    this.recipeRepository = new RecipeRepository(
      this.dataSource.getRepository(RecipeSchema),
    );
    this.recipeVersionRepository = new RecipeVersionRepository(
      this.dataSource.getRepository(RecipeVersionSchema),
    );
  }

  getRecipeRepository(): IRecipeRepository {
    return this.recipeRepository;
  }

  getRecipeVersionRepository(): IRecipeVersionRepository {
    return this.recipeVersionRepository;
  }
}
