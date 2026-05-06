import { ListRecentTelemetryEventsResponse } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';

export class TelemetryGatewayApi extends PackmindGateway {
  constructor() {
    super('/telemetry');
  }

  async listEvents(limit = 50): Promise<ListRecentTelemetryEventsResponse> {
    return this._api.get<ListRecentTelemetryEventsResponse>(
      `${this._endpoint}/events?limit=${limit}`,
    );
  }
}

export const telemetryGateway = new TelemetryGatewayApi();
