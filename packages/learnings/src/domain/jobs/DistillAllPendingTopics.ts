import { OrganizationId, SpaceId } from '@packmind/types';

export type DistillAllPendingTopicsInput = {
  spaceId: SpaceId;
  organizationId: OrganizationId;
  userId: string;
};

export type DistillAllPendingTopicsOutput = {
  spaceId: SpaceId;
  processedCount: number;
  failedCount: number;
};
