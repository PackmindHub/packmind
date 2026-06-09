import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createMarketplaceId,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Marketplace,
  MarketplaceNotFoundError,
  Organization,
  User,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';
import { SyncMarketplaceNowUseCase } from './SyncMarketplaceNowUseCase';

describe('SyncMarketplaceNowUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const lastValidatedAt = new Date('2026-06-04T10:00:00.000Z');

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    name: 'ACME Plugins',
  } as unknown as Marketplace;

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    displayName: 'Member User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockReconciliationJob: jest.Mocked<
    Pick<MarketplaceReconciliationDelayedJob, 'reconcileNow'>
  >;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: SyncMarketplaceNowUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockReconciliationJob = {
      reconcileNow: jest.fn().mockResolvedValue({
        state: 'healthy',
        lastValidatedAt,
        errorKind: null,
        errorDetail: null,
        pendingPrUrl: null,
        outdatedPluginSlugs: null,
      }),
    };

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new SyncMarketplaceNowUseCase(
      mockMarketplaceRepository,
      mockReconciliationJob as unknown as MarketplaceReconciliationDelayedJob,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('member happy path', () => {
    let response: Awaited<ReturnType<SyncMarketplaceNowUseCase['execute']>>;

    beforeEach(async () => {
      response = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
      });
    });

    it('runs reconciliation for the requested marketplace', () => {
      expect(mockReconciliationJob.reconcileNow).toHaveBeenCalledWith(
        marketplaceId,
      );
    });

    it('returns the reconciled state', () => {
      expect(response.state).toBe('healthy');
    });

    it('returns the validation timestamp', () => {
      expect(response.lastValidatedAt).toEqual(lastValidatedAt);
    });
  });

  describe('freshness window', () => {
    describe('when the marketplace was validated within the window', () => {
      let response: Awaited<ReturnType<SyncMarketplaceNowUseCase['execute']>>;

      beforeEach(async () => {
        mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue({
          ...existingMarketplace,
          state: 'unreachable',
          lastValidatedAt: new Date(),
          errorKind: 'auth_failed',
          errorDetail: 'creds expired',
          pendingPrUrl: null,
          outdatedPluginSlugs: ['x'],
        } as unknown as Marketplace);
        response = await useCase.execute({
          userId,
          organizationId,
          marketplaceId,
        });
      });

      it('does not run reconciliation', () => {
        expect(mockReconciliationJob.reconcileNow).not.toHaveBeenCalled();
      });

      it('returns the row state without re-fetching', () => {
        expect(response.state).toBe('unreachable');
      });

      it('returns the row errorKind without re-fetching', () => {
        expect(response.errorKind).toBe('auth_failed');
      });
    });

    describe('when the marketplace validation is stale', () => {
      beforeEach(async () => {
        mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue({
          ...existingMarketplace,
          lastValidatedAt: new Date('2020-01-01T00:00:00.000Z'),
        } as unknown as Marketplace);
        await useCase.execute({ userId, organizationId, marketplaceId });
      });

      it('runs reconciliation', () => {
        expect(mockReconciliationJob.reconcileNow).toHaveBeenCalledWith(
          marketplaceId,
        );
      });
    });
  });

  describe('when the marketplace is not found', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(
        useCase.execute({ userId, organizationId, marketplaceId }),
      ).rejects.toBeInstanceOf(MarketplaceNotFoundError);
    });

    it('does not run reconciliation', async () => {
      await useCase
        .execute({ userId, organizationId, marketplaceId })
        .catch(() => {
          /* expected */
        });
      expect(mockReconciliationJob.reconcileNow).not.toHaveBeenCalled();
    });
  });
});
