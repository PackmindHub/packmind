import { Distribution } from '../Distribution';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';

export type ListDistributionsByRecipeCommand = PackmindCommand & {
  recipeId: RecipeId;
};

export type IListDistributionsByRecipe = IUseCase<
  ListDistributionsByRecipeCommand,
  Distribution[]
>;
