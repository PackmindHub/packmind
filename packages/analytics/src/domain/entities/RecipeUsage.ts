import { Branded, brandedIdFactory } from '@packmind/types';
import { RecipeId } from '@packmind/types';
import { GitRepoId } from '@packmind/git/types';
import { UserId } from '@packmind/types';
import { TargetId } from '@packmind/types';

export type RecipeUsageId = Branded<'RecipeUsageId'>;
export const createRecipeUsageId = brandedIdFactory<RecipeUsageId>();

export type RecipeUsage = {
  id: RecipeUsageId;
  recipeId: RecipeId;
  usedAt: Date;
  aiAgent: string;
  gitRepoId: GitRepoId | null;
  userId: UserId;
  targetId: TargetId | null;
};
