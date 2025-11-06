import { UserId, RecipeId, createRecipeId } from '@packmind/types';
import { GitCommit } from '../git';
import { SpaceId } from '../spaces';

// Re-export for backward compatibility
export type { RecipeId };
export { createRecipeId };

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
