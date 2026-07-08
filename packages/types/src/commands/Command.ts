import { UserId } from '../accounts/User';
import { CommandId } from './CommandId';
import { GitCommit } from '../git/GitCommit';
import { SpaceId } from '../spaces/SpaceId';
import { WithCreator } from '../database/types';

export type Command = WithCreator<{
  id: CommandId;
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId; // The owner of the recipe
  spaceId: SpaceId; // The space this recipe belongs to
  movedTo: SpaceId | null;
}>;
