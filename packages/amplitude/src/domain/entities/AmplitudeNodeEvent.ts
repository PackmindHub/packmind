import { UserId, OrganizationId } from '@packmind/types';

export type AmplitudeNodeEvent = {
  userId: UserId;
  orgaId: OrganizationId;
  event: string;
  metadata?: Record<string, string | number>;
};
