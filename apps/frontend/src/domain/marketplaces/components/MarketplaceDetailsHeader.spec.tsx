import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import type {
  MarketplaceId,
  MarketplaceListItem,
  MarketplaceState,
} from '@packmind/types';
import { MarketplaceDetailsHeader } from './MarketplaceDetailsHeader';

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
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    deletedAt: null,
    addedByUserName: 'Jane Admin',
    ...overrides,
  };
}

describe('MarketplaceDetailsHeader', () => {
  const renderHeader = (marketplace: MarketplaceListItem) =>
    render(
      <UIProvider>
        <MarketplaceDetailsHeader marketplace={marketplace} />
      </UIProvider>,
    );

  it('shows the marketplace name, vendor and state badge', () => {
    renderHeader(makeMarketplace({ state: 'healthy' }));

    expect(screen.getByText('Acme Playbook')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(
      screen.getByTestId('marketplace-state-badge-healthy'),
    ).toBeInTheDocument();
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
});
