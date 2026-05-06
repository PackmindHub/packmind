import type { Redis } from 'ioredis';
import { PackmindLogger } from '@packmind/logger';
import { OrganizationId, TelemetryEvent } from '@packmind/types';
import { ITelemetryEventRepository } from '../../domain/repositories/ITelemetryEventRepository';

const origin = 'TelemetryEventRepository';

const KEY_PREFIX = 'telemetry:events:org:';
const TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
const MAX_BATCHES_PER_ORG = 1000;

export class TelemetryEventRepository implements ITelemetryEventRepository {
  constructor(
    private readonly client: Redis,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async pushBatch(event: TelemetryEvent): Promise<void> {
    const key = this.buildKey(event.organizationId);
    const serialized = JSON.stringify({
      ...event,
      receivedAt: event.receivedAt.toISOString(),
    });

    await this.client
      .multi()
      .lpush(key, serialized)
      .ltrim(key, 0, MAX_BATCHES_PER_ORG - 1)
      .expire(key, TTL_SECONDS)
      .exec();

    this.logger.info('Telemetry batch persisted', {
      organizationId: event.organizationId,
      eventId: event.id,
      logRecordCount: event.logRecordCount,
      sizeBytes: event.sizeBytes,
    });
  }

  async listRecent(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<TelemetryEvent[]> {
    const key = this.buildKey(organizationId);
    const safeLimit = Math.max(1, Math.min(limit, MAX_BATCHES_PER_ORG));
    const raw = await this.client.lrange(key, 0, safeLimit - 1);

    return raw.map((entry) => this.deserialize(entry));
  }

  private buildKey(organizationId: OrganizationId): string {
    return `${KEY_PREFIX}${organizationId}`;
  }

  private deserialize(entry: string): TelemetryEvent {
    const parsed = JSON.parse(entry) as TelemetryEvent & { receivedAt: string };
    return {
      ...parsed,
      receivedAt: new Date(parsed.receivedAt),
    };
  }
}
