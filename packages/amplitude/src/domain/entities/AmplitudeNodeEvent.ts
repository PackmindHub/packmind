import { UserId, OrganizationId } from '@packmind/types';

export type AmplitudeMetadata = Record<string, string | number | boolean>;

export type AmplitudeNodeEvent = {
  userId: UserId;
  orgaId: OrganizationId;
  event: string;
  metadata?: AmplitudeMetadata;
};
