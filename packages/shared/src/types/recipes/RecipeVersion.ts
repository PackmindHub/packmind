import { GitCommit } from '../git';

import { Branded, brandedIdFactory } from '../brandedTypes';
import { UserId } from '../accounts';

import { RecipeId } from './Recipe';

export type RecipeVersionId = Branded<'RecipeVersionId'>;
export const createRecipeVersionId = brandedIdFactory<RecipeVersionId>();

export type RecipeVersion = {
  id: RecipeVersionId;
  recipeId: RecipeId;
  name: string;
  slug: string;
  content: string;
  version: number;
  summary?: string | null;
  gitCommit?: GitCommit;
  userId: UserId | null; // null for git commits, UserId for UI updates
};
