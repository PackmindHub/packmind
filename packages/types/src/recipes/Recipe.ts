import { UserId } from '../accounts/User';
import { RecipeId } from './RecipeId';
import { GitCommit } from '../git/GitCommit';
import { SpaceId } from '../spaces/SpaceId';
import { WithCreator } from '../database/types';

export type Recipe = WithCreator<{
  id: RecipeId;
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId; // The owner of the recipe
  spaceId: SpaceId; // The space this recipe belongs to
}>;
