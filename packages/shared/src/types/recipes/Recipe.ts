import { Branded, brandedIdFactory } from '../brandedTypes';
import { UserId } from '../accounts';
import { GitCommit } from '../git';
import { SpaceId } from '../spaces';

export type RecipeId = Branded<'RecipeId'>;
export const createRecipeId = brandedIdFactory<RecipeId>();

export type Recipe = {
  id: RecipeId;
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId; // The owner of the recipe
  spaceId: SpaceId; // The space this recipe belongs to
};
