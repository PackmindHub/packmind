import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  MarketplaceId,
  MarketplaceListItem,
  MarketplaceState,
  OrganizationId,
} from '@packmind/types';
import { MarketplaceDetailsHeader } from './MarketplaceDetailsHeader';

const orgId = 'org-1' as OrganizationId;

function makeMarketplace(
  overrides: Partial<MarketplaceListItem> = {},
): MarketplaceListItem {
  return {
    id: 'mkt-1' as MarketplaceId,
    organizationId: 'org-1' as MarketplaceListItem['organizationId'],
    gitRepoId: 'repo-1' as MarketplaceListItem['gitRepoId'],
    name: 'Acme Playbook',
    vendor: 'anthropic',
    addedBy: 'user-1' as MarketplaceListItem['addedBy'],
    linkedAt: new Date('2026-04-01T10:00:00.000Z'),
    state: 'healthy' as MarketplaceState,
    lastValidatedAt: new Date('2026-04-01T11:00:00.000Z'),
    descriptor: {
      vendor: 'anthropic',
      name: 'Acme Playbook',
      plugins: [],
      raw: {},
    },
    pluginCount: 5,
    errorKind: null,
    errorDetail: null,
    pendingPrUrl: null,
    outdatedPluginSlugs: null,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    deletedAt: null,
    addedByUserName: 'Jane Admin',
    ...overrides,
  };
}

describe('MarketplaceDetailsHeader', () => {
  const renderHeader = (marketplace: MarketplaceListItem) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <UIProvider>
          <MarketplaceDetailsHeader
            organizationId={orgId}
            marketplace={marketplace}
          />
        </UIProvider>
      </QueryClientProvider>,
    );
  };

  it('shows the marketplace name, vendor and state badge', () => {
    renderHeader(makeMarketplace({ state: 'healthy' }));

    expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(
      screen.getByTestId('marketplace-state-badge-healthy'),
    ).toBeInTheDocument();
  });

  it('renders the Sync now action', () => {
    renderHeader(makeMarketplace({ state: 'healthy' }));
    expect(screen.getByTestId('marketplace-sync-now')).toBeInTheDocument();
  });

  it('hides the drift panel when the marketplace is healthy', () => {
    renderHeader(makeMarketplace({ state: 'healthy' }));
    expect(screen.queryByTestId('marketplace-drift-panel')).toBeNull();
  });

  it('shows the drift panel listing the offending plugin slugs when state=drift', () => {
    renderHeader(
      makeMarketplace({
        state: 'drift',
        descriptor: {
          vendor: 'anthropic',
          name: 'Acme Playbook',
          plugins: [],
          raw: {},
          driftedPluginSlugs: ['orphan-plugin', 'another-drift'],
        },
      }),
    );

    expect(screen.getByTestId('marketplace-drift-panel')).toBeInTheDocument();
    expect(
      screen.getByTestId('marketplace-drift-slug-orphan-plugin'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('marketplace-drift-slug-another-drift'),
    ).toBeInTheDocument();
  });

  it('does not render the drift panel when drift list is empty', () => {
    renderHeader(
      makeMarketplace({
        state: 'drift',
        descriptor: {
          vendor: 'anthropic',
          name: 'Acme Playbook',
          plugins: [],
          raw: {},
        },
      }),
    );

    expect(screen.queryByTestId('marketplace-drift-panel')).toBeNull();
  });

  describe('pending sync PR panel', () => {
    it('renders a link to the open pull request when one is pending', () => {
      renderHeader(
        makeMarketplace({
          pendingPrUrl: 'https://github.com/acme/plugins/pull/9',
        }),
      );

      const panel = screen.getByTestId('marketplace-pending-pr-panel');
      expect(panel).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Review the pull request' }),
      ).toHaveAttribute('href', 'https://github.com/acme/plugins/pull/9');
    });

    it('is absent when there is no pending PR', () => {
      renderHeader(makeMarketplace({ pendingPrUrl: null }));
      expect(screen.queryByTestId('marketplace-pending-pr-panel')).toBeNull();
    });
  });

  describe('outdated plugins panel', () => {
    it('lists each outdated plugin slug', () => {
      renderHeader(
        makeMarketplace({ outdatedPluginSlugs: ['plugin-a', 'plugin-b'] }),
      );

      expect(
        screen.getByTestId('marketplace-outdated-panel'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('marketplace-outdated-slug-plugin-a'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('marketplace-outdated-slug-plugin-b'),
      ).toBeInTheDocument();
    });

    it('is absent when there are no outdated plugins', () => {
      renderHeader(makeMarketplace({ outdatedPluginSlugs: null }));
      expect(screen.queryByTestId('marketplace-outdated-panel')).toBeNull();
    });
  });
});
