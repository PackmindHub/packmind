import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createTelemetryEventId,
  createUserId,
  IAccountsPort,
  Organization,
  TelemetryEvent,
  User,
} from '@packmind/types';
import { ITelemetryEventRepository } from '../../../domain/repositories/ITelemetryEventRepository';
import {
  ListRecentTelemetryEventsUseCase,
  MAX_LIST_LIMIT,
} from './ListRecentTelemetryEventsUseCase';

describe('ListRecentTelemetryEventsUseCase', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('org-id');

  const buildAccountsPort = (): IAccountsPort =>
    ({
      getUserById: jest.fn().mockResolvedValue({
        id: userId,
        email: 'm@t.com',
        displayName: null,
        passwordHash: null,
        active: true,
        trial: false,
        memberships: [{ userId, organizationId, role: 'member' }],
      } as User),
      getOrganizationById: jest.fn().mockResolvedValue({
        id: organizationId,
        name: 'Org',
        slug: 'org',
      } as Organization),
    }) as unknown as IAccountsPort;

  const sampleEvent = (): TelemetryEvent => ({
    id: createTelemetryEventId('evt-1'),
    receivedAt: new Date('2026-05-06T10:00:00.000Z'),
    organizationId,
    userId,
    logRecordCount: 3,
    sizeBytes: 120,
    rawPayload: { resourceLogs: [] },
  });

  it('returns events from the repository', async () => {
    const repo: jest.Mocked<ITelemetryEventRepository> = {
      pushBatch: jest.fn(),
      listRecent: jest.fn().mockResolvedValue([sampleEvent()]),
    };
    const useCase = new ListRecentTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    const result = await useCase.execute({ userId, organizationId, limit: 10 });

    expect(result.events).toHaveLength(1);
    expect(repo.listRecent).toHaveBeenCalledWith(organizationId, 10);
  });

  it('caps the limit at MAX_LIST_LIMIT', async () => {
    const repo: jest.Mocked<ITelemetryEventRepository> = {
      pushBatch: jest.fn(),
      listRecent: jest.fn().mockResolvedValue([]),
    };
    const useCase = new ListRecentTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    await useCase.execute({ userId, organizationId, limit: 999_999 });

    expect(repo.listRecent).toHaveBeenCalledWith(
      organizationId,
      MAX_LIST_LIMIT,
    );
  });

  it('falls back to default for non-positive limits', async () => {
    const repo: jest.Mocked<ITelemetryEventRepository> = {
      pushBatch: jest.fn(),
      listRecent: jest.fn().mockResolvedValue([]),
    };
    const useCase = new ListRecentTelemetryEventsUseCase(
      buildAccountsPort(),
      repo,
      stubLogger(),
    );

    await useCase.execute({ userId, organizationId, limit: 0 });

    expect(repo.listRecent).toHaveBeenCalledWith(organizationId, 50);
  });
});
