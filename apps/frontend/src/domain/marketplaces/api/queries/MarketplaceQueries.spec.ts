import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type {
  CancelPluginRemovalResponse,
  ListMarketplaceDistributionsResponse,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  MarkPluginForRemovalResponse,
  OrganizationId,
  PackageId,
} from '@packmind/types';
import { marketplaceGateway } from '../gateways';
import {
  marketplaceQueries,
  marketplaceQueryKeys,
  useCancelPluginRemoval,
  useMarkPluginForRemovalByDistribution,
  useMarkPluginForRemovalByPackage,
} from './MarketplaceQueries';

jest.mock('../gateways', () => ({
  marketplaceGateway: {
    listMarketplaces: jest.fn(),
    linkMarketplace: jest.fn(),
    unlinkMarketplace: jest.fn(),
    validateMarketplaceUrl: jest.fn(),
    listDistributions: jest.fn(),
    markPluginForRemovalByDistribution: jest.fn(),
    markPluginForRemovalByPackage: jest.fn(),
    cancelPluginRemoval: jest.fn(),
  },
}));

const mockGateway = marketplaceGateway as unknown as {
  listMarketplaces: jest.Mock;
  linkMarketplace: jest.Mock;
  unlinkMarketplace: jest.Mock;
  validateMarketplaceUrl: jest.Mock;
  listDistributions: jest.Mock;
  markPluginForRemovalByDistribution: jest.Mock;
  markPluginForRemovalByPackage: jest.Mock;
  cancelPluginRemoval: jest.Mock;
};

const orgId = 'org-1' as OrganizationId;
const marketplaceId = 'mkt-1' as MarketplaceId;
const distributionId = 'dist-1' as MarketplaceDistributionId;
const packageId = 'pkg-1' as PackageId;

const stubDistribution: MarketplaceDistribution = {
  id: distributionId,
  organizationId: orgId,
  marketplaceId,
  packageId,
  pluginSlug: 'plugin-slug',
  authorId: 'user-1' as MarketplaceDistribution['authorId'],
  status: 'to_be_removed' as MarketplaceDistribution['status'],
  source: 'manual' as MarketplaceDistribution['source'],
  createdAt: new Date('2026-04-01T00:00:00Z'),
  updatedAt: new Date('2026-04-01T00:00:00Z'),
  deletedAt: null,
};

const stubMarkResponse: MarkPluginForRemovalResponse = {
  distribution: stubDistribution,
};

const stubCancelResponse: CancelPluginRemovalResponse = {
  distribution: { ...stubDistribution, status: 'success' as never },
};

const stubListResponse: ListMarketplaceDistributionsResponse = [];

function createWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('marketplaceQueryKeys.distributions', () => {
  it('nests the distributions key under the marketplaces scope', () => {
    const key = marketplaceQueryKeys.distributions();
    const all = marketplaceQueryKeys.all();
    expect(key.slice(0, all.length)).toEqual([...all]);
  });

  it('produces a unique key per (orgId, marketplaceId) pair', () => {
    const a = marketplaceQueryKeys.distributionList(orgId, marketplaceId);
    const b = marketplaceQueryKeys.distributionList(
      orgId,
      'other-mkt' as MarketplaceId,
    );
    expect(a).not.toEqual(b);
  });
});

describe('marketplaceQueries.distributions', () => {
  it('uses the distributionList query key and calls listDistributions', () => {
    const options = marketplaceQueries.distributions({
      orgId,
      marketplaceId,
    });
    expect(options.queryKey).toEqual(
      marketplaceQueryKeys.distributionList(orgId, marketplaceId),
    );
  });

  describe('when orgId is missing', () => {
    it('is disabled', () => {
      const options = marketplaceQueries.distributions({
        orgId: '',
        marketplaceId,
      });
      expect(options.enabled).toBe(false);
    });
  });
});

describe('useMarkPluginForRemovalByDistribution', () => {
  beforeEach(() => {
    mockGateway.markPluginForRemovalByDistribution.mockResolvedValue(
      stubMarkResponse,
    );
    mockGateway.listDistributions.mockResolvedValue(stubListResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the gateway with the right arguments', async () => {
    const client = createClient();
    const { result } = renderHook(
      () => useMarkPluginForRemovalByDistribution(orgId, marketplaceId),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync(distributionId);
    });

    expect(mockGateway.markPluginForRemovalByDistribution).toHaveBeenCalledWith(
      orgId,
      marketplaceId,
      distributionId,
    );
  });

  it('invalidates the distributions query key on success', async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useMarkPluginForRemovalByDistribution(orgId, marketplaceId),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync(distributionId);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: marketplaceQueryKeys.distributions(),
      });
    });
  });
});

describe('useMarkPluginForRemovalByPackage', () => {
  beforeEach(() => {
    mockGateway.markPluginForRemovalByPackage.mockResolvedValue(
      stubMarkResponse,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates the distributions key and the package detail keys', async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useMarkPluginForRemovalByPackage(orgId, marketplaceId),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync(packageId);
    });

    expect(mockGateway.markPluginForRemovalByPackage).toHaveBeenCalledWith(
      orgId,
      marketplaceId,
      packageId,
    );

    await waitFor(() => {
      const calls = invalidateSpy.mock.calls.map(([arg]) => arg);
      const hasDistributions = calls.some(
        (arg) =>
          JSON.stringify(arg?.queryKey) ===
          JSON.stringify(marketplaceQueryKeys.distributions()),
      );
      const hasPackageDetailInvalidation = calls.some((arg) => {
        const key = arg?.queryKey;
        return (
          Array.isArray(key) && key.includes(packageId as unknown as string)
        );
      });
      expect(hasDistributions).toBe(true);
      expect(hasPackageDetailInvalidation).toBe(true);
    });
  });
});

describe('useCancelPluginRemoval', () => {
  beforeEach(() => {
    mockGateway.cancelPluginRemoval.mockResolvedValue(stubCancelResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the gateway and invalidates distributions on success', async () => {
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useCancelPluginRemoval(orgId, marketplaceId),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync(distributionId);
    });

    expect(mockGateway.cancelPluginRemoval).toHaveBeenCalledWith(
      orgId,
      marketplaceId,
      distributionId,
    );
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: marketplaceQueryKeys.distributions(),
      });
    });
  });
});
