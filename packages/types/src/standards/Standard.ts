import { UserId } from '../accounts/User';
import { StandardId } from './StandardId';
import { GitCommit } from '../git/GitCommit';
import { SpaceId } from '../spaces/SpaceId';

export type Standard = {
  id: StandardId;
  name: string;
  slug: string;
  description: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId; // The owner of the standard
  scope: string | null; // Scope from the latest StandardVersion
  spaceId: SpaceId; // The space this standard belongs to
  updatedAt?: Date;
};
