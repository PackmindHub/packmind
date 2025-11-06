import { IUseCase } from '@packmind/types';
import { Recipe, RecipeId } from '../Recipe';
import { OrganizationId } from '@packmind/types';
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
