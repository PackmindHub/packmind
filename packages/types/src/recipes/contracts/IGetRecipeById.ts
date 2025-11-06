import { IUseCase } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Recipe } from '../Recipe';
import { RecipeId } from '../RecipeId';
import { SpaceId } from '../../spaces/SpaceId';

export type GetRecipeByIdCommand = {
  userId: string;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  recipeId: RecipeId;
};

export type GetRecipeByIdResponse = {
  recipe: Recipe | null;
};

export type IGetRecipeByIdUseCase = IUseCase<
  GetRecipeByIdCommand,
  GetRecipeByIdResponse
>;
