import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { SpaceId } from '../../spaces/SpaceId';
import { RecipeId } from '../RecipeId';
import { Recipe } from '../Recipe';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type UpdateRecipeFromUICommand = PackmindCommand & {
  recipeId: RecipeId;
  name: string;
  slug: string;
  content: string;
  summary?: string;
  userId: UserId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
};

export type UpdateRecipeFromUIResponse = {
  recipe: Recipe;
};

export type IUpdateRecipeFromUIUseCase = IUseCase<
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse
>;
