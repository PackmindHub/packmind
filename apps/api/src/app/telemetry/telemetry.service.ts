import { Injectable } from '@nestjs/common';
import {
  IngestTelemetryEventsCommand,
  IngestTelemetryEventsResponse,
  ITelemetryPort,
  ListRecentTelemetryEventsCommand,
  ListRecentTelemetryEventsResponse,
} from '@packmind/types';
import { InjectTelemetryAdapter } from '../shared/HexaInjection';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectTelemetryAdapter()
    private readonly telemetryAdapter: ITelemetryPort,
  ) {}

  ingest(
    command: IngestTelemetryEventsCommand,
  ): Promise<IngestTelemetryEventsResponse> {
    return this.telemetryAdapter.ingestTelemetryEvents(command);
  }

  listRecent(
    command: ListRecentTelemetryEventsCommand,
  ): Promise<ListRecentTelemetryEventsResponse> {
    return this.telemetryAdapter.listRecentTelemetryEvents(command);
  }
}
