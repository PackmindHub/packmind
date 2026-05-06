import { OrganizationId, UserId } from '../accounts';
import { TelemetryEventId } from './TelemetryEventId';

export type TelemetryEvent = {
  id: TelemetryEventId;
  receivedAt: Date;
  organizationId: OrganizationId;
  userId: UserId;
  logRecordCount: number;
  sizeBytes: number;
  rawPayload: unknown;
};
