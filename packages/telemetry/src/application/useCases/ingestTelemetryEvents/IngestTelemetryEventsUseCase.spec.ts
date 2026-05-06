import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  TelemetryEvent,
  User,
} from '@packmind/types';
import { ITelemetryEventRepository } from '../../../domain/repositories/ITelemetryEventRepository';
import {
  describePayload,
  IngestTelemetryEventsUseCase,
  InvalidTelemetryPayloadError,
  MAX_LOG_RECORDS_PER_BATCH,
  TelemetryPayloadTooLargeError,
} from './IngestTelemetryEventsUseCase';

describe('IngestTelemetryEventsUseCase', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('org-id');

  const buildUser = (): User =>
    ({
      id: userId,
      email: 'member@test.com',
      displayName: null,
      passwordHash: null,
      active: true,
      trial: false,
      memberships: [{ userId, organizationId, role: 'member' }],
    }) as User;

  const buildOrganization = (): Organization =>
    ({
      id: organizationId,
      name: 'Org',
      slug: 'org',
    }) as Organization;

  const buildAccountsPort = (): IAccountsPort =>
    ({
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
    }) as unknown as IAccountsPort;

  const buildRepository = (): jest.Mocked<ITelemetryEventRepository> => ({
    pushBatch: jest.fn().mockResolvedValue(undefined),
    listRecent: jest.fn().mockResolvedValue([]),
  });

  it('persists a batch and returns the accepted record count', async () => {
    const repo = buildRepository();
    const useCase = new IngestTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    const rawPayload = {
      resourceLogs: [
        {
          scopeLogs: [
            { logRecords: [{ body: 'a' }, { body: 'b' }] },
            { logRecords: [{ body: 'c' }] },
          ],
        },
        {
          scopeLogs: [{ logRecords: [{ body: 'd' }] }],
        },
      ],
    };

    const result = await useCase.execute({
      userId,
      organizationId,
      rawPayload,
    });

    expect(result.acceptedRecords).toBe(4);
    expect(repo.pushBatch).toHaveBeenCalledTimes(1);

    const persisted = repo.pushBatch.mock.calls[0][0] as TelemetryEvent;
    expect(persisted.organizationId).toBe(organizationId);
    expect(persisted.userId).toBe(userId);
    expect(persisted.logRecordCount).toBe(4);
    expect(persisted.sizeBytes).toBeGreaterThan(0);
    expect(persisted.rawPayload).toEqual(rawPayload);
    expect(persisted.id).toBeDefined();
  });

  it('rejects payloads that are not objects', async () => {
    const repo = buildRepository();
    const useCase = new IngestTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    await expect(
      useCase.execute({ userId, organizationId, rawPayload: 'not an object' }),
    ).rejects.toBeInstanceOf(InvalidTelemetryPayloadError);

    expect(repo.pushBatch).not.toHaveBeenCalled();
  });

  it('rejects payloads exceeding the max log record count', async () => {
    const logRecords = new Array(MAX_LOG_RECORDS_PER_BATCH + 1).fill({
      body: 'x',
    });
    const rawPayload = {
      resourceLogs: [{ scopeLogs: [{ logRecords }] }],
    };

    const repo = buildRepository();
    const useCase = new IngestTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    await expect(
      useCase.execute({ userId, organizationId, rawPayload }),
    ).rejects.toBeInstanceOf(TelemetryPayloadTooLargeError);
    expect(repo.pushBatch).not.toHaveBeenCalled();
  });

  it('accepts an OTLP body with no resourceLogs (count = 0)', async () => {
    const repo = buildRepository();
    const useCase = new IngestTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    const result = await useCase.execute({
      userId,
      organizationId,
      rawPayload: {},
    });

    expect(result.acceptedRecords).toBe(0);
    expect(repo.pushBatch).toHaveBeenCalledTimes(1);
  });

  describe('describePayload', () => {
    it('counts log records across resourceLogs and scopeLogs', () => {
      const result = describePayload({
        resourceLogs: [
          { scopeLogs: [{ logRecords: [{}, {}] }] },
          { scopeLogs: [{ logRecords: [{}] }, { logRecords: [{}, {}, {}] }] },
        ],
      });
      expect(result.logRecordCount).toBe(6);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it('rejects malformed resourceLogs', () => {
      expect(() => describePayload({ resourceLogs: 'oops' })).toThrow(
        InvalidTelemetryPayloadError,
      );
    });
  });
});
