import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { RecipeId } from '../Recipe';

export type DeleteRecipeCommand = PackmindCommand & {
  recipeId: RecipeId;
};
export type DeleteRecipeResponse = PackmindResult;
export type IDeleteRecipeUseCase = IUseCase<
  DeleteRecipeCommand,
  DeleteRecipeResponse
>;

export type DeleteRecipesBatchCommand = PackmindCommand & {
  recipeIds: RecipeId[];
};
export type DeleteRecipesBatchResponse = PackmindResult;
export type IDeleteRecipesBatchUseCase = IUseCase<
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse
>;
