import { GitCommit } from '../git/GitCommit';
import { Branded, brandedIdFactory } from '../brandedTypes';
import { UserId } from '../accounts/User';
import { CommandId } from './CommandId';

export type CommandVersionId = Branded<'RecipeVersionId'>;
export const createCommandVersionId = brandedIdFactory<CommandVersionId>();

export type CommandVersion = {
  id: CommandVersionId;
  recipeId: CommandId;
  name: string;
  slug: string;
  content: string;
  version: number;
  summary?: string | null;
  gitCommit?: GitCommit;
  userId: UserId | null; // null for git commits, UserId for UI updates
};
