import {
  createOrganizationId,
  createTelemetryEventId,
  createUserId,
  TelemetryEvent,
} from '@packmind/types';
import { TelemetryEventRepository } from './TelemetryEventRepository';

type RedisMock = {
  multi: jest.Mock;
  lpush: jest.Mock;
  ltrim: jest.Mock;
  expire: jest.Mock;
  exec: jest.Mock;
  lrange: jest.Mock;
};

describe('TelemetryEventRepository', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  const buildEvent = (): TelemetryEvent => ({
    id: createTelemetryEventId('evt-1'),
    receivedAt: new Date('2026-05-06T10:00:00.000Z'),
    organizationId,
    userId,
    logRecordCount: 2,
    sizeBytes: 42,
    rawPayload: { resourceLogs: [] },
  });

  const buildRedisMock = (): RedisMock => {
    const mock: RedisMock = {
      multi: jest.fn(),
      lpush: jest.fn(),
      ltrim: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
      lrange: jest.fn().mockResolvedValue([]),
    };
    const chain = {
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mock.multi.mockReturnValue(chain);
    mock.lpush = chain.lpush;
    mock.ltrim = chain.ltrim;
    mock.expire = chain.expire;
    mock.exec = chain.exec;
    return mock;
  };

  it('lpushes a serialized event, trims, and sets a 14-day TTL', async () => {
    const redis = buildRedisMock();
    const repo = new TelemetryEventRepository(redis as unknown as never);

    await repo.pushBatch(buildEvent());

    expect(redis.multi).toHaveBeenCalledTimes(1);
    expect(redis.lpush).toHaveBeenCalledTimes(1);

    const [pushedKey, payload] = redis.lpush.mock.calls[0];
    expect(pushedKey).toBe(`telemetry:events:org:${organizationId}`);
    const parsed = JSON.parse(payload as string);
    expect(parsed.id).toBe('evt-1');
    expect(parsed.receivedAt).toBe('2026-05-06T10:00:00.000Z');

    expect(redis.ltrim).toHaveBeenCalledWith(
      `telemetry:events:org:${organizationId}`,
      0,
      999,
    );
    expect(redis.expire).toHaveBeenCalledWith(
      `telemetry:events:org:${organizationId}`,
      14 * 24 * 60 * 60,
    );
    expect(redis.exec).toHaveBeenCalledTimes(1);
  });

  it('listRecent returns deserialized events with Date receivedAt', async () => {
    const redis = buildRedisMock();
    const event = buildEvent();
    redis.lrange = jest
      .fn()
      .mockResolvedValue([
        JSON.stringify({
          ...event,
          receivedAt: event.receivedAt.toISOString(),
        }),
      ]);

    const client = {
      ...redis,
      lrange: redis.lrange,
    };

    const repo = new TelemetryEventRepository(client as unknown as never);
    const events = await repo.listRecent(organizationId, 50);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(event.id);
    expect(events[0].receivedAt).toBeInstanceOf(Date);
    expect(events[0].receivedAt.toISOString()).toBe(
      event.receivedAt.toISOString(),
    );
    expect(redis.lrange).toHaveBeenCalledWith(
      `telemetry:events:org:${organizationId}`,
      0,
      49,
    );
  });

  it('listRecent clamps limit to a sane range', async () => {
    const redis = buildRedisMock();
    redis.lrange = jest.fn().mockResolvedValue([]);
    const client = { ...redis, lrange: redis.lrange };
    const repo = new TelemetryEventRepository(client as unknown as never);

    await repo.listRecent(organizationId, 0);
    expect(redis.lrange).toHaveBeenLastCalledWith(expect.any(String), 0, 0);

    await repo.listRecent(organizationId, 99_999);
    expect(redis.lrange).toHaveBeenLastCalledWith(expect.any(String), 0, 999);
  });
});
