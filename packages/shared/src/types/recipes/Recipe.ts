import { Branded, brandedIdFactory } from '../brandedTypes';
import { OrganizationId, UserId } from '../accounts';
import { GitCommit } from '../git';

export type RecipeId = Branded<'RecipeId'>;
export const createRecipeId = brandedIdFactory<RecipeId>();

export type Recipe = {
  id: RecipeId;
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  organizationId: OrganizationId;
  userId: UserId; // The owner of the recipe
};
