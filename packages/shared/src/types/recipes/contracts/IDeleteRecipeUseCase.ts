import { IUseCase, PackmindCommand, PackmindResult } from '@packmind/types';
import { RecipeId } from '../Recipe';
import { SpaceId } from '../../spaces';

export type DeleteRecipeCommand = PackmindCommand & {
  recipeId: RecipeId;
  spaceId: SpaceId;
};
export type DeleteRecipeResponse = PackmindResult;
export type IDeleteRecipeUseCase = IUseCase<
  DeleteRecipeCommand,
  DeleteRecipeResponse
>;

export type DeleteRecipesBatchCommand = PackmindCommand & {
  recipeIds: RecipeId[];
  spaceId: SpaceId;
};
export type DeleteRecipesBatchResponse = PackmindResult;
export type IDeleteRecipesBatchUseCase = IUseCase<
  DeleteRecipesBatchCommand,
  DeleteRecipesBatchResponse
>;
