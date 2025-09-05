import { IUseCase, PackmindCommand, PackmindResult } from '@packmind/shared';
import { RecipeId } from '../entities';

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
