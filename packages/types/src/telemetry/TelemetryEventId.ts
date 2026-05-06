import { Branded, brandedIdFactory } from '../brandedTypes';

export type TelemetryEventId = Branded<'TelemetryEventId'>;
export const createTelemetryEventId = brandedIdFactory<TelemetryEventId>();
