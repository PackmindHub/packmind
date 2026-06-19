import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type {
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
  SyncMarketplaceNowResponse,
} from '@packmind/types';
import { marketplaceGateway } from '../api/gateways';
import { marketplaceQueryKeys } from '../api/queries/MarketplaceQueries';
import { useRefreshMarketplacesOnOpen } from './useRefreshMarketplacesOnOpen';

jest.mock('../api/gateways', () => ({
  marketplaceGateway: {
    syncMarketplaceNow: jest.fn(),
  },
}));

const mockGateway = marketplaceGateway as unknown as {
  syncMarketplaceNow: jest.Mock;
};

const orgId = 'org-1' as OrganizationId;

const makeRow = (
  id: string,
  lastValidatedAt: Date | null,
): MarketplaceListItem =>
  ({
    id: id as MarketplaceId,
    state: 'healthy',
    lastValidatedAt,
    errorKind: null,
    errorDetail: null,
    pendingPrUrl: null,
    outdatedPluginSlugs: null,
  }) as unknown as MarketplaceListItem;

const okResponse = (
  state: SyncMarketplaceNowResponse['state'],
): SyncMarketplaceNowResponse => ({
  state,
  lastValidatedAt: new Date('2026-06-09T12:00:00Z'),
  errorKind: null,
  errorDetail: null,
  pendingPrUrl: null,
  outdatedPluginSlugs: null,
});

function createWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('useRefreshMarketplacesOnOpen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when rows are stale', () => {
    it('fires syncMarketplaceNow once per stale row', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const rows = [makeRow('m1', null), makeRow('m2', null)];
      const client = createClient();

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(2);
      });
    });

    it('patches the cached row with the reconcile result', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(
        okResponse('unreachable'),
      );
      const rows = [makeRow('m1', null)];
      const client = createClient();
      client.setQueryData(marketplaceQueryKeys.list(orgId), rows);

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        const cached = client.getQueryData<MarketplaceListItem[]>(
          marketplaceQueryKeys.list(orgId),
        );
        expect(cached?.[0].state).toBe('unreachable');
      });
    });

    it('clears refreshingIds once every row resolves', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const rows = [makeRow('m1', null), makeRow('m2', null)];
      const client = createClient();

      const { result } = renderHook(
        () => useRefreshMarketplacesOnOpen(orgId, rows),
        { wrapper: createWrapper(client) },
      );

      await waitFor(() => {
        expect(result.current.refreshingIds.size).toBe(0);
      });
    });
  });

  describe('when a row was validated within the freshness window', () => {
    it('does not refresh it', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const fresh = makeRow('fresh', new Date());
      const stale = makeRow('stale', null);
      const client = createClient();

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, [fresh, stale]), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(1);
      });
      expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledWith(
        orgId,
        'stale',
      );
    });
  });

  describe('when a row fails to refresh', () => {
    it('still clears refreshingIds for every row', async () => {
      mockGateway.syncMarketplaceNow.mockImplementation(
        (_org: OrganizationId, id: MarketplaceId) =>
          id === ('m1' as MarketplaceId)
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(okResponse('healthy')),
      );
      const rows = [makeRow('m1', null), makeRow('m2', null)];
      const client = createClient();

      const { result } = renderHook(
        () => useRefreshMarketplacesOnOpen(orgId, rows),
        { wrapper: createWrapper(client) },
      );

      await waitFor(() => {
        expect(result.current.refreshingIds.size).toBe(0);
      });
    });

    it('keeps draining the queue past the failing row', async () => {
      mockGateway.syncMarketplaceNow.mockImplementation(
        (_org: OrganizationId, id: MarketplaceId) =>
          id === ('m1' as MarketplaceId)
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(okResponse('healthy')),
      );
      const rows = Array.from({ length: 6 }, (_, i) => makeRow(`m${i}`, null));
      const client = createClient();

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(6);
      });
    });
  });

  describe('when the page unmounts mid-refresh', () => {
    it('does not fire reconcile requests for rows still in the queue', async () => {
      const resolvers: Array<() => void> = [];
      mockGateway.syncMarketplaceNow.mockImplementation(
        () =>
          new Promise<SyncMarketplaceNowResponse>((resolve) => {
            resolvers.push(() => resolve(okResponse('healthy')));
          }),
      );
      const rows = Array.from({ length: 10 }, (_, i) => makeRow(`m${i}`, null));
      const client = createClient();

      const { unmount } = renderHook(
        () => useRefreshMarketplacesOnOpen(orgId, rows),
        { wrapper: createWrapper(client) },
      );

      await waitFor(() => {
        expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(4);
      });

      unmount();
      resolvers.forEach((resolve) => resolve());
      // Give any (incorrect) queued drains a chance to fire before asserting.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(4);
    });
  });

  describe('when a refresh reports drift', () => {
    it('invalidates the list so drifted plugin slugs resync', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('drift'));
      const rows = [makeRow('m1', null)];
      const client = createClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: marketplaceQueryKeys.list(orgId),
        });
      });
    });

    it('does not invalidate the list for a healthy result', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const rows = [makeRow('m1', null)];
      const client = createClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const { result } = renderHook(
        () => useRefreshMarketplacesOnOpen(orgId, rows),
        { wrapper: createWrapper(client) },
      );

      await waitFor(() => {
        expect(result.current.refreshingIds.size).toBe(0);
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: marketplaceQueryKeys.list(orgId),
      });
    });
  });

  describe('after a successful refresh', () => {
    it('invalidates the per-marketplace distributions list', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const rows = [makeRow('m1', null)];
      const client = createClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: marketplaceQueryKeys.distributionList(
            orgId,
            'm1' as MarketplaceId,
          ),
        });
      });
    });

    it('invalidates the per-marketplace distribution-changes cache', async () => {
      mockGateway.syncMarketplaceNow.mockResolvedValue(okResponse('healthy'));
      const rows = [makeRow('m1', null)];
      const client = createClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: marketplaceQueryKeys.distributionChangesForMarketplace(
            orgId,
            'm1' as MarketplaceId,
          ),
        });
      });
    });
  });

  describe('when more rows than the concurrency cap need refreshing', () => {
    it('never exceeds the max in-flight requests', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      mockGateway.syncMarketplaceNow.mockImplementation(() => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise<SyncMarketplaceNowResponse>((resolve) => {
          setTimeout(() => {
            inFlight -= 1;
            resolve(okResponse('healthy'));
          }, 5);
        });
      });
      const rows = Array.from({ length: 10 }, (_, i) => makeRow(`m${i}`, null));
      const client = createClient();

      renderHook(() => useRefreshMarketplacesOnOpen(orgId, rows), {
        wrapper: createWrapper(client),
      });

      await waitFor(() => {
        expect(mockGateway.syncMarketplaceNow).toHaveBeenCalledTimes(10);
      });
      expect(maxInFlight).toBeLessThanOrEqual(4);
    });
  });
});
