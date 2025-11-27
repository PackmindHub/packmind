import {
  Branded,
  brandedIdFactory,
  GitRepoId,
  RecipeId,
  TargetId,
  UserId,
} from '@packmind/types';

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
