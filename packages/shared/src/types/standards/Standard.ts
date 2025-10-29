import { UserId } from '../accounts';
import { GitCommit } from '../git';
import { SpaceId } from '../spaces';

import { Branded, brandedIdFactory } from '../brandedTypes';

export type StandardId = Branded<'StandardId'>;
export const createStandardId = brandedIdFactory<StandardId>();

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
