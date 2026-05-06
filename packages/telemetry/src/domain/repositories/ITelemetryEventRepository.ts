import { OrganizationId, TelemetryEvent } from '@packmind/types';

export interface ITelemetryEventRepository {
  pushBatch(event: TelemetryEvent): Promise<void>;
  listRecent(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<TelemetryEvent[]>;
}
