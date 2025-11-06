import { RecipesDeployment } from '../RecipesDeployment';
import { IUseCase, PackmindCommand } from '@packmind/types';
import { RecipeId } from '../../recipes';

export type ListDeploymentsByRecipeCommand = PackmindCommand & {
  recipeId: RecipeId;
};

export type IListDeploymentsByRecipe = IUseCase<
  ListDeploymentsByRecipeCommand,
  RecipesDeployment[]
>;
