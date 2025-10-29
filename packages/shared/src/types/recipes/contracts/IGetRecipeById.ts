import { IUseCase } from '../../UseCase';
import { Recipe, RecipeId } from '../Recipe';
import { OrganizationId } from '../../accounts/Organization';
import { SpaceId } from '../../spaces/Space';

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
