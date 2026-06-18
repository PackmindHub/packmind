import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createGitProviderId,
  type MarketplaceId,
  type MarketplaceListItem,
} from '@packmind/types';
import { MarketplacesIndex } from './MarketplacesIndex';

const buildMarketplace = (
  overrides: Partial<MarketplaceListItem> = {},
): MarketplaceListItem => ({
  id: 'mkt-1' as MarketplaceId,
  organizationId: 'org-1' as MarketplaceListItem['organizationId'],
  gitRepoId: 'repo-1' as MarketplaceListItem['gitRepoId'],
  name: 'Acme Playbook',
  vendor: 'anthropic',
  addedBy: 'user-1' as MarketplaceListItem['addedBy'],
  linkedAt: new Date('2026-04-01T10:00:00.000Z'),
  state: 'healthy',
  lastValidatedAt: new Date(Date.now() - 30 * 60 * 1000),
  descriptor: {
    vendor: 'anthropic',
    name: 'Acme Playbook',
    plugins: [],
    raw: {},
  },
  pluginCount: 7,
  errorKind: null,
  errorDetail: null,
  pendingPrUrl: null,
  outdatedPluginSlugs: null,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  deletedAt: null,
  addedByUserName: 'Jane Admin',
  repository: {
    gitProviderId: createGitProviderId('provider-1'),
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerSource: 'github',
    url: 'https://github.com/acme/plugins',
  },
  ...overrides,
});

describe('MarketplacesIndex', () => {
  const renderIndex = (props: {
    marketplaces?: MarketplaceListItem[];
    isLoading?: boolean;
    refreshingIds?: ReadonlySet<MarketplaceId>;
  }) =>
    render(
      <UIProvider>
        <MarketplacesIndex
          marketplaces={props.marketplaces ?? []}
          isLoading={props.isLoading ?? false}
          refreshingIds={props.refreshingIds}
          onUnlink={jest.fn()}
        />
      </UIProvider>,
    );

  it('renders the loading state when isLoading is true', () => {
    renderIndex({ isLoading: true });

    expect(screen.getByText('Loading marketplaces')).toBeInTheDocument();
  });

  it('renders the empty state when there are no marketplaces', () => {
    renderIndex({ marketplaces: [] });

    expect(screen.getByText('Link your first marketplace')).toBeInTheDocument();
  });

  it('renders the marketplaces table with a row per marketplace', () => {
    renderIndex({
      marketplaces: [
        buildMarketplace({
          id: 'mkt-1' as MarketplaceId,
          name: 'Acme Playbook',
          descriptor: {
            vendor: 'anthropic',
            name: 'Acme Playbook',
            plugins: [],
            raw: {},
          },
        }),
        buildMarketplace({
          id: 'mkt-2' as MarketplaceId,
          name: 'Globex Recipes',
          descriptor: {
            vendor: 'anthropic',
            name: 'Globex Recipes',
            plugins: [],
            raw: {},
          },
        }),
      ],
    });

    expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
    expect(screen.getByText('Globex Recipes')).toBeInTheDocument();
    expect(screen.getByText('2 marketplaces linked')).toBeInTheDocument();
  });

  it('uses the singular noun when only one marketplace is linked', () => {
    renderIndex({
      marketplaces: [buildMarketplace()],
    });

    expect(screen.getByText('1 marketplace linked')).toBeInTheDocument();
  });

  describe('when a row is refreshing on open', () => {
    it('renders the checking indicator only for the refreshing row', () => {
      renderIndex({
        marketplaces: [
          buildMarketplace({ id: 'mkt-1' as MarketplaceId }),
          buildMarketplace({ id: 'mkt-2' as MarketplaceId }),
        ],
        refreshingIds: new Set(['mkt-1' as MarketplaceId]),
      });

      expect(screen.getAllByLabelText('Checking marketplace')).toHaveLength(1);
    });
  });
});
