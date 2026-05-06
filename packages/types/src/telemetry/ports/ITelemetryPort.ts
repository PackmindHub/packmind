import {
  IngestTelemetryEventsCommand,
  IngestTelemetryEventsResponse,
} from '../contracts/IIngestTelemetryEventsUseCase';
import {
  ListRecentTelemetryEventsCommand,
  ListRecentTelemetryEventsResponse,
} from '../contracts/IListRecentTelemetryEventsUseCase';

export const ITelemetryPortName = 'ITelemetryPort' as const;

export interface ITelemetryPort {
  ingestTelemetryEvents(
    command: IngestTelemetryEventsCommand,
  ): Promise<IngestTelemetryEventsResponse>;

  listRecentTelemetryEvents(
    command: ListRecentTelemetryEventsCommand,
  ): Promise<ListRecentTelemetryEventsResponse>;
}
