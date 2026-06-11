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

function renderTable(
  distributions: MarketplaceDistributionListItem[],
  outdatedPluginSlugs?: string[] | null,
) {
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
          outdatedPluginSlugs={outdatedPluginSlugs}
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

  it('shows the removal-pending badge and Cancel action once a removal is requested', () => {
    renderTable([
      makeDistribution({
        status: DistributionStatus.success,
        removalRequestedAt: new Date('2026-06-10T12:00:00Z'),
      }),
    ]);

    expect(
      screen.getByTestId('distribution-status-badge-removal_pending'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cancel removal of My Package/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove My Package/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the pending-PR-review badge for a pending_merge distribution', () => {
    renderTable([
      makeDistribution({ status: DistributionStatus.pending_merge }),
    ]);

    expect(
      screen.getByTestId(
        `distribution-status-badge-${DistributionStatus.pending_merge}`,
      ),
    ).toBeInTheDocument();
  });

  it('offers the Remove action for a pending_merge distribution', () => {
    renderTable([
      makeDistribution({ status: DistributionStatus.pending_merge }),
    ]);

    expect(
      screen.getByRole('button', { name: /Remove My Package/i }),
    ).toBeInTheDocument();
  });

  it('shows the Cancel action once a pending_merge removal is requested', () => {
    renderTable([
      makeDistribution({
        status: DistributionStatus.pending_merge,
        removalRequestedAt: new Date('2026-06-10T12:00:00Z'),
      }),
    ]);

    expect(
      screen.getByRole('button', { name: /Cancel removal of My Package/i }),
    ).toBeInTheDocument();
  });

  it('shows a dash instead of a publish date while the publish awaits merge', () => {
    renderTable([
      makeDistribution({ status: DistributionStatus.pending_merge }),
    ]);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the merge-confirmed date for a published distribution', () => {
    const publishConfirmedAt = new Date('2026-06-05T00:00:00Z');
    renderTable([
      makeDistribution({
        status: DistributionStatus.success,
        publishConfirmedAt,
      }),
    ]);

    expect(
      screen.getByText(publishConfirmedAt.toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it('counts pending publishes separately from published plugins', () => {
    renderTable([
      makeDistribution({ status: DistributionStatus.success }),
      makeDistribution({
        id: 'dist-2' as MarketplaceDistributionId,
        pluginSlug: 'plugin-two',
        status: DistributionStatus.pending_merge,
      }),
    ]);

    expect(
      screen.getByText('1 plugin published · 1 pending review'),
    ).toBeInTheDocument();
  });

  it('renders an Outdated badge on a row whose plugin is outdated', () => {
    renderTable(
      [makeDistribution({ status: DistributionStatus.success })],
      ['my-plugin'],
    );

    expect(
      screen.getByTestId('distribution-outdated-badge-my-plugin'),
    ).toBeInTheDocument();
  });

  it('only badges the matching row when several plugins are listed', () => {
    renderTable(
      [
        makeDistribution({ status: DistributionStatus.success }),
        makeDistribution({
          id: 'dist-2' as MarketplaceDistributionId,
          pluginSlug: 'plugin-two',
          status: DistributionStatus.success,
        }),
      ],
      ['my-plugin'],
    );

    expect(
      screen.getByTestId('distribution-outdated-badge-my-plugin'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('distribution-outdated-badge-plugin-two'),
    ).not.toBeInTheDocument();
  });

  it('appends the outdated count to the summary line', () => {
    renderTable(
      [
        makeDistribution({ status: DistributionStatus.success }),
        makeDistribution({
          id: 'dist-2' as MarketplaceDistributionId,
          pluginSlug: 'plugin-two',
          status: DistributionStatus.pending_merge,
        }),
      ],
      ['my-plugin'],
    );

    expect(
      screen.getByText('1 plugin published · 1 pending review · 1 outdated'),
    ).toBeInTheDocument();
  });

  it('renders no Outdated badge when no slugs are outdated', () => {
    renderTable([makeDistribution({ status: DistributionStatus.success })], []);

    expect(
      screen.queryByTestId('distribution-outdated-badge-my-plugin'),
    ).not.toBeInTheDocument();
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
