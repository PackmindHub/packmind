import { OrganizationId, UserId } from '../accounts';
import { GitCommit } from '../git';

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
  organizationId: OrganizationId;
  userId: UserId; // The owner of the standard
  scope: string | null; // Scope from the latest StandardVersion
};
