import { Branded, brandedIdFactory } from '../brandedTypes';
import { RecipeId } from '../recipes/RecipeId';
import { GitRepoId } from '../git/GitRepoId';
import { UserId } from '../accounts/User';
import { TargetId } from '../deployments/TargetId';

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
