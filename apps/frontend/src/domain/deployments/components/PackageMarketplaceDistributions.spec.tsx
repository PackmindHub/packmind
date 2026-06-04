import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistributionStatus } from '@packmind/types';
import type {
  MarketplaceDistributionId,
  MarketplaceDistributionListItem,
  MarketplaceId,
  MarketplaceListItem,
  OrganizationId,
  PackageId,
} from '@packmind/types';
import { PackageMarketplaceDistributions } from './PackageMarketplaceDistributions';

const orgId = 'org-1' as OrganizationId;
const packageId = 'pkg-1' as PackageId;

const useMarketplacesMock = jest.fn();
const useMarketplaceDistributionsMock = jest.fn();
const useMarkPluginForRemovalByPackageMock = jest.fn();

jest.mock('../../marketplaces/api/queries', () => ({
  useMarketplaces: (...args: unknown[]) => useMarketplacesMock(...args),
  useMarketplaceDistributions: (...args: unknown[]) =>
    useMarketplaceDistributionsMock(...args),
  useMarkPluginForRemovalByPackage: (...args: unknown[]) =>
    useMarkPluginForRemovalByPackageMock(...args),
}));

function makeMarketplace(
  overrides: Partial<MarketplaceListItem> = {},
): MarketplaceListItem {
  return {
    id: 'mkt-1' as MarketplaceId,
    organizationId: orgId,
    gitRepoId: 'repo-1' as MarketplaceListItem['gitRepoId'],
    name: 'Acme Playbook',
    vendor: 'anthropic',
    addedBy: 'user-1' as MarketplaceListItem['addedBy'],
    linkedAt: new Date('2026-04-01T00:00:00Z'),
    state: 'healthy',
    lastValidatedAt: null,
    descriptor: {
      vendor: 'anthropic',
      name: 'Acme Playbook',
      plugins: [],
      raw: {},
    },
    pluginCount: 1,
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    deletedAt: null,
    addedByUserName: 'Jane',
    ...overrides,
  };
}

function makeDistribution(
  overrides: Partial<MarketplaceDistributionListItem> = {},
): MarketplaceDistributionListItem {
  return {
    id: 'dist-1' as MarketplaceDistributionId,
    organizationId: orgId,
    marketplaceId: 'mkt-1' as MarketplaceId,
    packageId,
    pluginSlug: 'my-plugin',
    authorId: 'user-1' as MarketplaceDistributionListItem['authorId'],
    status: DistributionStatus.success,
    source: 'manual' as MarketplaceDistributionListItem['source'],
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    deletedAt: null,
    packageName: 'My Package',
    authorName: 'Jane',
    ...overrides,
  };
}

function renderComponent() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <PackageMarketplaceDistributions
          organizationId={orgId}
          packageId={packageId}
        />
      </QueryClientProvider>
    </UIProvider>,
  );
}

describe('PackageMarketplaceDistributions', () => {
  beforeEach(() => {
    useMarkPluginForRemovalByPackageMock.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows an empty state when the org has no marketplaces', () => {
    useMarketplacesMock.mockReturnValue({ data: [], isLoading: false });

    renderComponent();

    expect(
      screen.getByText('Not published to any marketplace'),
    ).toBeInTheDocument();
  });

  it('renders a row for each marketplace where the package is published', () => {
    useMarketplacesMock.mockReturnValue({
      data: [makeMarketplace()],
      isLoading: false,
    });
    useMarketplaceDistributionsMock.mockReturnValue({
      data: [makeDistribution()],
      isLoading: false,
    });

    renderComponent();

    expect(
      screen.getByTestId('package-marketplace-row-mkt-1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
  });

  it('skips marketplaces where the package has no active distribution', () => {
    useMarketplacesMock.mockReturnValue({
      data: [makeMarketplace()],
      isLoading: false,
    });
    useMarketplaceDistributionsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderComponent();

    expect(screen.queryByTestId('package-marketplace-row-mkt-1')).toBeNull();
  });
});
