import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { TelemetryEvent } from '../TelemetryEvent';

export type ListRecentTelemetryEventsCommand = PackmindCommand & {
  limit: number;
};

export type ListRecentTelemetryEventsResponse = PackmindResult & {
  events: TelemetryEvent[];
};

export type IListRecentTelemetryEventsUseCase = IUseCase<
  ListRecentTelemetryEventsCommand,
  ListRecentTelemetryEventsResponse
>;
