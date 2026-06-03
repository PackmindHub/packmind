import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistributionStatus } from '@packmind/types';
import type {
  MarketplaceDistributionId,
  MarketplaceDistributionListItem,
  MarketplaceId,
  OrganizationId,
  PackageId,
} from '@packmind/types';
import { MarketplaceDistributionsTable } from './MarketplaceDistributionsTable';

const orgId = 'org-1' as OrganizationId;
const marketplaceId = 'mkt-1' as MarketplaceId;

const useMarketplaceDistributionsMock = jest.fn();
const markMutationMock = jest.fn();
const cancelMutationMock = jest.fn();

jest.mock('../api/queries', () => ({
  useMarketplaceDistributions: (...args: unknown[]) =>
    useMarketplaceDistributionsMock(...args),
  useMarkPluginForRemovalByDistribution: () => ({
    mutate: markMutationMock,
    isPending: false,
    variables: undefined,
  }),
  useCancelPluginRemoval: () => ({
    mutate: cancelMutationMock,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'tester@packmind.com' },
    organization: undefined,
  }),
}));

function makeDistribution(
  overrides: Partial<MarketplaceDistributionListItem> = {},
): MarketplaceDistributionListItem {
  return {
    id: 'dist-1' as MarketplaceDistributionId,
    organizationId: orgId,
    marketplaceId,
    packageId: 'pkg-1' as PackageId,
    pluginSlug: 'my-plugin',
    authorId: 'user-1' as MarketplaceDistributionListItem['authorId'],
    status: DistributionStatus.success,
    source: 'manual' as MarketplaceDistributionListItem['source'],
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    deletedAt: null,
    packageName: 'My Package',
    authorName: 'Jane Doe',
    ...overrides,
  };
}

function renderTable(distributions: MarketplaceDistributionListItem[]) {
  useMarketplaceDistributionsMock.mockReturnValue({
    data: distributions,
    isLoading: false,
  });

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <MarketplaceDistributionsTable
          organizationId={orgId}
          marketplaceId={marketplaceId}
          marketplaceName="Acme Playbook"
        />
      </QueryClientProvider>
    </UIProvider>,
  );
}

describe('MarketplaceDistributionsTable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows an empty state when the list is empty', () => {
    renderTable([]);
    expect(screen.getByText('No plugins published yet')).toBeInTheDocument();
  });

  it('renders a row per distribution with status badge', () => {
    renderTable([
      makeDistribution({ status: DistributionStatus.success }),
      makeDistribution({
        id: 'dist-2' as MarketplaceDistributionId,
        pluginSlug: 'plugin-two',
        status: DistributionStatus.to_be_removed,
      }),
      makeDistribution({
        id: 'dist-3' as MarketplaceDistributionId,
        pluginSlug: 'plugin-three',
        status: DistributionStatus.removed,
      }),
    ]);

    expect(
      screen.getByTestId(
        `distribution-status-badge-${DistributionStatus.success}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `distribution-status-badge-${DistributionStatus.to_be_removed}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        `distribution-status-badge-${DistributionStatus.removed}`,
      ),
    ).toBeInTheDocument();
  });

  it('shows the Remove action for a published distribution when the feature flag is enabled', () => {
    renderTable([makeDistribution({ status: DistributionStatus.success })]);

    expect(
      screen.getByRole('button', { name: /Remove My Package/i }),
    ).toBeInTheDocument();
  });

  it('shows a loading state while the query is pending', () => {
    useMarketplaceDistributionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <UIProvider>
        <QueryClientProvider client={client}>
          <MarketplaceDistributionsTable
            organizationId={orgId}
            marketplaceId={marketplaceId}
          />
        </QueryClientProvider>
      </UIProvider>,
    );

    expect(screen.getByText('Loading distributions')).toBeInTheDocument();
  });
});
