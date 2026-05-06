import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { TelemetryEventId } from '../TelemetryEventId';

export type IngestTelemetryEventsCommand = PackmindCommand & {
  rawPayload: unknown;
};

export type IngestTelemetryEventsResponse = PackmindResult & {
  eventId: TelemetryEventId;
  acceptedRecords: number;
};

export type IIngestTelemetryEventsUseCase = IUseCase<
  IngestTelemetryEventsCommand,
  IngestTelemetryEventsResponse
>;
