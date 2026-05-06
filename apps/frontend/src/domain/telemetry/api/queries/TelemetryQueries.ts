import { queryOptions, useQuery } from '@tanstack/react-query';
import { telemetryGateway } from '../gateways/TelemetryGatewayApi';

const TELEMETRY_QUERY_SCOPE = 'telemetry';

export const getTelemetryEventsOptions = (limit = 50) =>
  queryOptions({
    queryKey: [TELEMETRY_QUERY_SCOPE, 'events', limit] as const,
    queryFn: () => telemetryGateway.listEvents(limit),
  });

export const useGetTelemetryEventsQuery = (limit = 50) =>
  useQuery(getTelemetryEventsOptions(limit));
