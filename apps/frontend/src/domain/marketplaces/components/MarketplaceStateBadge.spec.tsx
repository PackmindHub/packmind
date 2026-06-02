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
});
