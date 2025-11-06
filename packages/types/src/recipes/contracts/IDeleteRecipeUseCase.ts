import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { RecipeId } from '../RecipeId';
import { SpaceId } from '../../spaces/SpaceId';

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
