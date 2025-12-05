import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';

export type ListDeploymentsByRecipeCommand = PackmindCommand & {
  recipeId: RecipeId;
};

export type IListDeploymentsByRecipe = IUseCase<
  ListDeploymentsByRecipeCommand,
  Distribution[]
>;
