import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';

describe('MarketplaceStateBadge', () => {
  const renderBadge = (state: 'healthy' | 'drift' | 'unreachable') =>
    render(
      <UIProvider>
        <MarketplaceStateBadge state={state} />
      </UIProvider>,
    );

  it('renders the healthy label with the green palette', () => {
    renderBadge('healthy');

    expect(
      screen.getByTestId('marketplace-state-badge-healthy'),
    ).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders the drift label with the orange palette', () => {
    renderBadge('drift');

    expect(
      screen.getByTestId('marketplace-state-badge-drift'),
    ).toBeInTheDocument();
    expect(screen.getByText('Drift')).toBeInTheDocument();
  });

  it('renders the unreachable label with the red palette', () => {
    renderBadge('unreachable');

    expect(
      screen.getByTestId('marketplace-state-badge-unreachable'),
    ).toBeInTheDocument();
    expect(screen.getByText('Unreachable')).toBeInTheDocument();
  });

  it('still renders the drift badge when drifted plugin slugs are provided', () => {
    render(
      <UIProvider>
        <MarketplaceStateBadge
          state="drift"
          driftedPluginSlugs={['orphan-plugin', 'another-drift']}
        />
      </UIProvider>,
    );

    expect(
      screen.getByTestId('marketplace-state-badge-drift'),
    ).toBeInTheDocument();
    expect(screen.getByText('Drift')).toBeInTheDocument();
  });

  it('renders the drift badge when drifted plugin slugs is empty', () => {
    render(
      <UIProvider>
        <MarketplaceStateBadge state="drift" driftedPluginSlugs={[]} />
      </UIProvider>,
    );

    expect(
      screen.getByTestId('marketplace-state-badge-drift'),
    ).toBeInTheDocument();
  });

  describe('when unreachable with a typed errorKind', () => {
    it('labels an auth failure "Auth error"', () => {
      render(
        <UIProvider>
          <MarketplaceStateBadge state="unreachable" errorKind="auth_failed" />
        </UIProvider>,
      );

      expect(screen.getByText('Auth error')).toBeInTheDocument();
    });

    it('labels a missing repo "Repo not found"', () => {
      render(
        <UIProvider>
          <MarketplaceStateBadge
            state="unreachable"
            errorKind="repo_not_found"
          />
        </UIProvider>,
      );

      expect(screen.getByText('Repo not found')).toBeInTheDocument();
    });
  });

  describe('when the marketplace has outdated plugins', () => {
    it('renders the outdated badge alongside the state badge', () => {
      render(
        <UIProvider>
          <MarketplaceStateBadge
            state="healthy"
            outdatedPluginSlugs={['plugin-one']}
          />
        </UIProvider>,
      );

      expect(
        screen.getByTestId('marketplace-outdated-badge'),
      ).toBeInTheDocument();
    });

    it('does not render the outdated badge when there are no outdated slugs', () => {
      render(
        <UIProvider>
          <MarketplaceStateBadge state="healthy" outdatedPluginSlugs={[]} />
        </UIProvider>,
      );

      expect(
        screen.queryByTestId('marketplace-outdated-badge'),
      ).not.toBeInTheDocument();
    });
  });
});
