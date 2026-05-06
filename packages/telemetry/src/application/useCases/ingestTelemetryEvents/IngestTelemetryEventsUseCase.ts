import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IIngestTelemetryEventsUseCase,
  IngestTelemetryEventsCommand,
  IngestTelemetryEventsResponse,
  TelemetryEvent,
  createTelemetryEventId,
} from '@packmind/types';
import { ITelemetryEventRepository } from '../../../domain/repositories/ITelemetryEventRepository';

const origin = 'IngestTelemetryEventsUseCase';

export const MAX_LOG_RECORDS_PER_BATCH = 10_000;

export class IngestTelemetryEventsUseCase
  extends AbstractMemberUseCase<
    IngestTelemetryEventsCommand,
    IngestTelemetryEventsResponse
  >
  implements IIngestTelemetryEventsUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly repository: ITelemetryEventRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: IngestTelemetryEventsCommand & MemberContext,
  ): Promise<IngestTelemetryEventsResponse> {
    const { rawPayload, user, organization } = command;
    const { logRecordCount, sizeBytes } = describePayload(rawPayload);

    if (logRecordCount > MAX_LOG_RECORDS_PER_BATCH) {
      throw new TelemetryPayloadTooLargeError(
        logRecordCount,
        MAX_LOG_RECORDS_PER_BATCH,
      );
    }

    const event: TelemetryEvent = {
      id: createTelemetryEventId(uuidv4()),
      receivedAt: new Date(),
      organizationId: organization.id,
      userId: user.id,
      logRecordCount,
      sizeBytes,
      rawPayload,
    };

    await this.repository.pushBatch(event);

    return {
      eventId: event.id,
      acceptedRecords: logRecordCount,
    };
  }
}

export class TelemetryPayloadTooLargeError extends Error {
  constructor(
    public readonly received: number,
    public readonly max: number,
  ) {
    super(
      `Telemetry payload contains ${received} log records, exceeding the limit of ${max}`,
    );
    this.name = 'TelemetryPayloadTooLargeError';
  }
}

export function describePayload(rawPayload: unknown): {
  logRecordCount: number;
  sizeBytes: number;
} {
  let serialized: string;
  try {
    serialized = JSON.stringify(rawPayload ?? null);
  } catch {
    throw new InvalidTelemetryPayloadError('Payload is not JSON-serialisable');
  }

  const sizeBytes = Buffer.byteLength(serialized, 'utf8');

  if (rawPayload === null || typeof rawPayload !== 'object') {
    throw new InvalidTelemetryPayloadError(
      'Payload must be an OTLP ExportLogsServiceRequest object',
    );
  }

  const resourceLogs = (rawPayload as { resourceLogs?: unknown }).resourceLogs;

  if (resourceLogs === undefined) {
    return { logRecordCount: 0, sizeBytes };
  }

  if (!Array.isArray(resourceLogs)) {
    throw new InvalidTelemetryPayloadError(
      '`resourceLogs` must be an array when provided',
    );
  }

  let logRecordCount = 0;
  for (const resourceLog of resourceLogs) {
    if (!resourceLog || typeof resourceLog !== 'object') continue;
    const scopeLogs = (resourceLog as { scopeLogs?: unknown }).scopeLogs;
    if (!Array.isArray(scopeLogs)) continue;
    for (const scopeLog of scopeLogs) {
      if (!scopeLog || typeof scopeLog !== 'object') continue;
      const logRecords = (scopeLog as { logRecords?: unknown }).logRecords;
      if (Array.isArray(logRecords)) {
        logRecordCount += logRecords.length;
      }
    }
  }

  return { logRecordCount, sizeBytes };
}

export class InvalidTelemetryPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTelemetryPayloadError';
  }
}
